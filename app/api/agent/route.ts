import { z } from "zod";
import programmes from "@/data/programmes.json";
import { runApplicationAgent } from "@/lib/agent/applicationAgent";
import { runClass } from "@/lib/agent/classRun";
import { StudentProfileSchema } from "@/lib/domain/schemas";
import type { Programme } from "@/lib/domain/types";
import type { ExtractedDocument } from "@/lib/documents/extract";
import { createMetaModelClient } from "@/lib/meta/modelClient";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_CLASS = 30;
const ClassSchema = z.array(z.object({ profile: StudentProfileSchema })).min(1).max(MAX_CLASS);

/**
 * Streams server-sent events. One student `{ profile, documents }`: `trace` per tool call, then `pack`.
 * A class `{ students: [{ profile }] }`: `row` per finished student, then `done`. Failures send `error`.
 */
export async function POST(req: Request): Promise<Response> {
  const body = (await req.json().catch(() => ({}))) as { profile?: unknown; documents?: ExtractedDocument[]; students?: unknown };
  const isClass = body.students !== undefined;
  const students = isClass ? ClassSchema.safeParse(body.students) : null;
  const profile = isClass ? null : StudentProfileSchema.safeParse(body.profile);
  if (students && !students.success) {
    return Response.json({ error: `Send { students: [{ profile }] } with 1 to ${MAX_CLASS} students.` }, { status: 400 });
  }
  if (profile && !profile.success) return Response.json({ error: "Send { profile, documents }." }, { status: 400 });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) =>
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      try {
        if (students?.success) {
          await runClass(createMetaModelClient(), students.data, programmes as Programme[], { concurrency: 3, onRow: (row) => send("row", row) });
          send("done", {});
        } else if (profile?.success) {
          const result = await runApplicationAgent(
            createMetaModelClient(),
            { profile: profile.data, documents: body.documents ?? [], programmes: programmes as Programme[] },
            (e) => send("trace", e),
          );
          send("pack", result);
        }
      } catch (err) {
        send("error", { message: (err as Error).message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } });
}
