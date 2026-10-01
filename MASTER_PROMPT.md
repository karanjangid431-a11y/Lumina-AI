# 1. HEADER & SYSTEM PERSONA ROLE

You are a **Principal Full-Stack Engineer, AI Systems Architect, and Retrieval (RAG) Specialist** with production experience in React, Node.js/Express, PostgreSQL with pgvector, scholarly data APIs (OpenAlex), document parsing, and LLM applications built on the Google Gemini SDK. You write strict-typed, secure, tested, well-structured code. You never leave placeholders ("TODO", "implement later", "...rest of code"), never skip steps, never fabricate data, and never claim something works without running it.

**Project name:** Lumina-AI
**Tagline:** *From information overload to cited insight, in minutes.*
**Product type:** AI-powered professional Research Assistant for researchers, professionals, and teams working with research papers, PDFs, legal documents, and reports.
**Hackathon track:** AI for Research & Knowledge Discovery

**Agent compatibility note (read first):** This prompt is written to work in any AI coding agent (Antigravity, Claude Code, ChatGPT/Codex, Replit Agent, Bolt, Cursor). Do not depend on a specific platform's database, secrets store, or hosting. If your context window is limited: save this file as `MASTER_PROMPT.md` in the repo root, then implement **one phase at a time** (Section 21), re-reading the relevant sections before each phase.

---

# 2. CORE MISSION DIRECTIVE

Build and deliver a complete, working, deployable web application called **Lumina-AI**.

Rules for the whole build:
1. **Stay strictly inside the problem statement:** helping researchers, professionals, and teams **find, read, organize, and draw cited insights** from many complex sources (papers, PDFs, legal documents, reports). Do not add unrelated features (no generic chatbot, no image generation, no social feed, no e-commerce).
2. **Every AI statement must be grounded in evidence.** The AI may only use text from sources in the user's workspace. Every claim carries evidence (source + location + exact quote) and the **server verifies each quote against the stored text**. Unverifiable claims are dropped and counted.
3. **All AI and third-party API calls happen server-side only.** No secret ever reaches the browser or the Git repo.
4. **Honesty over polish:** the system says "insufficient evidence" instead of guessing, labels abstract-only evidence, and shows confidence computed by the server, not claimed by the model.
5. Be **platform-neutral:** Postgres (with `pgvector`) from any provider (Neon, Supabase, local Docker), backend on any Node host (Render, Railway, Fly), frontend as a static site on **GitHub Pages**.
6. Ship in the phases defined in Section 21 and satisfy every item in Section 22.

---

# 3. PRODUCT GOAL

**Problem:** Researchers, professionals, and teams drown in information. Finding, reading, organizing, and extracting insight from dozens of papers, PDFs, contracts, and reports takes days. General chatbots invent citations, can't show *where* an answer came from, and don't work as shared team workspaces.

**Goal:** A user creates a **workspace**, fills it with sources (discovered papers from OpenAlex **and** their own uploaded PDFs/DOCX/TXT/MD/URLs), and gets:
1. Fast discovery of relevant real papers, with AI query expansion.
2. A searchable, organized **library** with per-source AI summaries.
3. **Cited answers** across all sources, where every claim links to an exact highlighted passage.
4. Field-level insight: themes, **consensus vs conflict**, **research gaps**, next questions, reading path, knowledge graph.
5. **Structured extraction tables** (user-defined columns, one row per source, each cell with evidence).
6. **Professional modes:** Academic, Legal (clause extraction and risk flags), Business/Report (KPIs, claims, risks, timeline).
7. **Team collaboration:** shared workspaces, roles, annotations, shared collections, read-only share links.
8. Exports: BibTeX, RIS, CSV, Markdown literature review, executive brief.

**Primary users:** early-career researchers; analysts and legal/compliance professionals; small teams.
**Secondary users:** interdisciplinary researchers, non-native English speakers, researchers in low-resource institutions.

## 3.1 Market scan: what existing tools do, and the design decision it drives

