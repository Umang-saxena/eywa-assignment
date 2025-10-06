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

                if (fileType === "application/pdf") {
                    // Extract text from PDF
                    try {
                        const arrayBuffer = await file.arrayBuffer();
                        const buffer = Buffer.from(arrayBuffer);

                        // Dynamically import pdf-parse to avoid build-time issues
                        const pdfParse = (await import('pdf-parse')).default;
                        const pdfData = await pdfParse(buffer);
                        content = pdfData.text || "";

                        // Clean up the extracted text
                        content = content.trim();

                        if (!content) {
                            console.warn(`No text extracted from PDF: ${fileName}`);
                            content = "[PDF appears to be empty or image-based]";
                        }
                    } catch (pdfError: any) {
                        console.error(`PDF parsing error for ${fileName}:`, pdfError.message);
                        content = "[PDF content extraction failed - file may be corrupted or image-based]";
                    }
                } else if (fileType === "text/plain") {
                    // Extract text from TXT file
                    try {
                        content = await file.text();
                        content = content.trim();
                    } catch (txtError: any) {
                        console.error(`TXT reading error for ${fileName}:`, txtError.message);
                        content = "[Text file reading failed]";
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
                    console.log(`GOOGLE_API_KEY present: ${!!process.env.GOOGLE_API_KEY}`);
                    console.log(`Content preview: ${content.substring(0, 100)}...`);

                    // Chunk the content into smaller pieces
                    const chunkSize = 1000; // Characters per chunk
                    const overlap = 200; // Overlap between chunks
                    const chunks = [];

                    if (content && content.length > 0) {
                        for (let i = 0; i < content.length; i += chunkSize - overlap) {
                            const chunk = content.slice(i, i + chunkSize);
                            if (chunk.trim().length > 0) {
                                chunks.push(chunk.trim());
                            }
                        }
                    }

                    console.log(`Chunks created: ${chunks.length}`);
                    for (let i = 0; i < Math.min(chunks.length, 3); i++) {
                        console.log(`Chunk ${i} length: ${chunks[i].length}`);
                    }

                    // Generate embeddings for each chunk
                    const embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' });
                    const embeddingsData = [];

                    for (let i = 0; i < chunks.length; i++) {
                        try {
                            console.log(`Generating embedding for chunk ${i}...`);
                            const chunkEmbeddingResult = await embeddingModel.embedContent(chunks[i]);
                            const embedding = chunkEmbeddingResult.embedding.values;
                            console.log(`Embedding generated for chunk ${i}, dimension: ${embedding.length}`);

                            embeddingsData.push({
                                folder_id: folderId,
                                doc_id: fileData.id,
                                page_number: 1, // For simplicity, assuming single page or no page info
                                chunk_index: i,
                                content: chunks[i],
                                embedding: embedding
                            });
                        } catch (embeddingError: any) {
                            console.error(`Embedding generation error for chunk ${i}:`, embeddingError.message);
                            // Continue with other chunks
                        }
                    }

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
