import { getMetaClient } from "./client";

export const AGENT_MODEL = "muse-spark-1.3";

export interface ToolDef {
  type: "function";
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface ModelRequest {
  instructions?: string;
  /** Responses API input items (messages, function_call_output, ...). */
  input: unknown[];
  tools?: ToolDef[];
  /** Optional structured output: a JSON schema the reply must follow. */
  jsonSchema?: { name: string; schema: Record<string, unknown> };
}

export interface ModelTurn {
  text?: string;
  toolCalls: { id: string; name: string; args: string }[];
  /** Raw output items, so the caller can feed them back on the next turn. */
  output?: unknown[];
}

export interface ModelClient {
  respond(req: ModelRequest): Promise<ModelTurn>;
}

type ResponsesLike = { responses: { create: (body: never) => Promise<unknown> } };

interface RawOutputItem {
  type?: string;
  call_id?: string;
  name?: string;
  arguments?: string;
}

const isRetryable = (err: unknown) => {
  const status = (err as { status?: number })?.status;
  return status === 429 || (typeof status === "number" && status >= 500);
};

export function createMetaModelClient(
  client: ResponsesLike = getMetaClient() as unknown as ResponsesLike,
  opts: { retryDelayMs?: number } = {},
): ModelClient {
  const retryDelayMs = opts.retryDelayMs ?? 2000;

  const call = async (body: Record<string, unknown>) => {
    try {
      return await client.responses.create(body as never);
    } catch (err) {
      if (!isRetryable(err)) throw err;
      await new Promise((r) => setTimeout(r, retryDelayMs));
      return client.responses.create(body as never);
    }
  };

  return {
    async respond(req) {
      const body: Record<string, unknown> = { model: AGENT_MODEL, input: req.input };
      if (req.instructions) body.instructions = req.instructions;
      if (req.tools?.length) body.tools = req.tools;
      if (req.jsonSchema) {
        body.text = {
          format: { type: "json_schema", name: req.jsonSchema.name, schema: req.jsonSchema.schema, strict: true },
        };
      }
      const res = (await call(body)) as { output_text?: string; output?: RawOutputItem[] };
      const output = res.output ?? [];
      const toolCalls = output
        .filter((item) => item.type === "function_call")
        .map((item) => ({ id: String(item.call_id), name: String(item.name), args: String(item.arguments ?? "") }));
      return { text: res.output_text || undefined, toolCalls, output };
    },
  };
}