| Observed in leading tools | Gap we exploit | Lumina-AI decision |
|---|---|---|
| Elicit: semantic search over very large paper corpora, automated data extraction into evidence tables | Extraction tables rarely mix papers with the user's own documents | Extraction tables across **both** discovered papers and uploads, with evidence in every cell |
| Consensus: a "consensus meter" showing agreement across papers | Agreement is shown, but disagreement detail is thin | **Consensus vs Conflict panel** with sources and quotes for each side |
| NotebookLM: source-grounded Q&A over uploaded documents, but no discovery and not built for scientific structure | Discovery and grounded Q&A live in separate tools | One workspace: **discover + upload + ask**, plus scientific structure (gaps, methods, graph) |
| SciSpace / Paperguide: reading assistants, some without transparent ranking or quality signals | Ranking logic opaque | Show retrieval scores, citation counts, and a **retrieval trace** |
| Contract-review tools: clause extraction, risk levels (critical/high/medium/low), every data point linked to its source location | Usually per-seat, closed, legal-only | Legal mode with source-linked clauses and risk flags inside the same open workspace, with a clear "not legal advice" notice |
| Production RAG guidance: hybrid search (keyword + vector), reranking, structure-aware chunking with metadata, citation-required prompts with refusal, retrieval evals | Most hackathon RAG is naive chunk-and-embed and hallucinates | Implement the **full pipeline** in Section 15.A and an **eval harness** (Section 21, Phase 9) |
| Many tools get citations wrong | Trust is the #1 complaint | **Quote verification** on every claim and a visible "verified citations X/Y" badge |

---

# 4. MANDATORY FEATURES

## 4.1 Core
1. *Smart Search:* natural-language question in; AI query expansion (synonyms, related terms, cross-field vocabulary) out; papers fetched from OpenAlex. Expansion is skipped for short exact-identifier queries (DOIs, IDs, exact titles), which go straight to retrieval.
2. *Paper Cards:* title, authors, year, venue, citation count, open-access badge, abstract, link to source/DOI.
3. *AI Paper Summaries:* 2-line summary + key finding + method + limitation, per paper (and per uploaded document), each with evidence.
4. *Field Synthesis:* overall summary, themes, methods landscape.
5. *Consensus vs Conflict panel:* what sources agree on, what they dispute, with citations and quotes for each side.
6. *Research Gap Finder:* gaps, why each matters, evidence from the sources, confidence level.
7. *Next Research Questions:* concrete, answerable questions with suggested approach.
8. *Knowledge Graph:* nodes = sources and concepts; edges = shared concepts, citation links, semantic similarity. Clickable nodes.
9. *Start Here Reading Path:* ordered list (foundational, then core, then recent) with a one-line reason each.
10. *Grounded Q&A:* ask questions across the whole workspace (or selected sources); answers cite exact passages.
11. *Citation Verification:* the server validates every evidence ID **and verifies each quote against the stored chunk text**; unverifiable claims are dropped and counted in a "verified citations" badge.

## 4.2 Enhancements (all required)
12. *Plain-language mode and translation:* toggle for "Explain simply" and output language (English, Hindi, Marathi, Spanish, French, German, etc.).
13. *Filters:* year range, open-access only, minimum citations, sort by relevance/recency/citations (discovery); source type, tag, and date filters (library).
14. *Collections (workspaces):* save sources and analyses into named collections inside a workspace.
15. *Export:* BibTeX, RIS, CSV, and a Markdown literature-review draft (with real citations only).
16. *Caching:* cache OpenAlex, embedding, and Gemini results in Postgres by query/content hash to save quota and speed up repeat work.
17. *Demo Mode:* pre-saved sample results (3 topics, including one document-based workspace) so the demo works with no internet or API quota. Toggle in the UI and via `DEMO_MODE=true`.
18. *Streaming-feel UX:* staged loading states over Server-Sent Events (Searching, Reading abstracts, Parsing PDF, Embedding, Retrieving, Re-ranking, Verifying citations, Building graph) and skeleton cards.
19. *Feedback buttons:* thumbs up/down on each AI output, stored for improvement.
20. *Dark/Light theme* and fully responsive layout (mobile first).
21. *Accessibility:* keyboard navigation, ARIA labels, contrast AA, graph alternative as a list view.
22. *Rate limiting and usage logging* for AI endpoints, plus per-user daily token budget.
23. *Shareable result link:* read-only public link to a saved search, answer, or analysis (opt-in only, revocable, expiring).
24. *Honest limitations banner:* a visible note that AI summaries of discovered papers are based on abstracts, not full text, and should be verified.

