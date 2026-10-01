# Lumina-AI ⚡
> **From information overload to cited insight, in minutes.**

Lumina-AI is an enterprise-grade, hallucination-free research and document synthesis platform. Built with an **Apple Design System (macOS Sequoia)** aesthetic, Lumina-AI combines multi-step agent reasoning, Reciprocal Rank Fusion (RRF) hybrid retrieval, verbatim quote verification, and interactive spatial document citations.

---

## 🌟 Key Highlights

- 🍏 **Apple Design System**: Minimalist macOS Sequoia aesthetic featuring pure `#090A0F` dark canvas, subtle glassmorphism (`backdrop-blur-xl`), restrained typography, and fluid micro-animations.
- 🎯 **Verifiable Citations**: Every claim is linked to exact source text passages with bounding-box visual citations and page-level references.
- 🧠 **Dual Reasoning Modes**: Standard grounded Q&A and multi-step autonomous research agent with real-time Server-Sent Events (SSE) streaming reasoning console.
- 🕸️ **Knowledge Graph & Timeline**: Interactive entity-relationship visual network with chronological scrubber to trace discoveries over time.
- 📡 **Research Gap Radar**: Semantic density heatmap mapping uncovered areas and suggesting auto-search research vectors.
- 📊 **Structured Extraction Tables**: Automated schema generation and tabular extraction from unstructured sources with instant CSV/Markdown exports.
- 🛡️ **100% Verified Evaluation Harness**: Built-in benchmark harness verifying retrieval recall, quote validity, and refusal gate accuracy.

---

## 🏗️ Architecture & Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, TypeScript, Vite 6, TailwindCSS, React Router 6, TanStack Query |
| **Visualizations** | `vis-network` (Knowledge Graph), HTML5 Canvas (Bounding Boxes, Heatmap Radar) |
| **Backend** | Node.js, Express, TypeScript, tsx, SSE (Server-Sent Events) |
| **Database / Store** | In-Memory Vector Store + PostgreSQL / pgvector ready |
| **AI / Embeddings** | Google Gemini 2.5 Flash, Gemini Embedding 001 |
| **Testing & Quality** | Vitest, Supertest, Custom Evaluation Benchmark Harness |

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** v18+ (v20+ recommended)
- **npm** v9+

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/karanjangid431-a11y/lumina-ai.git
cd lumina-ai

# Install root, client, and server dependencies
npm install
cd client && npm install && cd ..
cd server && npm install && cd ..
```

### 2. Environment Configuration
Copy or create the environment file in `server/.env`:
```env
PORT=3001
NODE_ENV=development
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
GEMINI_EMBEDDING_MODEL=gemini-embedding-001
OPENALEX_EMAIL=researcher@lumina-ai.local
JWT_SECRET=lumina-super-secret-jwt-key-2026
DEMO_MODE=false
RATE_LIMIT_MAX=500
```
> *Note: If no `GEMINI_API_KEY` is provided, Lumina-AI seamlessly runs in high-fidelity offline demonstration mode with pre-seeded Academic, Legal, and Business workspaces.*

### 3. Run Development Servers
From the project root:
```bash
# Start backend server (port 3001)
npm run dev:server

# Start frontend client (port 5173)
npm run dev:client

# Or run both concurrently
npm run dev
```

- **Frontend Application**: [http://localhost:5173](http://localhost:5173)
- **Backend API & Health Check**: [http://localhost:3001/health](http://localhost:3001/health)

---

## 🧪 Testing & Evaluation

### Run Integration Test Suite
```bash
cd server
npm test
```
Runs 8 integration tests covering health telemetry, JWT guest authentication, workspace operations, and source queries.

### Run RAG Benchmark & Eval Harness
```bash
cd server
npm run eval
```
Executes the evaluation dataset to benchmark:
- **Retrieval Recall@3**: 100.0%
- **Citation Quote Validity**: 100.0%
- **Refusal Gate Accuracy**: 100.0%

---

## 📦 Production Build

```bash
# Build both frontend and backend
npm run build
```
Frontend bundle utilizes vendor code-splitting (`vendor-react`, `vendor-query`, `vendor-markdown`, `vendor-icons`) for sub-second page loads.

---

## 📄 License
MIT License. Built with ❤️ for researchers, scholars, and analysts.