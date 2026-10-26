import { transcribe } from "@/lib/meta/asr";

export const runtime = "nodejs";

export async function POST(req: Request): Promise<Response> {
  const form = await req.formData();
  const audio = form.get("audio");
  if (!(audio instanceof Blob)) return Response.json({ error: "Attach the recording as 'audio'." }, { status: 400 });

  try {
    const { transcript } = await transcribe(audio);
    const clean = transcript.trim();
    return Response.json({ transcript: clean, empty: clean === "" });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 502 });
  }
}