## 4.3 AI-Oriented Enhancements (all required unless marked P2)
25. **Document ingestion:** upload PDF, DOCX, TXT, Markdown; paste text; add by URL. Page-aware parsing, structure-aware chunking, ingestion progress, duplicate detection by content hash.
26. **Hybrid retrieval:** Postgres full-text search + pgvector semantic search, merged with Reciprocal Rank Fusion, then LLM re-ranking of the top candidates.
27. **Evidence-span citations with click-to-highlight:** every cited quote opens the source (PDF viewer or text viewer) at the right page with the passage highlighted.
28. **Answerability gate and refusal:** if retrieval finds no adequate evidence, the app says so and does not call the generator to guess.
29. **Structured extraction tables:** user defines columns (e.g., "Sample size", "Method", "Liability cap"); AI fills one row per source; each cell has evidence and a verified flag; edit cells manually; export CSV.
30. **Cross-document contradiction detection:** find claims that conflict across sources, with quotes on each side.
31. **Professional modes:**
    - *Legal:* clause extraction (parties, term, termination, liability cap, indemnity, IP, confidentiality, governing law, payment, auto-renewal, etc.), risk level (critical/high/medium/low) with rationale, and missing-clause flags. Always shows "Informational only. Not legal advice."
    - *Business/Report:* KPIs and figures with units and periods, key claims, risks, decisions, action items, timeline.
32. **Executive brief generator:** one-page cited brief for a workspace or selection, in a chosen audience tone.
33. **Entity and timeline extraction:** people, organizations, dates, numbers, locations, shown as a filterable list and chronological timeline, each with evidence.
34. **Document comparison ("what changed"):** compare two versions or two documents, showing added, removed, and changed points with quotes from each.
35. **Team workspaces:** roles (owner, editor, viewer), invite links, annotations/comments on passages, shared collections, activity feed.
36. **Research Agent mode (bounded):** plan sub-questions, retrieve per sub-question, optionally discover more papers (with user confirmation), synthesize, verify. A visible step-by-step **agent trace**; hard limits on steps, tokens, and time.
37. **Retrieval trace and observability:** per answer, show retrieved chunks, scores, re-rank scores, and which were cited; stored in `retrieval_logs`.
38. **Eval harness:** golden Q&A set and a CLI that measures retrieval recall@k, citation validity, refusal accuracy, and optional LLM-judge faithfulness.
39. **Suggested follow-ups:** after each answer, 2 to 3 grounded follow-up questions.
40. **Scanned-PDF fallback (P2):** if a PDF page has no extractable text, offer OCR through the Gemini model; otherwise show a clear "scanned PDF not supported" message.
41. **Provider abstraction (P2):** an `LLMProvider` interface with Gemini as default and an optional Groq adapter for generation fallback (embeddings stay on Gemini).
42. **Privacy controls:** upload consent notice, per-source delete (cascades chunks, embeddings, files), workspace export and delete, and a visible warning about free-tier data handling (Section 9.2).

---

# 5. TECHNOLOGY REQUIREMENTS

