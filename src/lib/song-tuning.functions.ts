import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { lookupSongTuning } from "./song-tuning.server";

export const findSongTuning = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ query: z.string().trim().min(2).max(120) }).parse(data))
  .handler(async ({ data }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) return { result: null, error: "Song search isn't available right now." };
    try {
      const result = await lookupSongTuning(data.query, key);
      return { result, error: result ? null : "Couldn't find that song's tuning. Try adding the artist." };
    } catch (e) {
      console.error("song tuning lookup failed", e);
      return { result: null, error: "Song search failed. Please try again in a moment." };
    }
  });
