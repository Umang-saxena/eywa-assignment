// app/api/folders/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

const getSupabaseServerClient = async () => {
    const cookieStore = await cookies();

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll: () => cookieStore.getAll(),
                setAll: (cookiesToSet) => {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) => {
                            cookieStore.set(name, value, options);
                        });
                    } catch (error) {
                        // Handle cookie setting errors in middleware/server components
                    }
                },
            },
        }
    );
};


export async function GET() {
    const supabase = await getSupabaseServerClient();

    const { data: { user }, error } = await supabase.auth.getUser();
    // console.log("user in GET /api/folders:", user, error);
    if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: folders, error: folderError } = await supabase
        .from("folders")
        .select("id, name, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

    if (folderError) return NextResponse.json({ error: folderError.message }, { status: 500 });

    const foldersWithCount = await Promise.all(
        folders.map(async (folder) => {
            const { count } = await supabase
                .from("documents")
                .select("*", { count: "exact", head: true })
                .eq("folder_id", folder.id);
            return { ...folder, docCount: count ?? 0 };
        })
    );

    return NextResponse.json(foldersWithCount);
}


export async function POST(req: NextRequest) {
    try {
        const supabase = await getSupabaseServerClient();

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { name } = await req.json();
        if (!name) return NextResponse.json({ error: "Folder name is required" }, { status: 400 });

        const { data, error } = await supabase
            .from("folders")
            .insert([{ name, user_id: user.id }])
            .select()
            .single();

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });

        return NextResponse.json(data);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    try {
        const supabase = await getSupabaseServerClient();

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const folderId = searchParams.get("id");
        if (!folderId) return NextResponse.json({ error: "Folder ID is required" }, { status: 400 });

        const { name } = await req.json();
        if (!name) return NextResponse.json({ error: "Folder name is required" }, { status: 400 });

        const { data, error } = await supabase
            .from("folders")
            .update({ name })
            .eq("id", folderId)
            .eq("user_id", user.id)
            .select()
            .single();

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });

        return NextResponse.json(data);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const supabase = await getSupabaseServerClient();

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const folderId = searchParams.get("id");
        if (!folderId) return NextResponse.json({ error: "Folder ID is required" }, { status: 400 });

        const { error } = await supabase
            .from("folders")
            .delete()
            .eq("id", folderId)
            .eq("user_id", user.id);

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });

        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