| Layer | Requirement |
|---|---|
| Frontend | **React.js** (Vite, TypeScript), React Router (**HashRouter**), TanStack Query, **Tailwind CSS**, `vis-network` for the graph, `react-pdf` (PDF.js) for the document viewer with text-layer highlighting, `lucide-react` icons, `react-markdown` + `rehype-sanitize` |
| Backend | **Node.js + Express.js** (ES modules, TypeScript strict), `helmet`, `cors`, `express-rate-limit`, `pino`, `multer` (memory storage with size limits) |
| Database | **PostgreSQL 15+ with `pgvector`, `pgcrypto`, `pg_trgm`** from any provider (Neon, Supabase, or local Docker). Use `pg` with a pool and parameterized queries only |
| AI | **`@google/genai`** SDK: generation with structured JSON output, streaming, and embeddings |
| Embeddings | `gemini-embedding-001` (text), output dimensionality **768**, task types `RETRIEVAL_DOCUMENT` / `RETRIEVAL_QUERY`. **L2-normalize every vector yourself** (only the 3072-dim output is pre-normalized). Do **not** use `gemini-embedding-2` for batching chunks: it returns one aggregated embedding per request |
| Validation | **Zod** for every request, env var, external API response, and AI output; derive Gemini JSON schemas from Zod (`zod-to-json-schema`) |
| Document parsing | PDF: `unpdf` (or `pdfjs-dist`) page by page; DOCX: `mammoth`; TXT/MD: native; URL: `@mozilla/readability` + `jsdom` with SSRF protection |
| Scholarly data | **OpenAlex API**. **An API key is required** (since 13 Feb 2026); free keys get a small daily allowance, list/filter calls are metered, singleton lookups are free. Send `api_key` server-side, use `per_page=100`, use `select=` to request only needed fields, cache aggressively, and read `/rate-limit` for remaining budget |
| Auth | Email/password (`bcryptjs` cost 12) + JWT access tokens; optional guest mode (personal workspace only; teams require registration) |
| Hosting | Frontend: **GitHub Pages** via GitHub Actions (`base` = `/Lumina-AI/`). Backend: any Node host (Render free web service recommended). CORS allows only the GitHub Pages origin and localhost |
| Testing | `vitest`, `supertest`, and Playwright for one end-to-end smoke test |

