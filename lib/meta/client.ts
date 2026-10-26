import OpenAI from "openai";

export const META_BASE_URL = "https://api.meta.ai/v1";

/** Server-side only: the key never leaves the server. */
export function getMetaClient(): OpenAI {
  const apiKey = process.env.MODEL_API_KEY;
  if (!apiKey) throw new Error("MODEL_API_KEY is not set");
  return new OpenAI({ apiKey, baseURL: META_BASE_URL });
}
