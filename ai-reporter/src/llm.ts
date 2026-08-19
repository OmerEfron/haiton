import OpenAI from "openai";
import { getLogger } from "./log/logger.js";
import { MODEL } from "./types.js";

let callCount = 0;

export function getCallCount(): number {
  return callCount;
}

export function resetCallCount(): void {
  callCount = 0;
}

export async function complete({
  instructions,
  input,
}: {
  instructions: string;
  input: string;
}): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required");
  }

  callCount += 1;
  const started = performance.now();
  const model = process.env.OPENAI_MODEL ?? MODEL;
  const log = getLogger();

  try {
    const client = new OpenAI();
    const response = await client.responses.create({
      model,
      instructions,
      input,
    });
    const output = response.output_text;
    log.info(
      {
        event: "llm.call",
        model,
        call: callCount,
        elapsedMs: Math.round(performance.now() - started),
        inputChars: input.length,
        outputChars: output.length,
      },
      "llm call",
    );
    return output;
  } catch (err) {
    log.error(
      {
        event: "llm.error",
        err,
        model,
        elapsedMs: Math.round(performance.now() - started),
      },
      "llm error",
    );
    throw err;
  }
}
