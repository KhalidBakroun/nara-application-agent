import { describe, expect, it } from "vitest";
import personas from "@/data/personas.json";
import programmes from "@/data/programmes.json";
import { runClass } from "@/lib/agent/classRun";
import { personaProfile } from "@/lib/domain/personas";
import type { Persona, Programme } from "@/lib/domain/types";
import type { ModelClient, ModelRequest } from "@/lib/meta/modelClient";

const call = (name: string, args: unknown) => ({ id: `${name}-${Math.random()}`, name, args: JSON.stringify(args) });
const toolResults = (req: ModelRequest) => req.input.filter((i) => (i as { type?: string }).type === "function_call_output").length;

/** Stateless fake: each student's run checks, fills and flags one programme, then answers. Counts calls in flight. */
function classModel(programmeId: string, delayMs = 20) {
  const stats = { inFlight: 0, peak: 0 };
  const model: ModelClient = {
    async respond(req) {
      stats.inFlight++;
      stats.peak = Math.max(stats.peak, stats.inFlight);
      await new Promise((r) => setTimeout(r, delayMs));
      stats.inFlight--;
      const done = toolResults(req);
      if (done === 0) return { toolCalls: [call("check_requirements", { programmeId })] };
      if (done === 1) return { toolCalls: [call("fill_application", { programmeId }), call("flag_missing", { programmeId })] };
      return { text: "تم.\n---\nDone.", toolCalls: [] };
    },
  };
  return { model, stats };
}

const students = (personas as Persona[]).map((p) => ({ profile: personaProfile(p) }));

describe("runClass", () => {
  it("runs three students three at a time and returns one summary row each", async () => {
    const { model, stats } = classModel("ashbury-cs");
    const seen: number[] = [];

    const rows = await runClass(model, students, programmes as Programme[], { concurrency: 3, onRow: (r) => seen.push(r.index) });

    expect(rows).toHaveLength(3);
    expect(stats.peak).toBe(3);
    expect(seen.sort()).toEqual([0, 1, 2]);
    for (const [i, row] of rows.entries()) {
      expect(row.name).toBe(personas[i].fullName);
      expect(row.bestProgramme).toBe("ashbury-cs");
      expect(row.missingCount).toBe(row.pack.missing.length);
      expect(row.pack.fields.length).toBeGreaterThan(0);
    }
  });

  it("keeps going when one student's run fails", async () => {
    const { model } = classModel("ashbury-cs", 0);
    const flaky: ModelClient = {
      respond: (req) => (JSON.stringify(req.input).includes(personas[1].fullName) ? Promise.reject(new Error("rate limited")) : model.respond(req)),
    };

    const rows = await runClass(flaky, students, programmes as Programme[], { concurrency: 2 });

    expect(rows.map((r) => Boolean(r.error))).toEqual([false, true, false]);
    expect(rows[1].error).toContain("rate limited");
  });
});
