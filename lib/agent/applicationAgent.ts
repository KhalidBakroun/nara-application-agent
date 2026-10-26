import type { ApplicationField, ApplicationPack, Programme, ShortlistItem, TraceEvent } from "@/lib/domain/types";
import type { ModelClient } from "@/lib/meta/modelClient";
import { createTools, type AgentContext, type ToolName } from "./tools";

export const MAX_STEPS = 12;

const INSTRUCTIONS = `You are Nara Agent. You prepare a university application pack for an Arab student, for a human counsellor to approve.
Work with the tools, step by step:
1. search_programmes that match the student's field, countries and budget;
2. check_requirements for up to 5 of them;
3. pick the best programme the student is eligible for (direct entry first, then via foundation year);
4. fill_application for that programme;
5. flag_missing for that programme.
Then reply with a short summary in plain Arabic: the chosen programme, why, and what is still missing.
Never invent grades, documents or facts. The catalogue and rules are sample data for a demo.`;

function summaryAr(tool: string, output: unknown, ctx: AgentContext): string {
  if (output && typeof output === "object" && "error" in output) return "خطأ في المدخلات، سأحاول مجدداً.";
  const prog = (id: unknown): Programme | undefined => ctx.programmes.find((p) => p.id === id);
  switch (tool as ToolName) {
    case "search_programmes":
      return `وجدتُ ${(output as unknown[]).length} برامج مناسبة في الكتالوج التجريبي.`;
    case "check_requirements": {
      const item = output as ShortlistItem;
      const p = prog(item.programmeId);
      const verdict = item.eligible ? "مؤهّل للقبول المباشر" : item.viaFoundation ? "مؤهّل عبر السنة التأسيسية" : "غير مؤهّل حالياً";
      return `${p?.nameAr ?? item.programmeId} (${p?.university ?? ""}): ${verdict}.`;
    }
    case "fill_application":
      return `عبّأتُ ${(output as unknown[]).length} حقول في نموذج الطلب، وكل حقل مرتبط بمصدره.`;
    case "flag_missing": {
      const missing = output as string[];
      return missing.length ? `ينقص الملف: ${missing.join("، ")}.` : "الملف مكتمل، لا ينقصه شيء.";
    }
    case "convert_tawjihi":
      return `حوّلتُ معدل التوجيهي إلى الفئة ${(output as { band: string }).band}.`;
    default:
      return "خطوة منفّذة.";
  }
}

export async function runApplicationAgent(
  model: ModelClient,
  ctx: AgentContext,
  onEvent: (e: TraceEvent) => void,
): Promise<{ pack: ApplicationPack; stoppedReason: "done" | "max_steps"; summaryAr?: string }> {
  const tools = createTools(ctx);
  const input: unknown[] = [
    {
      role: "user",
      content: `Student profile: ${JSON.stringify({ ...ctx.profile, sources: undefined })}\nUploaded documents: ${JSON.stringify(
        ctx.documents.map((d) => ({ documentId: d.documentId, docType: d.docType, fields: d.fields.map((f) => ({ key: f.key, value: f.value })) })),
      )}`,
    },
  ];

  const shortlist: ShortlistItem[] = [];
  let fields: ApplicationField[] = [];
  let missing: string[] = [];
  let programmeId = "";
  let step = 0;

  while (step < MAX_STEPS) {
    const turn = await model.respond({ instructions: INSTRUCTIONS, input, tools: Object.values(tools).map((t) => t.def) });
    if (turn.toolCalls.length === 0) {
      return { pack: { programmeId: programmeId || shortlist.find((s) => s.eligible)?.programmeId || "", fields, missing, shortlist }, stoppedReason: "done", summaryAr: turn.text };
    }

    input.push(...(turn.output ?? turn.toolCalls.map((c) => ({ type: "function_call", call_id: c.id, name: c.name, arguments: c.args }))));

    for (const callItem of turn.toolCalls) {
      if (step >= MAX_STEPS) break;
      step += 1;
      let args: Record<string, unknown> = {};
      let output: unknown;
      try {
        args = JSON.parse(callItem.args || "{}");
        const tool = tools[callItem.name as ToolName];
        output = tool ? tool.run(args) : { error: `Unknown tool: ${callItem.name}` };
      } catch (err) {
        output = { error: `Invalid arguments: ${(err as Error).message}` };
      }

      if (output && typeof output === "object" && !("error" in output)) {
        if (callItem.name === "check_requirements") shortlist.push(output as ShortlistItem);
        if (callItem.name === "fill_application") { fields = output as ApplicationField[]; programmeId = String(args.programmeId); }
        if (callItem.name === "flag_missing") missing = output as string[];
      }

      onEvent({ step, tool: callItem.name, input: args, output, summaryAr: summaryAr(callItem.name, output, ctx) });
      input.push({ type: "function_call_output", call_id: callItem.id, output: JSON.stringify(output) });
    }
  }

  return { pack: { programmeId: programmeId || shortlist.find((s) => s.eligible)?.programmeId || "", fields, missing, shortlist }, stoppedReason: "max_steps" };
}
