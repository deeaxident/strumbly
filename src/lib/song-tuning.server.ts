import { createOpenAI } from "@ai-sdk/openai";
import { Output, streamText } from "ai";
import { z } from "zod";

export const PRESET_IDS = ["standard", "dropd", "halfdown", "fulldown", "dropc", "dropb", "dadgad", "openg", "opend", "opene", "openc"] as const;

const schema = z.object({
  found: z.boolean(),
  song: z.string(),
  artist: z.string(),
  tuningName: z.string(),
  presetId: z.enum(PRESET_IDS).nullable(),
  notes: z.array(z.number().int()),
});

export type SongTuning = { song: string; artist: string; tuningName: string; presetId: string | null; notes: number[] };

const INSTRUCTIONS = `You identify the guitar tuning a song is played in.
Return the most widely accepted tuning for the main guitar part of the song the user names.
notes: exactly 6 MIDI note numbers for open strings, lowest (6th string) to highest (1st), e.g. Standard = [40,45,50,55,59,64].
presetId: one of standard (E A D G B E), dropd, halfdown (Eb), fulldown (D standard), dropc, dropb, dadgad, openg, opend, opene, openc — only if the tuning exactly equals it, else null.
If the song is unknown or ambiguous with no reasonable guess, set found=false.`;

export async function lookupSongTuning(query: string, apiKey: string): Promise<SongTuning | null> {
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
  });
  const result = streamText({
    model: provider.responses("openai/gpt-6-astra"),
    system: INSTRUCTIONS,
    prompt: query,
    output: Output.object({ schema }),
    providerOptions: {
      openai: { forceReasoning: true, reasoningEffort: "low", reasoningSummary: "auto", store: false, include: ["reasoning.encrypted_content"] },
    },
  });
  const out = await result.output;
  if (!out.found || out.notes.length !== 6 || out.notes.some((n) => n < 28 || n > 72)) return null;
  return { song: out.song, artist: out.artist, tuningName: out.tuningName, presetId: out.presetId, notes: out.notes };
}
