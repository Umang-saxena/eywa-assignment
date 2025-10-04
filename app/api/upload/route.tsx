import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

        if (!supabaseServiceKey) {
            return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
        }

        // Create Supabase client with service role key for server-side operations
        const supabase = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });

        const formData = await req.formData();
        const files = formData.getAll("file") as File[];
        const folderId = formData.get("folder_id") as string | null;

        if (!files || files.length === 0) {
            return NextResponse.json({ error: "No files provided" }, { status: 400 });
        }

        if (!folderId) {
            return NextResponse.json({ error: "Folder ID is required" }, { status: 400 });
        }

        const uploadedFiles = [];
        const errors = [];

        for (const file of files) {
            // ✅ Restrict to PDF and TXT
            if (!["application/pdf", "text/plain"].includes(file.type)) {
                errors.push({ file: file.name, error: "Only PDF/TXT files allowed" });
                continue;
            }

            // You can prefix with user ID if you want user-specific storage
            const filePath = `uploads/${folderId}/${file.name}`;

            const { data, error } = await supabase.storage
                .from("FileUpload") // your bucket name
                .upload(filePath, file, { upsert: true });

            if (error) {
                errors.push({ file: file.name, error: error.message });
                continue;
            }

            // Insert file metadata into documents table
            const { data: fileData, error: insertError } = await supabase
                .from('documents')
                .insert([{
                    name: file.name,
                    folder_id: folderId,
                    path: data.path,
                    size: file.size,
                    type: file.type,
                    status: 'ready',
                    uploaded_at: new Date().toISOString()
                }])
                .select()
                .single();

            if (insertError) {
                errors.push({ file: file.name, error: insertError.message });
                continue;
            }

            uploadedFiles.push(fileData);
        }

        return NextResponse.json({ success: true, uploadedFiles, errors });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
