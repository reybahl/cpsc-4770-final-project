import { NextResponse } from "next/server";

import { getSession } from "~/auth/server";
import { supabaseAdmin } from "~/lib/supabase/server";

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

  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, buf, {
      contentType: "application/pdf",
      upsert: false,
    });

  if (error) {
    console.error("Supabase upload error:", error);
    return NextResponse.json(
      { error: error.message || "Upload failed" },
      { status: 500 },
    );
  }

  const {
    data: { publicUrl },
  } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(data.path);

  return NextResponse.json({ url: publicUrl });
}
