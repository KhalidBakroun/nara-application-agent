import type { ApplicationField, ApplicationPack, Programme, ShortlistItem, TraceEvent } from "@/lib/domain/types";
import { MISSING_AR, MISSING_EN } from "@/lib/labels";
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
Then reply with a short summary: two or three short sentences in plain Arabic with normal punctuation (the chosen programme, why, and what is still missing), then a line containing only ---, then the same summary in English. No markdown symbols.
Never invent grades, documents or facts. The catalogue and rules are sample data for a demo.`;

/** The UI shows the summary as plain text, so drop markdown headings, bullets and emphasis if the model adds them. */
const plainText = (text?: string) =>
  text
    ?.replace(/^\s*(?:#{1,6}\s+|[-*•]\s+)/gm, "")
    .replace(/\*\*|__|`/g, "")
    .trim();

/** One line per step for the live trace, in Arabic and English. */
function stepSummary(tool: string, output: unknown, ctx: AgentContext): { ar: string; en: string } {
  if (output && typeof output === "object" && "error" in output) return { ar: "خطأ في المدخلات، سأحاول مجدداً.", en: "Invalid input, trying again." };
  const prog = (id: unknown): Programme | undefined => ctx.programmes.find((p) => p.id === id);
  switch (tool as ToolName) {
    case "search_programmes": {
      const n = (output as unknown[]).length;
      return { ar: `وجدتُ ${n} برامج مناسبة في الكتالوج التجريبي.`, en: `Found ${n} matching programmes in the sample catalogue.` };
    }
    case "check_requirements": {
      const item = output as ShortlistItem;
      const p = prog(item.programmeId);
      const [ar, en] = item.eligible
        ? ["مؤهّل للقبول المباشر", "eligible for direct entry"]
        : item.viaFoundation
          ? ["مؤهّل عبر السنة التأسيسية", "eligible via a foundation year"]
          : ["غير مؤهّل حالياً", "not eligible yet"];
      return {
        ar: `${p?.nameAr ?? item.programmeId} (${p?.university ?? ""}): ${ar}.`,
        en: `${p?.name ?? item.programmeId} (${p?.university ?? ""}): ${en}.`,
      };
    }
    case "fill_application": {
      const n = (output as unknown[]).length;
      return { ar: `عبّأتُ ${n} حقول في نموذج الطلب، وكل حقل مرتبط بمصدره.`, en: `Filled ${n} application fields, each linked to its source.` };
    }
    case "flag_missing": {
      const missing = output as string[];
      return missing.length
        ? { ar: `ينقص الملف: ${missing.map((m) => MISSING_AR[m] ?? m).join("، ")}.`, en: `Missing: ${missing.map((m) => MISSING_EN[m] ?? m).join(", ")}.` }
        : { ar: "الملف مكتمل، لا ينقصه شيء.", en: "Nothing is missing." };
    }
    case "convert_tawjihi": {
      const band = (output as { band: string }).band;
      return { ar: `حوّلتُ معدل التوجيهي إلى الفئة ${band}.`, en: `Converted the Tawjihi average to band ${band}.` };
    }
    default:
      return { ar: "خطوة منفّذة.", en: "Step done." };
  }
}

/** The final reply is the Arabic summary, a line with only ---, then the English summary. */
function splitSummary(text?: string): { summaryAr?: string; summaryEn?: string } {
  const [ar, en] = (text ?? "").split(/^\s*-{3,}\s*$/m);
  return { summaryAr: plainText(ar) || undefined, summaryEn: plainText(en) || undefined };
}

export async function runApplicationAgent(
  model: ModelClient,
  ctx: AgentContext,
  onEvent: (e: TraceEvent) => void,
): Promise<{ pack: ApplicationPack; stoppedReason: "done" | "max_steps"; summaryAr?: string; summaryEn?: string }> {
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
      return { pack: { programmeId: programmeId || shortlist.find((s) => s.eligible)?.programmeId || "", fields, missing, shortlist }, stoppedReason: "done", ...splitSummary(turn.text) };
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

      const summary = stepSummary(callItem.name, output, ctx);
      onEvent({ step, tool: callItem.name, input: args, output, summaryAr: summary.ar, summaryEn: summary.en });
      input.push({ type: "function_call_output", call_id: callItem.id, output: JSON.stringify(output) });
    }
  }

  return { pack: { programmeId: programmeId || shortlist.find((s) => s.eligible)?.programmeId || "", fields, missing, shortlist }, stoppedReason: "max_steps" };
}
