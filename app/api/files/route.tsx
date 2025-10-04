import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: NextRequest) {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

        const supabase = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });

        const { searchParams } = new URL(req.url);
        const folderId = searchParams.get('folder_id');

        let query = supabase
            .from('files')
            .select('*')
            .order('uploaded_at', { ascending: false });

        if (folderId) {
            query = query.eq('folder_id', folderId);
        }

        const { data: files, error } = await query;

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Transform to match DocumentList interface
        const documents = files.map(file => ({
            id: file.id,
            name: file.name,
            type: file.type === 'application/pdf' ? 'pdf' : 'txt',
            size: formatFileSize(file.size),
            pages: file.type === 'application/pdf' ? Math.floor(file.size / 50000) : undefined, // Rough estimate
            uploadedAt: formatUploadedAt(file.uploaded_at),
            status: file.status as 'processing' | 'ready' | 'failed'
        }));

        return NextResponse.json(documents);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatUploadedAt(uploadedAt: string): string {
    const now = new Date();
    const uploaded = new Date(uploadedAt);
    const diffMs = now.getTime() - uploaded.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = diffHours / 24;

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${Math.floor(diffHours)} hours ago`;
    if (diffDays < 7) return `${Math.floor(diffDays)} days ago`;
    return uploaded.toLocaleDateString();
}
