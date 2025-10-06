import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: Request) {
    try {
        // Initialize Supabase client
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

        if (!supabaseUrl || !supabaseServiceKey) {
            return NextResponse.json(
                { error: "Server configuration error: Missing Supabase credentials" },
                { status: 500 }
            );
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });

        // Initialize Google Generative AI
        const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
        if (!GOOGLE_API_KEY) {
            return NextResponse.json(
                { error: "Server configuration error: Missing Google API key" },
                { status: 500 }
            );
        }
        const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);

        // Parse form data
        const formData = await req.formData();
        const files = formData.getAll("file") as File[];
        const folderId = formData.get("folder_id") as string | null;

        // Validate inputs
        if (!files || files.length === 0) {
            return NextResponse.json(
                { error: "No files provided" },
                { status: 400 }
            );
        }

        if (!folderId) {
            return NextResponse.json(
                { error: "Folder ID is required" },
                { status: 400 }
            );
        }

        const uploadedFiles = [];
        const errors = [];

        // Process each file
        for (const file of files) {
            try {
                // Validate file type
                if (!(file instanceof File)) {
                    errors.push({
                        file: "unknown",
                        error: "Invalid file object"
                    });
                    continue;
                }

                const fileName = file.name;
                const fileType = file.type;
                const fileSize = file.size;

                // Restrict to PDF and TXT only
                if (!["application/pdf", "text/plain"].includes(fileType)) {
                    errors.push({
                        file: fileName,
                        error: "Only PDF and TXT files are allowed"
                    });
                    continue;
                }

                // Create unique file path
                const timestamp = Date.now();
                const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
                const filePath = `uploads/${folderId}/${timestamp}_${sanitizedFileName}`;

                // Upload file to Supabase Storage
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from("FileUpload")
                    .upload(filePath, file, {
                        upsert: true,
                        contentType: fileType
                    });

                if (uploadError) {
                    errors.push({
                        file: fileName,
                        error: uploadError.message
                    });
                    continue;
                }

                // Extract text content from the file
                let content = "";
                let pageTexts: string[] = [];

                if (fileType === "application/pdf") {
                    // Extract text from PDF with page-by-page information
                    try {
                        const arrayBuffer = await file.arrayBuffer();
                        const buffer = Buffer.from(arrayBuffer);

                        // Dynamically import pdf-parse to avoid build-time issues
                        const pdfParse = (await import('pdf-parse')).default;

                        // First, get basic PDF info
                        const pdfData = await pdfParse(buffer);
                        const numPages = pdfData.numpages || 1;

                        // Extract text page by page using pdf2pic approach or manual page extraction
                        // For now, we'll split the full text by approximate page boundaries
                        // This is a simplified approach - in production, you'd want more sophisticated page detection
                        const fullText = pdfData.text || "";
                        content = fullText.trim();

                        if (!content) {
                            console.warn(`No text extracted from PDF: ${fileName}`);
                            content = "[PDF appears to be empty or image-based]";
                            pageTexts = [content];
                        } else {
                            // Simple page splitting - assume roughly equal text per page
                            // This is approximate and could be improved with better PDF parsing
                            const avgCharsPerPage = Math.max(1000, Math.floor(content.length / numPages));
                            pageTexts = [];

                            for (let i = 0; i < numPages; i++) {
                                const start = i * avgCharsPerPage;
                                const end = Math.min((i + 1) * avgCharsPerPage, content.length);
                                let pageText = content.slice(start, end).trim();

                                // Try to end at sentence boundaries
                                if (end < content.length && pageText.length > 500) {
                                    const lastSentenceEnd = Math.max(
                                        pageText.lastIndexOf('. '),
                                        pageText.lastIndexOf('! '),
                                        pageText.lastIndexOf('? ')
                                    );
                                    if (lastSentenceEnd > pageText.length * 0.7) {
                                        pageText = pageText.slice(0, lastSentenceEnd + 1);
                                    }
                                }

                                pageTexts.push(pageText || `[Page ${i + 1} - No text extracted]`);
                            }
                        }

                        // Store page texts for chunking
                        (file as any).pageTexts = pageTexts;
                        (file as any).numPages = numPages;
                    } catch (pdfError: any) {
                        console.error(`PDF parsing error for ${fileName}:`, pdfError.message);
                        content = "[PDF content extraction failed - file may be corrupted or image-based]";
                        pageTexts = [content];
                        (file as any).pageTexts = pageTexts;
                        (file as any).numPages = 1;
                    }
                } else if (fileType === "text/plain") {
                    // Extract text from TXT file
                    try {
                        content = await file.text();
                        content = content.trim();
                        pageTexts = [content]; // Treat entire text file as one "page"
                        (file as any).pageTexts = pageTexts;
                        (file as any).numPages = 1;
                    } catch (txtError: any) {
                        console.error(`TXT reading error for ${fileName}:`, txtError.message);
                        content = "[Text file reading failed]";
                        pageTexts = [content];
                        (file as any).pageTexts = pageTexts;
                        (file as any).numPages = 1;
                    }
                }

                // Insert file metadata into documents table
                const { data: fileData, error: insertError } = await supabase
                    .from('documents')
                    .insert({
                        name: fileName,
                        folder_id: folderId,
                        path: uploadData.path,
                        size: fileSize,
                        type: fileType,
                        content: content,
                        status: 'ready',
                        uploaded_at: new Date().toISOString()
                    })
                    .select()
                    .single();

                if (insertError) {
                    // If database insert fails, try to clean up uploaded file
                    await supabase.storage
                        .from("FileUpload")
                        .remove([uploadData.path]);

                    errors.push({
                        file: fileName,
                        error: insertError.message
                    });
                    continue;
                }

                // Generate embeddings for the document content
                try {
                    console.log(`Starting embedding generation for file: ${fileName}`);
                    console.log(`Content length: ${content.length}`);
                    console.log(`Pages detected: ${(file as any).numPages || 1}`);
                    console.log(`GOOGLE_API_KEY present: ${!!process.env.GOOGLE_API_KEY}`);
                    console.log(`Content preview: ${content.substring(0, 100)}...`);

                    // Chunk the content by pages and then within pages
                    const chunkSize = 800; // Characters per chunk (smaller for better precision)
                    const overlap = 100; // Overlap between chunks
                    const pageTexts = (file as any).pageTexts || [content];
                    const embeddingsData = [];

                    let globalChunkIndex = 0;

                    // Process each page
                    for (let pageIndex = 0; pageIndex < pageTexts.length; pageIndex++) {
                        const pageText = pageTexts[pageIndex];
                        const pageNumber = pageIndex + 1;

                        if (!pageText || pageText.trim().length === 0) {
                            continue; // Skip empty pages
                        }

                        console.log(`Processing page ${pageNumber}, text length: ${pageText.length}`);

                        // Chunk within this page
                        const pageChunks = [];
                        if (pageText.length <= chunkSize) {
                            // Page fits in one chunk
                            pageChunks.push(pageText.trim());
                        } else {
                            // Split page into chunks
                            for (let i = 0; i < pageText.length; i += chunkSize - overlap) {
                                const chunk = pageText.slice(i, i + chunkSize);
                                if (chunk.trim().length > 0) {
                                    pageChunks.push(chunk.trim());
                                }
                            }
                        }

                        console.log(`Page ${pageNumber} split into ${pageChunks.length} chunks`);

                        // Generate embeddings for chunks in this page
                        const embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' });

                        for (let chunkIndex = 0; chunkIndex < pageChunks.length; chunkIndex++) {
                            try {
                                console.log(`Generating embedding for page ${pageNumber}, chunk ${chunkIndex}...`);
                                const chunkContent = pageChunks[chunkIndex];
                                const chunkEmbeddingResult = await embeddingModel.embedContent(chunkContent);
                                const embedding = chunkEmbeddingResult.embedding.values;
                                console.log(`Embedding generated for page ${pageNumber}, chunk ${chunkIndex}, dimension: ${embedding.length}`);

                                embeddingsData.push({
                                    folder_id: folderId,
                                    doc_id: fileData.id,
                                    page_number: pageNumber,
                                    chunk_index: globalChunkIndex,
                                    content: chunkContent,
                                    embedding: embedding
                                });

                                globalChunkIndex++;
                            } catch (embeddingError: any) {
                                console.error(`Embedding generation error for page ${pageNumber}, chunk ${chunkIndex}:`, embeddingError.message);
                                // Continue with other chunks
                            }
                        }
                    }

                    console.log(`Total chunks created: ${embeddingsData.length}`);

                    // Insert embeddings into the database
                    if (embeddingsData.length > 0) {
                        console.log(`Inserting ${embeddingsData.length} embeddings into database...`);
                        const { error: embeddingInsertError } = await supabase
                            .from('embeddings')
                            .insert(embeddingsData);

                        if (embeddingInsertError) {
                            console.error('Embedding insert error:', embeddingInsertError);
                            // Don't fail the upload if embedding insertion fails
                        } else {
                            console.log('Embeddings inserted successfully');
                        }
                    } else {
                        console.log('No embeddings to insert');
                    }
                } catch (embeddingProcessError: any) {
                    console.error('Embedding processing error:', embeddingProcessError.message);
                    // Don't fail the upload if embedding processing fails
                }

                uploadedFiles.push(fileData);

            } catch (fileError: any) {
                console.error(`Error processing file:`, fileError);
                errors.push({
                    file: file instanceof File ? file.name : "unknown",
                    error: fileError.message || "Unknown error occurred"
                });
            }
        }

        // Return response
        const hasErrors = errors.length > 0;
        const hasSuccess = uploadedFiles.length > 0;

        if (!hasSuccess && hasErrors) {
            return NextResponse.json(
                {
                    success: false,
                    message: "All uploads failed",
                    uploadedFiles: [],
                    errors
                },
                { status: 400 }
            );
        }

        return NextResponse.json({
            success: true,
            message: hasErrors
                ? `${uploadedFiles.length} file(s) uploaded, ${errors.length} failed`
                : `${uploadedFiles.length} file(s) uploaded successfully`,
            uploadedFiles,
            errors
        });

    } catch (error: any) {
        console.error("Upload API Error:", error);
        return NextResponse.json(
            {
                success: false,
                error: error.message || "Internal server error",
                uploadedFiles: [],
                errors: []
            },
            { status: 500 }
        );
    }
}