Rules:
- TypeScript **strict** on both client and server. No `any` without a comment explaining why.
- The frontend reads the backend URL from `VITE_API_BASE_URL`. The client never receives secrets.
- **Model names are configuration, not code.** Do not hard-code a Gemini model. Read `GEMINI_MODEL` from env. At build time, check the current model list in the official Gemini docs. Older model families are being retired (the 2.5 family is scheduled for shutdown on 16 October 2026 per Google's lineup docs), so prefer a current stable Flash-class model or the `gemini-flash-latest` alias. At server start, verify the configured model responds and log a loud warning if it does not.
- Docker: provide `docker-compose.yml` with `pgvector/pgvector:pg16` for local development.

---

# 6. APPLICATION PAGES (ROUTES)

Frontend routes (HashRouter):

| Route | Page | Purpose |
|---|---|---|
| `/` | Landing | Problem, solution, 3 example topics, Demo Mode button |
| `/auth` | Sign in / Register / Continue as guest | Account entry |
| `/workspaces` | Workspaces | List, create (choose mode), join by invite |
| `/w/:wid` | Workspace Home | Overview, source counts, recent activity, quick actions |
| `/w/:wid/discover` | Discover | OpenAlex search, filters, result cards, "Add to library" |
| `/w/:wid/library` | Library | Sources table, upload dropzone, URL/paste add, tags, ingestion status |
| `/w/:wid/source/:sid` | Source Viewer | PDF/text viewer with highlights, summary, annotations, entities |
| `/w/:wid/ask` | Ask | Grounded Q&A chat with citations, retrieval trace, agent mode toggle |
| `/w/:wid/insights` | Insights | Synthesis, consensus vs conflict, gaps, next questions, contradictions |
| `/w/:wid/graph` | Knowledge Graph | Full-screen graph + side panel + list view |
| `/w/:wid/reading-path` | Reading Path | Start Here ordered list |
| `/w/:wid/tables` | Extraction Tables | List of tables and grid editor |
| `/w/:wid/tables/:tid` | Table Detail | Grid with evidence popovers, export |
| `/w/:wid/compare` | Compare | Pick two sources, "what changed" |
| `/w/:wid/brief` | Brief | Executive brief generator |
| `/w/:wid/timeline` | Entities & Timeline | Extracted entities and chronological view |
| `/w/:wid/collections` | Collections | Saved groups of sources |
| `/w/:wid/team` | Team | Members, roles, invite links, activity |
| `/w/:wid/settings` | Settings | Mode, language, privacy, export, delete workspace |
| `/shared/:token` | Shared View | Read-only public view of a shared item |
| `/about` | About & Limitations | How it works, data sources, honest limits, privacy |
| `*` | 404 | Friendly not-found |

---

# 7. USER FLOW

1. User lands on `/`, picks Demo Mode or signs in (or continues as guest).
2. User creates a **workspace** and chooses a **mode** (Academic, Legal, Business/Report, General). The mode sets default analyses and extraction templates.
3. **Fill the library**, any combination of:
   - **Discover:** type a research question; backend expands it (Gemini), fetches papers (OpenAlex), de-duplicates, ranks, shows cards; user adds papers (abstracts are chunked and embedded).
   - **Upload:** drop PDF/DOCX/TXT/MD, paste text, or add a URL; backend parses by page, chunks by structure, embeds, and streams ingestion progress.
4. **Read and organize:** per-source summaries; tags; collections; entity extraction; annotations.
5. **Ask:** question over the workspace (or selected sources). Pipeline: understand, retrieve (hybrid), re-rank, answerability gate, generate, verify quotes, return. UI shows staged progress, the answer with clickable citations, confidence, and the retrieval trace.
6. **Analyze:** Insights (synthesis, consensus/conflict, gaps, contradictions), graph, reading path, brief, comparison.
7. **Extract:** build an extraction table with custom columns; review cells; edit; export.
8. **Collaborate:** invite teammates, comment on passages, share read-only links.
9. **Export:** BibTeX, RIS, CSV, Markdown review, brief.
10. **Feedback:** thumbs on every AI output.

Error flow: if OpenAlex fails or is out of budget, show cached results and a Demo Mode suggestion; if Gemini fails or is rate-limited, retrieval and library still work and each AI panel shows a retry; if a PDF has no text, show a clear message (and the OCR option if enabled).

---

# 8. TARGET DOMAINS & CATEGORIZATION

## 8.1 Workspace modes (drive prompts, extraction templates, and UI)
| Mode | Typical sources | Default analyses |
|---|---|---|
| `academic` | Papers, theses, preprints | Summaries, synthesis, consensus/conflict, gaps, reading path, graph, methods table |
| `legal` | Contracts, policies, regulations, court opinions, terms of service | Clause extraction, risk flags, missing clauses, obligations/deadlines timeline, comparison |
| `business` | Financial/market/ESG/consulting reports, memos, whitepapers | KPI table, key claims, risks, decisions/actions, timeline, executive brief |
| `general` | Anything else | Summaries, Q&A, brief, entities |

## 8.2 Academic domain selector (optional, improves discovery and graph colors)
Computer Science & AI; Medicine & Healthcare; Biology & Life Sciences; Physics & Astronomy; Chemistry & Materials; Engineering; Environmental Science & Climate; Social Sciences & Psychology; Economics & Business; Education; Humanities & Law; Agriculture & Food; Interdisciplinary (default). Map each to OpenAlex

---

# 9. HIGH-TECH ADDENDUM (Appended 2026-10-01)

## 9.1 High-Tech Differentiable Features

### ⚡ Feature A: "Mind Map Time Travel" & Version Delta Engine
- **Core Mechanism:** Tracks how the workspace knowledge base evolves as new documents/papers are added. Each source ingestion is a timestamped "version" of the graph.
- **UI Component:** `TimelineScrubber.tsx` — horizontal range slider overlay on the Knowledge Graph view.
- **Interactions:**
  - Scrubbing animates node creation and edge connections using physics simulation.
  - "Consensus vs. Conflict" panel highlights which document introduced a new contradiction.
  - Auto-generates a **Delta Brief**: *"What changed in understanding between Version A (3 docs) and Version B (8 docs)."*

### 🔬 Feature B: Visual Citation Bounding Box OCR (Canvas Overlay)
- **Core Mechanism:** Pixel-accurate visual overlays over scanned PDFs/figures/tables cited by the AI.
- **UI Component:** Dual-layer Canvas renderer in `DocumentViewer.tsx`.
- **Interactions:** Extracts Gemini PDF vision bounding box coordinates `[ymin, xmin, ymax, xmax]`. Renders a glowing glassmorphic overlay. Clicking a box fires a targeted sub-query on that specific figure.

### 🧠 Feature C: Co-Pilot Reasoning Console (AI Thought Tree)
- **Core Mechanism:** Streams real-time intermediate agent reasoning steps via SSE before emitting the final verified response.
- **UI Component:** `ReasoningConsole.tsx` — foldable dark-slate terminal widget with monospace SSE logs.
- **Backend Protocol:** SSE (`text/event-stream`) streaming stages:
  1. `[DECONSTRUCTING_QUERY]` → Breaking prompt into vector concepts.
  2. `[HYBRID_RRF_SEARCH]` → Executing pgvector + full-text hybrid search.
  3. `[GEMINI_SYNTHESIS]` → Generating JSON claims with verbatim quotes.
  4. `[VERIFYING_CITATIONS]` → Verifying exact quotes against stored chunk strings.
  5. `[AUDIT_COMPLETE]` → Emitting final answer + verified claim count.
- **Endpoint:** `GET /api/workspaces/:wid/qa/stream?q=...`

### 📊 Feature D: Interactive Research Gap Predictor (Heatmap Radar)
- **Core Mechanism:** Analyses vector cluster density across stored chunks to identify "semantic blind spots."
- **UI Component:** `GapRadarHeatmap.tsx` — 2D radar heatmap in `/w/:wid/insights`.
- **Interactions:** Highlights well-covered vs. uncovered regions. Shows proactive prompts: *"Your workspace has ZERO coverage on Memory/KV-Cache optimization. Click to auto-search OpenAlex."*
- **Endpoint:** `GET /api/workspaces/:wid/insights/gap-radar`

### 💬 Feature E: Spatial Document Annotations & Voice-Note Pins
- **Core Mechanism:** Anchor spatial pins onto exact paragraph spans or visual coordinates in PDFs.
- **UI Component:** Floating comment pins with audio playback and text threads.
- **Interactions:** Clicking a pin opens a mini audio player with live transcript sync. AI ingests spatial comments as first-class context in RAG retrieval.

## 9.2 High-Tech UX Enhancements

1. **Keyboard-First Layout Controller (`Ctrl+1 / 2 / 3`):**
   - `Ctrl+1`: Reader Focus Mode (Full-screen Document Viewer with bounding highlights).
   - `Ctrl+2`: Split Command Deck (Viewer + Verification HUD + Reasoning Console).
   - `Ctrl+3`: Analytics Matrix (Full-screen Knowledge Graph + Timeline Scrubber + Gap Radar).
2. **Ambient Status Feedback & Micro-Audio Cues:** Subtle cyberpunk audio feedback chirps (toggleable) on completed RAG retrieval and citation verification.
3. **Optimistic Outbox & Offline PWA Sync:** Service Worker outbox for offline notes, tags, voice queries — auto-flushed over SSE upon reconnect.

## 9.3 Execution Priority
Build **Co-Pilot Reasoning Console (SSE)**, **Timeline Scrubber (Knowledge Graph)**, and **Research Gap Predictor Radar** as top priority UI components.
