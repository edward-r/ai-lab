# Prompt Maker

Craft structured, high-signal prompts through an interactive Next.js workflow. Paste a draft prompt, get an instant diagnosis, answer the highest-leverage clarifying questions, and produce a contract-ready prompt. Optionally, finish with an OpenAI-powered polish pass while preserving the deterministic structure.

## Features

- **Prompt diagnosis** – heuristics score outcome, context, constraints, format, process, and uncertainty.
- **Clarifying questions** – automatically generated follow-ups fill in the weakest sections.
- **Improvement engine** – merges answers into a reusable prompt contract.
- **LLM polish (optional)** – server-side call to OpenAI tightens wording without changing structure.
- **Before/after metrics** – visualize score improvements per criterion and overall.

## Architecture

- **Framework**: Next.js App Router (TypeScript, functional components).
- **UI**: Client-side page under `app/page.tsx` orchestrates diagnose → clarify → improve flow.
- **API routes**: `app/api/diagnose` and `app/api/improve` handle scoring, question generation, and synthesis.
- **Domain logic**: Shared functional modules live in `lib/` (`types`, `heuristics`, `questions`, `contract`, `improve`, `llm`).
- **Styling**: Hand-rolled CSS in `app/globals.css` with a dark glassmorphism theme.

## Getting Started

1. **Install dependencies**
   ```bash
   npm install
   ```
2. **Set environment variables** (add to your shell profile or a `.env.local` file):
   ```bash
   export OPENAI_API_KEY="sk-..."   # required for polish mode
   export OPENAI_MODEL="gpt-4o-mini" # optional override
   export OPENAI_BASE_URL="https://api.openai.com/v1/chat/completions" # optional
   ```

   - If you omit `OPENAI_MODEL`, the app defaults to `gpt-4o-mini`.
   - `OPENAI_BASE_URL` is useful when pointing to Azure OpenAI or a proxy.
3. **Run the dev server**
   ```bash
   npm run dev
   ```
4. Visit `http://localhost:3000` and walk through the Diagnose → Clarify → Improve flow.

## Prompt Workflow

1. **Diagnose** – Paste any rough prompt. The backend scores it via `lib/heuristics` and returns prioritized guidance plus up to 4 clarifying questions from `lib/questions`.
2. **Clarify** – Answer prompted questions. Options help you stay within typical high-performing patterns.
3. **Improve** – `lib/improve` merges the answers into structured prompt sections using `lib/contract`. The page displays both the deterministic prompt and (optionally) the polished variant.
4. **Polish (optional)** – Toggle “Polish final prompt with OpenAI” to run `lib/llm.callLLM`; errors surface inline without blocking the deterministic output.

## Running Without OpenAI

You can use the app without an API key—simply leave polishing disabled. Diagnostics, question generation, and improved prompt synthesis all run locally.

## API Endpoints

### POST `/api/diagnose`

- **Request**: `{ "original": string, "maxQuestions?": number }`
- **Response**: `{ diagnosis, questions }`
- Validates that `original` is non-empty.

### POST `/api/improve`

- **Request**: `{ "original": string, "answers?": Record<string,string>, "defaults?": Partial<PromptSections>, "polish?": boolean }`
- **Response**: `ImproveResult`
  - `improvedPrompt`: deterministic contract output.
  - `polishedPrompt`: optional OpenAI-refined version.
  - `diagnosisBefore` / `diagnosisAfter`: scores and notes.
  - `polishError`: message surfaced if the OpenAI request fails.

Both routes trim the original prompt input and return `400` when missing.

## Development Notes

- Code style favors functional TypeScript (no classes, no `any`).
- Shared modules reside under `lib/`; avoid reintroducing root-level copies.
- Update `tsconfig.json` path aliases if you move modules (`@/lib/*`).
- When adding new heuristics or questions, extend `CriterionKey` in `lib/types.ts` and adjust weights in `lib/heuristics.ts` accordingly.

## Testing Ideas

While no automated tests ship yet, consider:

- Unit tests for `lib/heuristics` scoring edge cases.
- Snapshot tests for `lib/improve` ensuring section ordering.
- API route tests verifying error handling and polish fallbacks.

## Sample Prompt (Quick Test)

Paste the following into the Diagnose step to experience the full flow:

```
Hey, can you help me write a prompt for evaluating our new onboarding flow? I need something that ensures the model checks usability but I don’t really know what else to include.
```

- After diagnosis, answer the clarifying questions (e.g., outcome format, constraints).
- Try enabling the OpenAI polish toggle to see the finishing pass (requires your key).

## Future Enhancements

- Support multiple prompt profiles (analysis, code, product copy) with seed defaults.
- Allow exporting improved prompts as JSON contracts.
- Add history so users can compare several iterations.
- Integrate diff view to highlight textual changes between before/after prompts.
