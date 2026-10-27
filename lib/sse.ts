/** Reads a server-sent-events response to the end, calling `onEvent` for each `event:` / `data:` pair. */
export async function readServerEvents(res: Response, onEvent: (event: string, data: unknown) => void): Promise<void> {
  if (!res.body) throw new Error("Empty response");
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";
    for (const raw of events) {
      const event = raw.match(/^event: (.+)$/m)?.[1];
      if (event) onEvent(event, JSON.parse(raw.match(/^data: (.+)$/m)?.[1] ?? "null"));
    }
  }
}
