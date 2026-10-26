import { afterEach, describe, expect, it } from "vitest";
import { getMetaClient } from "@/lib/meta/client";
import { createMetaModelClient } from "@/lib/meta/modelClient";

const rateLimited = () => Object.assign(new Error("rate limited"), { status: 429 });

function fakeResponses(script: Array<() => unknown>) {
  let calls = 0;
  const seen: unknown[] = [];
  const client = {
    responses: {
      create: async (body: unknown) => {
        seen.push(body);
        const step = script[calls++];
        return step();
      },
    },
  };
  return { client, calls: () => calls, seen };
}

describe("getMetaClient", () => {
  const saved = process.env.MODEL_API_KEY;
  afterEach(() => {
    if (saved === undefined) delete process.env.MODEL_API_KEY;
    else process.env.MODEL_API_KEY = saved;
  });

  it("points the OpenAI SDK at the Meta Model API", () => {
    process.env.MODEL_API_KEY = "test-key";
    expect(getMetaClient().baseURL).toBe("https://api.meta.ai/v1");
  });

  it("refuses to start without MODEL_API_KEY", () => {
    delete process.env.MODEL_API_KEY;
    expect(() => getMetaClient()).toThrow("MODEL_API_KEY is not set");
  });
});

describe("createMetaModelClient", () => {
  it("asks for muse-spark-1.3 and retries once after a 429", async () => {
    const fake = fakeResponses([
      () => {
        throw rateLimited();
      },
      () => ({ output_text: "مرحبا", output: [] }),
    ]);
    const model = createMetaModelClient(fake.client, { retryDelayMs: 0 });

    const turn = await model.respond({ input: [{ role: "user", content: "hi" }] });

    expect(turn.text).toBe("مرحبا");
    expect(fake.calls()).toBe(2);
    expect((fake.seen[0] as { model: string }).model).toBe("muse-spark-1.3");
  });

  it("gives up after a second 429", async () => {
    const fake = fakeResponses([
      () => {
        throw rateLimited();
      },
      () => {
        throw rateLimited();
      },
    ]);
    const model = createMetaModelClient(fake.client, { retryDelayMs: 0 });

    await expect(model.respond({ input: [] })).rejects.toThrow("rate limited");
    expect(fake.calls()).toBe(2);
  });

  it("returns function calls as tool calls", async () => {
    const fake = fakeResponses([
      () => ({
        output_text: "",
        output: [
          { type: "function_call", call_id: "call_1", name: "convert_tawjihi", arguments: '{"avg":85}' },
        ],
      }),
    ]);
    const model = createMetaModelClient(fake.client, { retryDelayMs: 0 });

    const turn = await model.respond({ input: [] });

    expect(turn.toolCalls).toEqual([{ id: "call_1", name: "convert_tawjihi", args: '{"avg":85}' }]);
  });
});
