import { readDocument } from "@/lib/documents/read";

export const runtime = "nodejs";

const MAX_FILES = 10;
const MAX_MB = 15;

export async function POST(req: Request): Promise<Response> {
  const form = await req.formData().catch(() => null);
  const files = (form?.getAll("files") ?? []).filter((f): f is File => f instanceof File);
  if (files.length === 0) return Response.json({ error: "Attach one or more photos as 'files'." }, { status: 400 });
  if (files.length > MAX_FILES || files.some((f) => !f.type.startsWith("image/") || f.size > MAX_MB * 1024 * 1024)) {
    return Response.json({ error: `Send up to ${MAX_FILES} images, ${MAX_MB} MB each.` }, { status: 400 });
  }

  try {
    const documents = await Promise.all(files.map(async (f) => readDocument(Buffer.from(await f.arrayBuffer()))));
    return Response.json({ documents });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 502 });
  }
}
