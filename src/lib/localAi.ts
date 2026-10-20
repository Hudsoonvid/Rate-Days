import type { RecapContent, RecapFacts } from "./narrator";
import { buildPayload, NarratorError, parseRecapFields, RECAP_SCHEMA, systemPrompt, toRecap } from "./recapPrompt";
import type { AppData, Settings } from "./types";

/**
 * "Connect to AI": the narrator running on the user's own computer. The app
 * sends a period's episodes to an OpenAI-compatible server there (Ollama by
 * default, or LM Studio / llama.cpp), the model writes the recap, and the
 * reply comes back to the app. Nothing goes to a third party.
 */

const TIMEOUT_MS = 4 * 60_000;

/** Models we know write good recaps, best first. The first one installed wins. */
const PREFERRED = [
  /^llama3\.1:8b/, /^qwen2\.5:14b/, /^qwen2\.5:7b/, /^gemma3:12b/, /^mistral-nemo/, /^gemma2:9b/,
  /^llama3\.1/, /^qwen2\.5/, /^gemma3/, /^qwen3/, /^llama3/, /^mistral/, /^phi4/, /^gemma/,
];
const NOT_CHAT = /embed|bge|minilm|rerank|whisper|clip/i;

export function pickModel(models: string[]): string | null {
  const usable = models.filter((m) => !NOT_CHAT.test(m));
  for (const pattern of PREFERRED) {
    const hit = usable.find((m) => pattern.test(m));
    if (hit) return hit;
  }
  return usable[0] ?? null;
}

/** "my-pc.tail1234.ts.net/" → "https://my-pc.tail1234.ts.net"; strips a trailing /v1. */
export function normalizeServerUrl(raw: string): string {
  let url = raw.trim().replace(/\/+$/, "").replace(/\/v1$/i, "");
  if (!url) return "";
  if (!/^https?:\/\//i.test(url)) {
    const host = url.split(/[/:]/)[0];
    const local = host === "localhost" || /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.endsWith(".local");
    url = `${local ? "http" : "https"}://${url}`;
  }
  return url;
}

/**
 * Browsers refuse plain-http requests from an https page (except to localhost on
 * desktop browsers). Returns a hint when the address will be blocked.
 */
export function mixedContentWarning(url: string, pageProtocol: string): string | null {
  if (pageProtocol !== "https:" || !/^http:\/\//i.test(url)) return null;
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    return null; // Still being typed.
  }
  if (host === "localhost" || host === "127.0.0.1" || host === "[::1]") return null;
  return "Phones block plain http:// addresses on this site. Use the https:// address the setup prints.";
}

function withTimeout(ms: number): { signal: AbortSignal; done: () => void } {
  const ctl = new AbortController();
  const id = setTimeout(() => ctl.abort(), ms);
  return { signal: ctl.signal, done: () => clearTimeout(id) };
}

function unreachable(): NarratorError {
  return new NarratorError("Couldn't reach the AI. Check that the computer running it is on and awake, and that Tailscale is connected on this device.");
}

async function errorMessage(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string | { message?: string } };
    if (typeof body.error === "string") return body.error;
    if (body.error?.message) return body.error.message;
  } catch {
    // Not JSON.
  }
  return `HTTP ${res.status}`;
}

/** Model ids the server offers. Tries the OpenAI-style list, then Ollama's own. */
export async function listModels(url: string): Promise<string[]> {
  const t = withTimeout(15_000);
  try {
    const res = await fetch(`${url}/v1/models`, { signal: t.signal });
    if (res.ok) {
      const body = (await res.json()) as { data?: { id: string }[] };
      if (Array.isArray(body.data)) return body.data.map((m) => m.id);
    }
    const tags = await fetch(`${url}/api/tags`, { signal: t.signal });
    if (tags.ok) {
      const body = (await tags.json()) as { models?: { name: string }[] };
      if (Array.isArray(body.models)) return body.models.map((m) => m.name);
    }
    throw new NarratorError(`That address answered, but it isn't an AI server (${await errorMessage(res)}).`);
  } catch (e) {
    if (e instanceof NarratorError) throw e;
    throw unreachable();
  } finally {
    t.done();
  }
}

interface ChatResponse {
  choices?: { message?: { content?: string | null } }[];
}

async function chat(url: string, body: object, timeoutMs: number): Promise<Response> {
  const t = withTimeout(timeoutMs);
  try {
    return await fetch(`${url}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: t.signal,
    });
  } catch (e) {
    if ((e as Error).name === "AbortError") throw new NarratorError("The AI took too long to answer. Try again, or try the Week view.");
    throw unreachable();
  } finally {
    t.done();
  }
}

/**
 * Connect: find the server, choose a model, and make one real (tiny) request so
 * "Connected" means the AI actually answered — not just that the address exists.
 */
export async function connectToAi(rawUrl: string): Promise<{ url: string; model: string }> {
  const url = normalizeServerUrl(rawUrl);
  if (!url) throw new NarratorError("Paste the AI address first.");
  const model = pickModel(await listModels(url));
  if (!model) throw new NarratorError("Connected, but no AI model is installed yet. Run the setup again on that computer.");
  const res = await chat(url, { model, stream: false, max_tokens: 8, messages: [{ role: "user", content: "Reply with the word ready." }] }, TIMEOUT_MS);
  if (!res.ok) throw new NarratorError(`The AI didn't answer: ${await errorMessage(res)}`);
  return { url, model };
}

export async function localRecap(settings: Settings, data: AppData, facts: RecapFacts): Promise<RecapContent> {
  const url = normalizeServerUrl(settings.localUrl);
  if (!url) throw new NarratorError("Connect to AI in Settings first.");
  let model = settings.localModel;

  const payload = buildPayload(data, facts, { noteLimit: 160, maxEpisodes: 35 });
  const body = (m: string, structured: boolean) => ({
    model: m,
    stream: false,
    temperature: 0.7,
    messages: [
      { role: "system", content: systemPrompt(facts) },
      { role: "user", content: `Write the recap for this period. Reply with only the JSON object.\n\n${JSON.stringify(payload)}` },
    ],
    ...(structured ? { response_format: { type: "json_schema", json_schema: { name: "recap", strict: true, schema: RECAP_SCHEMA } } } : {}),
  });

  let res = await chat(url, body(model, true), TIMEOUT_MS);
  if (res.status === 404) {
    // The model was removed or renamed on the server; pick another one that's installed.
    const next = pickModel(await listModels(url));
    if (!next) throw new NarratorError("The AI has no models installed. Run the setup again on that computer.");
    model = next;
    res = await chat(url, body(model, true), TIMEOUT_MS);
  }
  // Older servers that don't support schema-constrained output get a plain request instead.
  if (res.status === 400 || res.status === 422) res = await chat(url, body(model, false), TIMEOUT_MS);
  if (!res.ok) throw new NarratorError(`The AI returned an error: ${await errorMessage(res)}`);

  const reply = (await res.json()) as ChatResponse;
  const content = reply.choices?.[0]?.message?.content;
  if (!content) throw new NarratorError("The AI returned an empty reply.");
  return toRecap(facts, parseRecapFields(content));
}
