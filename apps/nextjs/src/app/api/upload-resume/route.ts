import { NextResponse } from "next/server";

import { getSession } from "~/auth/server";
import { env } from "~/env";
import { getSupabaseAdmin } from "~/lib/supabase/server";

const BUCKET = "resumes";
const MAX_SIZE = 16 * 1024 * 1024; // 16MB

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  if (file.type !== "application/pdf") {
    return NextResponse.json(
      { error: "Only PDF files are allowed" },
      { status: 400 },
    );
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "File too large (max 16MB)" },
      { status: 400 },
    );
  }

  const ext = "pdf";
  const path = `${session.user.id}/${crypto.randomUUID()}.${ext}`;

  const buf = await file.arrayBuffer();

  if (
    !env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    !env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  ) {
    return NextResponse.json(
      {
        error:
          "Résumé upload requires Supabase. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
      },
      { status: 503 },
    );
  }

  const supabase = getSupabaseAdmin();

  const { data, error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, buf, {
      contentType: "application/pdf",
      upsert: false,
    });

  if (uploadError) {
    console.error("Supabase upload error:", uploadError);
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(data.path);

  return NextResponse.json({ url: publicUrl });
}
