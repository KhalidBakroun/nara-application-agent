import { nextInterviewTurn, type InterviewMessage } from "@/lib/agent/interview";
import { StudentProfileSchema } from "@/lib/domain/schemas";
import { createMetaModelClient } from "@/lib/meta/modelClient";

export const runtime = "nodejs";

export async function POST(req: Request): Promise<Response> {
  const body = (await req.json()) as { history?: InterviewMessage[]; profile?: unknown };
  const profile = StudentProfileSchema.safeParse(body.profile);
  if (!Array.isArray(body.history) || !profile.success) {
    return Response.json({ error: "Send { history, profile }." }, { status: 400 });
  }
  try {
    return Response.json(await nextInterviewTurn(createMetaModelClient(), body.history, profile.data));
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 502 });
  }
}
