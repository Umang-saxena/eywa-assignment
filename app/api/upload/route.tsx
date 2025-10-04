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
        const file = formData.get("file") as File | null;
        const folderId = formData.get("folder_id") as string | null;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        if (!folderId) {
            return NextResponse.json({ error: "Folder ID is required" }, { status: 400 });
        }

        // ✅ Restrict to PDF and TXT
        if (!["application/pdf", "text/plain"].includes(file.type)) {
            return NextResponse.json({ error: "Only PDF/TXT files allowed" }, { status: 400 });
        }

        // You can prefix with user ID if you want user-specific storage
        const filePath = `uploads/${folderId}/${file.name}`;

        const { data, error } = await supabase.storage
            .from("FileUpload") // your bucket name
            .upload(filePath, file, { upsert: true });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Insert file metadata into files table
        const { data: fileData, error: insertError } = await supabase
            .from('files')
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
            return NextResponse.json({ error: insertError.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, file: fileData });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
