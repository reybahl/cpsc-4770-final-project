import { createServer, type Server } from "node:http";
import { readFile } from "node:fs/promises";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";

// import.meta.url is the FILE path; one `..` moves to src/, then `forms` gives src/forms/
const FORMS_DIR = join(fileURLToPath(import.meta.url), "../forms");

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js":   "text/javascript",
  ".css":  "text/css",
};

export interface FormServer {
  baseUrl: string;
  close: () => Promise<void>;
}

export async function startFormServer(port = 0): Promise<FormServer> {
  const server: Server = createServer(async (req, res) => {
    const urlPath = (req.url ?? "/").replace(/\?.*$/, "");
    const filePath = join(FORMS_DIR, urlPath);

    // Safety: reject paths that escape FORMS_DIR
    if (!filePath.startsWith(FORMS_DIR)) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }

    try {
      const content = await readFile(filePath);
      res.writeHead(200, {
        "Content-Type": MIME[extname(filePath)] ?? "text/plain",
      });
      res.end(content);
    } catch {
      res.writeHead(404);
      res.end("Not found");
    }
  });

  await new Promise<void>((resolve) => {
    server.listen(port, "127.0.0.1", resolve);
  });

  const addr = server.address() as { port: number };
  const baseUrl = `http://127.0.0.1:${addr.port}`;

  return {
    baseUrl,
    close: () => new Promise((resolve) => server.close(() => resolve())),
  };
}
