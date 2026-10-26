import programmes from "@/data/programmes.json";
import { runApplicationAgent } from "@/lib/agent/applicationAgent";
import { StudentProfileSchema } from "@/lib/domain/schemas";
import type { Programme } from "@/lib/domain/types";
import type { ExtractedDocument } from "@/lib/documents/extract";
import { createMetaModelClient } from "@/lib/meta/modelClient";

export const runtime = "nodejs";
export const maxDuration = 120;

/** Streams the agent's steps as server-sent events: `trace` per tool call, then `pack` (or `error`). */
export async function POST(req: Request): Promise<Response> {
  const body = (await req.json()) as { profile?: unknown; documents?: ExtractedDocument[] };
  const profile = StudentProfileSchema.safeParse(body.profile);
  if (!profile.success) return Response.json({ error: "Send { profile, documents }." }, { status: 400 });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) =>
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      try {
        const result = await runApplicationAgent(
          createMetaModelClient(),
          { profile: profile.data, documents: body.documents ?? [], programmes: programmes as Programme[] },
          (e) => send("trace", e),
        );
        send("pack", result);
      } catch (err) {
        send("error", { message: (err as Error).message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } });
}
