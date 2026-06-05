# 🛠️ Brass Tacks

**Stop sending the same resume to every job. Start engineering the right one.**

Brass Tacks is a free, open-source resume engine that runs entirely on your machine. Paste a job posting, and Brass Tacks generates a razor-sharp resume tailored _exclusively_ to that role — using only the career history you provided. No hallucinated skills. No fake experience. No cloud dependency (no one ever sees your info except you and the people you share your resume with). Just signal-perfect resumes built from your truth.

> A restaurant manager applying to a **call center manager** role? Brass Tacks surfaces only the transferable skills — customer escalation, team scheduling, KPI tracking.
> The same person applying to **restaurant district manager**? Full operational details, P&L ownership, multi-unit coordination — all included.

That's not templating. That's resume engineering.

---

## 🔰 For Beginners (Get Started in 5 Minutes)

You don't need to be a software developer or know how to write code to use Brass Tacks. Here is the simple, step-by-step guide to get up and running:

### 1. What is an API Key? (And how to get a free one)

Brass Tacks runs completely on your own computer, but it uses an AI model to read and write your resume. To do this, it needs a "key" to connect to the AI model provider.

- **The easiest & free option** is Google's Gemini API key.
- **How to get it:**
  1. Go to [Google AI Studio](https://aistudio.google.com/apikey).
  2. Sign in with any Google/Gmail account.
  3. Click the blue **"Create API Key"** button at the top left.
  4. Copy the long string of letters and numbers (this is your key). Keep it secret!

### 2. Install Podman (The container runner)

Brass Tacks runs inside a secure, private sandbox on your machine called a "container". You'll need to install a helper application called **Podman** to run these containers:

- **Mac**: Download and install from [Podman for Mac](https://podman.io/docs/installation). Or if you use Homebrew: `brew install podman`. After installing, open the Podman app to start it.
- **Windows**: Download and install from [Podman for Windows](https://podman.io/docs/installation).
- **Linux**: Run your package manager, e.g. `sudo apt install podman`.

### 3. Setup and Launch

1. Open your computer's terminal (or command prompt).
2. Download the project code:
   ```bash
   git clone https://github.com/your-username/tailorforge.git
   cd tailorforge
   ```
3. Copy the configuration file:
   ```bash
   cp .env.example .env
   ```
4. Open the new `.env` file in any text editor (like Notepad or TextEdit) and find this line:
   ```env
   GEMINI_API_KEY=
   ```
   Paste your Gemini API key right after the `=` sign (e.g., `GEMINI_API_KEY=AIzaSyD...`). Save and close the file.
5. Install the Brass Tacks app shortcut directly to your applications menu:
   ```bash
   ./install.sh
   ```
6. Look in your Applications folder or search Spotlight/Start Menu for **Brass Tacks** and open it! The app will open in your web browser at `http://localhost:3000` and guide you through the rest.

---

## ✨ Why Brass Tacks?

|                            | Brass Tacks                                 | Generic Resume Builders                   |
| -------------------------- | ------------------------------------------- | ----------------------------------------- |
| **Runs locally**           | ✅ Your machine, your data                  | ❌ Cloud-hosted, data leaves your control |
| **Zero hallucination**     | ✅ Only outputs what you provided           | ❌ AI "enhances" with fabricated details  |
| **Job-specific tailoring** | ✅ Analyzes posting, maps your experience   | ❌ One-size-fits-all templates            |
| **AI model choice**        | ✅ Gemini, Claude, ChatGPT, xAI — your pick | ❌ Locked to one provider                 |
| **Cost**                   | ✅ Free and open-source                     | ❌ $20+/month subscriptions               |

---

## 🎯 How It Works

```
Download → Run → Onboard → Generate
```

### First Launch: Guided Onboarding

1. **Identity** — Name, email, phone, address
2. **Resume Upload** — Drop in your existing resume (PDF, DOCX) for automatic parsing via Docling
3. **Brain Dump** — A freeform field for _everything_: every role, project, certification, metric, and accomplishment across your entire career history

### Return Visits: Straight to Dashboard

Your profile persists locally in PostgreSQL. Open Brass Tacks and you're immediately on your dashboard — no re-entry, no sign-in walls.

### Generating a Tailored Resume

1. Paste a **job posting URL** or raw description
2. Brass Tacks semantically analyzes the posting against your indexed career profile
3. A resume is generated containing **only** relevant experience, skills, and accomplishments
4. Review, refine, export

---

## 🏗 Architecture

Brass Tacks is a full-stack application composed of four locally-run services orchestrated via Podman Compose. Zero cloud infrastructure required.

```
┌─────────────────────────────────────────────────────┐
│                    Your Browser                     │
│              (http://localhost:3000)                 │
└──────────────────────┬──────────────────────────────┘
                       │
          ┌────────────▼────────────────┐
          │     Next.js 15 Frontend     │
          │   App Router · Forge Theme  │
          └────────────┬────────────────┘
                       │
          ┌────────────▼────────────────┐
          │    FastAPI Backend (3.13)    │
          │  SQLAlchemy · Alembic · SSE │
          └──┬─────────┬────────────┬───┘
             │         │            │
     ┌───────▼──┐ ┌────▼─────┐ ┌───▼──────────┐
     │ Postgres │ │  Qdrant  │ │   Docling     │
     │  16      │ │  Vector  │ │   Parser      │
     │  alpine  │ │  Search  │ │   Service     │
     └──────────┘ └──────────┘ └──────────────-┘
```

| Layer                   | Technology                   | Purpose                                                           |
| ----------------------- | ---------------------------- | ----------------------------------------------------------------- |
| **Frontend**            | Next.js 15 (App Router)      | Bespoke "Forge" CSS theme — no generic component libraries        |
| **Backend**             | FastAPI (Python 3.13)        | Async API with SQLAlchemy ORM and Alembic migrations              |
| **Database**            | PostgreSQL 16                | Persistent user profiles, career data, generation history         |
| **Vector Intelligence** | Qdrant                       | Semantic indexing of career profiles for relevance matching       |
| **Parsing Engine**      | Docling (standalone service) | High-precision document extraction from PDF/DOCX uploads          |
| **AI Routing**          | LiteLLM                      | Model-agnostic inference — Gemini (default), Claude, ChatGPT, xAI |
| **Orchestration**       | Podman Compose               | Local containerized services — no Docker dependency               |

---

## 🤖 AI Model Configuration

Brass Tacks defaults to **Google Gemini** (`gemini-2.0-flash`) via [LiteLLM](https://github.com/BerriAI/litellm), a unified interface that routes to any major LLM provider. Swap models by changing a single environment variable.

### Supported Providers

| Provider                    | Model Example              | Env Variable        |
| --------------------------- | -------------------------- | ------------------- |
| **Google Gemini** (default) | `gemini/gemini-2.0-flash`  | `GEMINI_API_KEY`    |
| **Anthropic Claude**        | `claude-sonnet-4-20250514` | `ANTHROPIC_API_KEY` |
| **OpenAI ChatGPT**          | `gpt-4o`                   | `OPENAI_API_KEY`    |
| **xAI Grok**                | `xai/grok-3`               | `XAI_API_KEY`       |

### Switching Models

In `backend/.env`:

```env
# Default: Gemini
GEMINI_API_KEY=your-gemini-key

# To use Claude instead, add:
# ANTHROPIC_API_KEY=your-anthropic-key

# To use ChatGPT instead, add:
# OPENAI_API_KEY=your-openai-key

# To use xAI Grok instead, add:
# XAI_API_KEY=your-xai-key
```

LiteLLM automatically detects the available API key and routes inference accordingly. To force a specific model, set the `DEFAULT_MODEL` variable:

```env
DEFAULT_MODEL=gemini/gemini-2.0-flash
```

## 🚀 Getting Started

### Prerequisites

| Requirement    | Version | Notes                                                                                                                            |
| -------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **Podman**     | 4.0+    | Container runtime ([install guide](https://podman.io/docs/installation))                                                         |
| **AI API Key** | —       | At minimum, a [Gemini API key](https://aistudio.google.com/apikey) (free tier available) or [xAI API key](https://console.x.ai/) |

### Installation & Launch

**1. Clone the repository**

```bash
git clone https://github.com/your-username/tailorforge.git
cd tailorforge
```

**2. Configure local secrets**

Copy the example environment file:

```bash
cp .env.example .env
```

Open the `.env` file and insert your API key(s) (e.g. `GEMINI_API_KEY` or `XAI_API_KEY`). See [Security & Secrets Management](docs/SECURITY.md) for more details.

**3. Install & Run the Launcher**

Install the Brass Tacks launcher to your system's application menu/folder:

```bash
./install.sh
```

This will automatically:

- **macOS**: Install a standalone `BrassTacks.app` wrapper to `~/Applications` (accessible via Spotlight).
- **Linux**: Install a desktop launcher entry to `~/.local/share/applications/` and configure system menu shortcut.
- **Windows (WSL2)**: Guide you to create Start Menu and Desktop shortcuts using the helper script.

Double-click the Brass Tacks icon in your applications list to start the launcher!

Alternatively, you can run the backend services directly from the console at any time using:

```bash
./start.sh
```

Running the app launcher will:

- Verify your local Podman installation and initialize/start the Podman machine if running on macOS.
- Launch all 5 containerized services (Postgres, Qdrant, Docling Parser, FastAPI API gateway, Next.js frontend) in the background via Podman Compose.
- Automatically execute database schema migrations on startup.
- Perform automated HTTP health checks on the services.
- Open your default browser to **[http://localhost:3000](http://localhost:3000)**.

Simply follow the onboarding wizard on the screen to enter your identity, upload a reference resume, paste your career history, and select your configured API provider. No further terminal commands or local language runtimes (Python/Node.js) are required!

For a detailed walkthrough, including advanced configurations, troubleshooting, and vector database management, please refer to the [User Setup Guide](docs/USER_SETUP.md).

---

## 📡 Real-Time Pipeline (SSE)

Resume generation uses Server-Sent Events for live progress feedback during the AI pipeline:

```
GET /api/v1/generation/events/{run_id}
```

The frontend renders each pipeline stage in real time — parsing, semantic matching, drafting, validation — so you always know what's happening.

---

## 🔐 Security & Configuration

All data stays on your machine. There are no external analytics, no telemetry, no phone-home behavior.

For detailed guidance on API key management and authentication:

- [Security & Secrets Management](docs/SECURITY.md)
- [API Authentication Guide](docs/API_AUTH.md)

---

## 🛠 Development Protocols

- **No Boilerplate** — Reject generic CSS frameworks. The Forge theme uses bespoke design tokens with intentional color, typography, and spacing decisions.
- **Deterministic Validation** — Every AI-generated resume passes through a validation gate. If the output contains data the user never provided, it fails.
- **Anti-Homogenization** — Brass Tacks resumes don't look like they came from a template mill. Unique formatting, language, and structure per generation.
- **Zero Stubs** — No placeholder code, no `TODO` comments, no half-implemented features ship to `main`.

---

## 📁 Project Structure

```
tailorforge/
├── frontend/          # Next.js 15 App Router + Forge theme
├── backend/           # FastAPI + SQLAlchemy + LiteLLM
│   ├── app/           # Application modules
│   ├── alembic/       # Database migrations
│   └── tests/         # Backend test suite
├── parser_service/    # Docling document extraction service
├── compose.yaml       # Podman Compose — Postgres, Qdrant, Parser
└── docs/              # Security, auth, and reference documentation
```

---

## 🤝 Contributing

Brass Tacks is open-source and welcomes contributions. Please open an issue before submitting a PR for any non-trivial change.

---

## 📜 License

MIT — use it, fork it, make it yours.

**Attribution Notice:**
Personal download, use, and modification is unrestricted. Any integration into a larger product, ecosystem, or commercial offering (by anyone) requires attribution back to Michael Weed. See the `LICENSE` file for details.

---

<p align="center">
  <em>Built with precision. Powered by <strong>Gemini</strong>. Runs on <strong>your machine</strong>.</em>
</p>
