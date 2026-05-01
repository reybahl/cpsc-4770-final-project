import { readFile, stat } from "node:fs/promises";
import { dirname, extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { NextResponse } from "next/server";

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
};

const ROUTE_DIR = dirname(fileURLToPath(import.meta.url));
/** From `src/app/demo-forms/[...path]` → monorepo root (six levels up). */
const REPO_ROOT = join(ROUTE_DIR, "..", "..", "..", "..", "..", "..");
const FORMS_DIR = normalize(
  join(REPO_ROOT, "packages", "eval", "src", "forms"),
);

function safeResolvedFilePath(segments: string[]): string | null {
  const relative = join(...segments);
  const resolved = normalize(join(FORMS_DIR, relative));
  const prefix = FORMS_DIR.endsWith(sep) ? FORMS_DIR : `${FORMS_DIR}${sep}`;
  if (!resolved.startsWith(prefix) && resolved !== FORMS_DIR) {
    return null;
  }
  return resolved;
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ path?: string[] }> },
) {
  const { path: pathSegments } = await context.params;
  if (!pathSegments?.length) {
    return new NextResponse("Not found", { status: 404 });
  }

  const filePath = safeResolvedFilePath(pathSegments);
  if (!filePath) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    const s = await stat(filePath);
    if (!s.isFile()) {
      return new NextResponse("Not found", { status: 404 });
    }
    const body = await readFile(filePath);
    const ext = extname(filePath);
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": MIME[ext] ?? "application/octet-stream",
        "Cache-Control": "public, max-age=0, must-revalidate",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
