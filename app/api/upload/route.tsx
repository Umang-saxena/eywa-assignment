import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenerativeAI } from '@google/generative-ai';
import { deleteCache } from "@/lib/redis";

// Import pdf-parse at the top level to avoid dynamic import issues
let pdfParse: any = null;

// Initialize pdf-parse once
async function getPdfParse() {
    if (!pdfParse) {
        try {
            // Try to import from the correct path
            // @ts-ignore
            const pdfParseModule = await import('pdf-parse/lib/pdf-parse.js');
            pdfParse = pdfParseModule.default || pdfParseModule;
        } catch (err) {
            // Fallback to default import
            const pdfParseModule = await import('pdf-parse');
            pdfParse = pdfParseModule.default;
        }
    }
    return pdfParse;
}

export async function POST(req: Request) {
    const stream = new ReadableStream({
        async start(controller) {
            try {
                // Initialize Supabase client
                const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
                const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

                if (!supabaseUrl || !supabaseServiceKey) {
                    controller.enqueue(JSON.stringify({ type: 'error', message: 'Server configuration error: Missing Supabase credentials' }) + '\n');
                    controller.close();
                    return;
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
                    controller.enqueue(JSON.stringify({ type: 'error', message: 'Server configuration error: Missing Google API key' }) + '\n');
                    controller.close();
                    return;
                }
                const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);

                // Parse form data
                const formData = await req.formData();
                const files = formData.getAll("file") as File[];
                const folderId = formData.get("folder_id") as string | null;

                // Validate inputs
                if (!files || files.length === 0) {
                    controller.enqueue(JSON.stringify({ type: 'error', message: 'No files provided' }) + '\n');
                    controller.close();
                    return;
                }

                if (!folderId) {
                    controller.enqueue(JSON.stringify({ type: 'error', message: 'Folder ID is required' }) + '\n');
                    controller.close();
                    return;
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
                        let pages: string[] = [];

                        if (fileType === "application/pdf") {
                            // Extract text from PDF page by page
                            try {
                                const arrayBuffer = await file.arrayBuffer();
                                const buffer = Buffer.from(arrayBuffer);

                                // Get pdf-parse function
                                const parsePdf = await getPdfParse();

                                // Collect text per page
                                const pagesPromises: Promise<string>[] = [];
                                const pdfData = await parsePdf(buffer, {
                                    pagerender: (pageData: any) => {
                                        // Extract text from page
                                        const pagePromise = pageData.getTextContent().then((textContent: any) => {
                                            return textContent.items.map((item: any) => item.str).join(' ').trim();
                                        });
                                        pagesPromises.push(pagePromise);
                                    },
                                    max: 0, // parse all pages
                                    version: 'v2.0.550'
                                });

                                pages = await Promise.all(pagesPromises);
                                content = pages.join('\n\n'); // Join pages with double newline
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

                                if (!content) {
                                    console.warn(`Empty text file: ${fileName}`);
                                    content = "[Text file is empty]";
                                }
                                pages = [content]; // Treat as one page
                            } catch (txtError: any) {
                                console.error(`TXT reading error for ${fileName}:`, txtError.message);
                                content = "[Text file reading failed]";
                                pages = [content];
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

                        // Generate embeddings for the document content page by page
                        try {
                            console.log(`Starting embedding generation for file: ${fileName}`);
                            console.log(`Content length: ${content.length}`);
                            console.log(`Pages: ${pages.length}`);

                            const chunkSize = 1000; // Characters per chunk
                            const overlap = 200; // Overlap between chunks
                            const embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' });
                            const embeddingsData = [];
                            let globalChunkIndex = 0;

                            for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
                                const pageText = pages[pageIndex];
                                const pageChunks = [];

                                if (pageText && pageText.length > 0) {
                                    for (let i = 0; i < pageText.length; i += chunkSize - overlap) {
                                        const chunk = pageText.slice(i, i + chunkSize);
                                        if (chunk.trim().length > 0) {
                                            pageChunks.push(chunk.trim());
                                        }
                                    }
                                }

                                for (let chunkIndex = 0; chunkIndex < pageChunks.length; chunkIndex++) {
                                    try {
                                        console.log(`Generating embedding for page ${pageIndex + 1}, chunk ${chunkIndex}...`);
                                        const chunkEmbeddingResult = await embeddingModel.embedContent(pageChunks[chunkIndex]);
                                        const embedding = chunkEmbeddingResult.embedding.values;

                                        embeddingsData.push({
                                            folder_id: folderId,
                                            doc_id: fileData.id,
                                            page_number: pageIndex + 1,
                                            chunk_index: globalChunkIndex++,
                                            content: pageChunks[chunkIndex],
                                            embedding: embedding
                                        });
                                    } catch (embeddingError: any) {
                                        console.error(`Embedding generation error for page ${pageIndex + 1}, chunk ${chunkIndex}:`, embeddingError.message);
                                        // Continue with other chunks
                                    }
                                }

                                // Send progress after processing each page
                                controller.enqueue(JSON.stringify({
                                    type: 'progress',
                                    file: fileName,
                                    page: pageIndex + 1,
                                    totalPages: pages.length
                                }) + '\n');
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

                // Invalidate cache for files
                await deleteCache(`files_folder_${folderId}`);
                await deleteCache('files_folder_all');

                // Send complete
                controller.enqueue(JSON.stringify({
                    type: 'complete',
                    uploadedFiles,
                    errors
                }) + '\n');
                controller.close();

            } catch (error: any) {
                console.error("Upload API Error:", error);
                controller.error(error);
            }
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/plain',
        },
    });
}
