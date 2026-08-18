import OpenAI from "openai";
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
  console.log(`[llm] call ${callCount}`);

  const client = new OpenAI();
  const model = process.env.OPENAI_MODEL ?? MODEL;

  const response = await client.responses.create({
    model,
    instructions,
    input,
  });

  return response.output_text;
}
