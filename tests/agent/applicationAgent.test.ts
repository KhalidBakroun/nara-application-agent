import { describe, expect, it } from "vitest";
import { runApplicationAgent } from "@/lib/agent/applicationAgent";
import { createTools } from "@/lib/agent/tools";
import programmes from "@/data/programmes.json";
import type { ExtractedDocument } from "@/lib/documents/extract";
import type { ModelClient, ModelTurn } from "@/lib/meta/modelClient";
import type { Programme, StudentProfile, TraceEvent } from "@/lib/domain/types";

const lina: StudentProfile = {
  fullName: "لينا أحمد الخطيب",
  nationality: "Jordanian",
  tawjihiAverage: 92.1,
  stream: "scientific",
  graduationYear: 2026,
  englishTest: { type: "IELTS", score: 6.5 },
  targetCountries: ["UK", "Ireland"],
  fieldOfStudy: "computer_science",
  budgetUsdPerYear: 22000,
  sources: { tawjihiAverage: { kind: "interview", turn: 2, quote: "معدلي ٩٢٫١" } },
};

const certificate: ExtractedDocument = {
  documentId: "doc-tawjihi",
  docType: "tawjihi_certificate",
  fields: [
    { key: "full_name", label: "Student name", value: "لينا أحمد الخطيب", box: [600, 80, 980, 120], confidence: "high" },
    { key: "average", label: "Average", value: "٩٢٫١", box: [700, 600, 980, 640], confidence: "high" },
  ],
};

const call = (name: string, args: unknown, id = `${name}-${Math.random()}`) => ({ id, name, args: JSON.stringify(args) });

function scripted(turns: ModelTurn[]): ModelClient {
  let i = 0;
  return { respond: async () => turns[Math.min(i++, turns.length - 1)] };
}

const ctx = { profile: lina, documents: [certificate], programmes: programmes as Programme[] };

describe("runApplicationAgent", () => {
  it("shortlists, checks, fills and flags, then stops with a cited application pack", async () => {
    const events: TraceEvent[] = [];
    const model = scripted([
      { toolCalls: [call("search_programmes", { field: "computer_science", countries: ["UK", "Ireland"] })] },
      { toolCalls: [call("check_requirements", { programmeId: "ashbury-cs" }), call("check_requirements", { programmeId: "liffey-datasci" })] },
      { toolCalls: [call("fill_application", { programmeId: "ashbury-cs" })] },
      { toolCalls: [call("flag_missing", { programmeId: "ashbury-cs" })] },
      { text: "تم تجهيز الطلب.", toolCalls: [] },
    ]);

    const { pack, stoppedReason } = await runApplicationAgent(model, ctx, (e) => events.push(e));

    expect(stoppedReason).toBe("done");
    expect(events).toHaveLength(5);
    expect(events.map((e) => e.tool)).toEqual([
      "search_programmes", "check_requirements", "check_requirements", "fill_application", "flag_missing",
    ]);
    expect(pack.programmeId).toBe("ashbury-cs");
    expect(pack.shortlist.map((s) => s.programmeId)).toEqual(["ashbury-cs", "liffey-datasci"]);
    const fullName = pack.fields.find((f) => f.key === "fullName");
    expect(fullName?.source).toMatchObject({ kind: "document", documentId: "doc-tawjihi", fieldKey: "full_name" });
  });

  it("stops after 12 steps when the model never finishes", async () => {
    const events: TraceEvent[] = [];
    const model: ModelClient = { respond: async () => ({ toolCalls: [call("convert_tawjihi", { avg: 92.1 })] }) };

    const { stoppedReason } = await runApplicationAgent(model, ctx, (e) => events.push(e));

    expect(stoppedReason).toBe("max_steps");
    expect(events).toHaveLength(12);
  });

  it("feeds invalid tool arguments back as an error and keeps going", async () => {
    const events: TraceEvent[] = [];
    const model = scripted([
      { toolCalls: [{ id: "bad-1", name: "check_requirements", args: "{bad json" }] },
      { text: "انتهيت.", toolCalls: [] },
    ]);

    const { stoppedReason } = await runApplicationAgent(model, ctx, (e) => events.push(e));

    expect(stoppedReason).toBe("done");
    expect(JSON.stringify(events[0].output)).toContain("error");
  });
});

describe("tools", () => {
  it("flags the passport as missing when only the certificate was uploaded", () => {
    const tools = createTools(ctx);
    const missing = tools.flag_missing.run({ programmeId: "ashbury-cs" }) as string[];
    expect(missing).toContain("passport");
    expect(missing).not.toContain("tawjihi_certificate");
  });

  it("prefers the document over the interview as a field's source", () => {
    const tools = createTools(ctx);
    const fields = tools.fill_application.run({ programmeId: "ashbury-cs" }) as { key: string; source?: { kind: string }; confidence: string }[];
    const average = fields.find((f) => f.key === "tawjihiAverage");
    expect(average?.source?.kind).toBe("document");
    expect(average?.confidence).toBe("high");
  });

  it("reports an unknown programme instead of throwing", () => {
    const tools = createTools(ctx);
    expect(tools.check_requirements.run({ programmeId: "nope" })).toEqual({ error: "Unknown programme: nope" });
  });
});
