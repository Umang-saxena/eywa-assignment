import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    // ✅ Await cookies()
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookiesToSet) => {
            const response = NextResponse.next(); // create a response to attach cookies
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options as any);
            });
            return response;
          },
        },
      }
    );

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.session) {
      return NextResponse.json({ error: error?.message || "Login failed" }, { status: 400 });
    }

    const response = NextResponse.json({ success: true, data });

    response.cookies.set("sb-access-token", data.session.access_token, { path: "/" });
    response.cookies.set("sb-refresh-token", data.session.refresh_token, { path: "/" });
    response.cookies.set("sb-expires-in", data.session.expires_in.toString(), { path: "/" });
    response.cookies.set("sb-token-type", data.session.token_type, { path: "/" });

    return response;
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
