import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Import pdf-parse at the top to avoid dynamic import issues
import pdfParse from 'pdf-parse';

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
                        
                        // Use the imported pdfParse function directly
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