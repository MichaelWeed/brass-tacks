# Brass Tacks Local User Setup & Operations Guide

Welcome to **Brass Tacks**, a free, local-first, open-source resume engineering engine. This guide provides detailed setup, operational, and troubleshooting instructions to run the entire multi-service stack inside a rootless containerized environment using **Podman Compose**.

---

## 📋 1. Prerequisites & Installation

Brass Tacks runs completely locally on your computer. You do not need to install Node.js, Python, PostgreSQL, Qdrant, or any compilers. All services run containerized.

### System Requirements
*   **Operating System**: macOS (Intel or Apple Silicon), Linux (Ubuntu, Debian, Fedora, etc.), or Windows (WSL2).
*   **Disk Space**: At least 10 GB free (Docling and PyTorch wheels are substantial).
*   **Memory**: Minimum 8 GB RAM (16 GB recommended).

### Install Podman

1.  **macOS**:
    Install via Homebrew:
    ```bash
    brew install podman
    brew install podman-compose
    ```
2.  **Linux**:
    Install via your package manager:
    ```bash
    # Ubuntu/Debian
    sudo apt-get update
    sudo apt-get install -y podman podman-compose
    ```
3.  **Verify Installation**:
    ```bash
    podman --version
    podman compose version
    ```

### Initializing the Podman VM (macOS & Windows WSL)

On macOS and Windows, Podman runs containers inside a rootless Linux helper virtual machine. You must initialize and start this VM:

```bash
# Initialize the virtual machine
podman machine init

# Start the machine
podman machine start
```

---

## 🔑 2. Secrets & Environment Configuration

All configurations are handled via a local `.env` file in the root workspace. This file is excluded from Git to prevent secret leakage.

### Step 1: Copy the Template
```bash
cp .env.example .env
```

### Step 2: Configure Environment Variables
Open the `.env` file and configure the parameters:

*   **`GEMINI_API_KEY`**: Your Google AI Studio key (default provider). Get one for free at [Google AI Studio](https://aistudio.google.com/app/apikey).
*   **`XAI_API_KEY`**: Your xAI key (if using Grok models). Get one at [xAI Console](https://console.x.ai/).
*   **`OPENAI_API_KEY`**: Your OpenAI key (if using ChatGPT models). Get one at [OpenAI Platform](https://platform.openai.com/).
*   **`ANTHROPIC_API_KEY`**: Your Anthropic key (if using Claude models). Get one at [Anthropic Console](https://console.anthropic.com/).
*   **`SECRET_KEY`**: A strong random hex string used to sign local JWT tokens. Generate a secure key in your terminal:
    ```bash
    openssl rand -hex 32
    ```
    Paste the output as the value for `SECRET_KEY` (e.g., `SECRET_KEY=e83a4c52...`).
*   **`ENV`**: Set to `development` for verbose logs or `production` to enforce strict API key validation (production will crash at boot if using default/mock signing keys).

---

## 🚀 3. One-Click Launch

Start the entire containerized stack with a single command from the project root:

```bash
./start.sh
```

### What happens under the hood?
1.  **Environment Check**: Verifies Podman is installed and automatically starts the macOS Podman machine if it is idle.
2.  **Compose Up**: Launches the 5 containerized services defined in `compose.yaml`:
    *   `tailorforge-db`: PostgreSQL 16 Alpine database container for user metadata and resume drafts.
    *   `tailorforge-qdrant`: Qdrant vector database container for semantic indexing of your master career profile.
    *   `tailorforge-parser`: Docling parsing microservice for extracting PDF and DOCX uploads.
    *   `tailorforge-api`: FastAPI backend container (runs Alembic schema migrations on boot before spawning Uvicorn).
    *   `tailorforge-web`: Next.js 15 frontend container (serves the Forge Theme UI dashboard).
3.  **HTTP Health Checks**: Polls both the Next.js port (`3000`) and the API gateway proxy to verify database connections before opening the browser.
4.  **Browser Access**: Opens your default browser to **[http://localhost:3000](http://localhost:3000)**.

### Stopping the Stack
To shut down all services securely and clean up resources, press **`Ctrl+C`** in the terminal where `./start.sh` is running. The script will intercept the interrupt signal, run `podman compose down`, and exit cleanly.

---

## 🛠️ 4. Advanced Operations & Database Commands

Sometimes you may need to interact directly with the running containers or perform database schema migrations.

### Accessing Logs
To view logs for all running services:
```bash
podman compose logs -f
```
Or for a specific container (e.g. backend API):
```bash
podman logs -f tailorforge-api
```

### Inspecting Database Migrations (Alembic)
Allembic schema migrations run automatically when the `tailorforge-api` container starts. If you need to inspect or modify migrations manually:

```bash
# Check current migration status
podman exec -it tailorforge-api alembic current

# View database migration history
podman exec -it tailorforge-api alembic history

# Force run pending migrations
podman exec -it tailorforge-api alembic upgrade head
```

### Vector Index Management (Qdrant)
Semantic search indexing uses Qdrant. Points selectors are automatically purged when you upload a new master profile to avoid state drift.
*   **Web Dashboard**: You can inspect collections, point structures, and indices in your browser via Qdrant's built-in web UI at **[http://localhost:6333/dashboard](http://localhost:6333/dashboard)**.

---

## ❌ 5. Troubleshooting & FAQs

### Problem: Podman VM out of disk space or memory (macOS/Windows)
During container builds, PyTorch and Docling machine learning libraries are pulled. This can exceed the default Podman machine limits and fail.
*   **Fix**: Stop the machine, increase the limits, and restart:
    ```bash
    podman machine stop
    # Set to at least 4 CPU, 4GB RAM, and 30GB disk space
    podman machine set --cpus 4 --memory 4096 --disk-size 30
    podman machine start
    ```

### Problem: Port 3000, 8000, or 5432 is already in use
If another application (e.g., local PostgreSQL) is running on your machine, the containerized startup will fail.
*   **Fix**: Stop any local servers running on those ports, or adjust the port mapping in `compose.yaml` (under `ports` section) to map to free host ports.

### Problem: API gateway fails to start with "PRODUCTION SECRET KEY MUST BE EXPLICITLY CONFIGURED!"
*   **Fix**: You have `ENV=production` set in your `.env` file but left `SECRET_KEY` set to `"super-secret-dev-key"`. Generate a unique key using `openssl rand -hex 32` and update your `.env` file.
