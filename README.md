# Strumbly

> A fast, intuitive online guitar tuner with real-time microphone pitch detection, reference audio playback, and AI-powered song tuning lookup.

Live Demo: strumbly.io

## Overview
Strumbly is designed to be the simplest, easiest-to-use online guitar tuner. Players can select from standard or alternate tunings, adjust for any capo position, or search for a song by name and let AI automatically determine the exact tuning needed. Once set up, users can either tune by ear using synthesized string audio or turn on their microphone for instant visual feedback showing whether each string is too flat or too sharp.

## Key Features
* Real-Time Microphone Pitch Detection: Listens via the browser microphone and gives clear visual feedback on whether a string is too low, too high, or in tune.
* Tune by Ear (Audio Playback): Synthesizes accurate reference pitches for every string and capo offset using Tone.js.
* AI Song Tuning Lookup: Search any song and let the integrated AI assistant identify the required guitar tuning automatically.
* Custom Tunings & Capo Support: Easily switch between tunings and shift pitch offsets dynamically based on capo placement.
* Product Roadmap: Actively tracked in [`roadmap.md`](./roadmap.md)

## Tech Stack
* Framework & Routing: TanStack Start, TanStack Router, React 19, TypeScript
* Data & State Management: TanStack Query, React Hook Form, Zod
* AI Integration: Vercel AI SDK (`ai`, `@ai-sdk/openai`)
* Audio Engine: Tone.js & Web Audio API
* Styling & UI: Tailwind CSS v4, Radix UI / shadcn/ui, Lucide Icons
* Build & Runtime: Vite, Nitro, Bun
* Testing & Code Quality: Vitest, React Testing Library, ESLint, Prettier

## Getting Started

### Prerequisites
Make sure you have [Bun](https://bun.sh) installed on your machine.

### Local Installation
1. Clone the repository:
   ```bash
   git clone https://github.com
   cd strumbly
   ```

2. Install dependencies:
   ```bash
   bun install
   ```

3. Set up environment variables:
   Create a `.env` file in the root directory and add your API key:
   ```env
   OPENAI_API_KEY=your_api_key_here
   ```

4. Start the development server:
   ```bash
   bun run dev
   ```

5. Run tests:
   ```bash
   bun test
   ```

## Development Workflow
Initially scaffolded with Lovable to accelerate UI prototyping, with iterative architecture, audio/microphone logic, testing, and custom features developed across 135+ commits using AI-assisted workflows (`AGENTS.md`).
