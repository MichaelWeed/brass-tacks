# Contributing to Brass Tacks

First off, thank you for taking the time to contribute! 🎉

Brass Tacks is a free, open-source, local-first resume engineering application. These guidelines help ensure a smooth contribution process.

---

## 🛠️ Local Development Environment Setup

### Prerequisites
- **Python**: 3.13+
- **Node.js**: 20+
- **Container Runtime**: Podman (preferred) or Docker

### Steps
1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/tailorforge.git
   cd tailorforge
   ```

2. **Backend Setup**:
   Create a virtual environment and install dependencies:
   ```bash
   cd backend
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   ```
   Create a `.env` file using the example:
   ```bash
   cp .env.example .env
   ```

3. **Frontend Setup**:
   Install NPM dependencies:
   ```bash
   cd ../frontend
   npm install
   ```

4. **Run Services**:
   You can start the background containers and hosts using the built-in launcher script from the root workspace:
   ```bash
   ./start.sh
   ```

---

## 🧪 Testing

We value high-fidelity automated verification. Always run unit tests before submitting a Pull Request.

### Run Backend Tests (Pytest)
Ensure your virtual environment is active:
```bash
cd backend
pytest
```

---

## 🛡️ Coding Guidelines & Constraints

Before making architectural changes, please keep in mind the following immutable constraints (derived from `docs/PROJECT_VISION.md`):

1. **No Cloud Infrastructure**: No Terraform, Cloud Run, Cloud SQL, AWS, or GCP platform code. Brass Tacks runs entirely on the user's local machine.
2. **Zero Hallucination**: The resume generation prompts must restrict the LLM to only select and synthesize facts provided in the user's profile and brain dump. Do not allow the model to fabricate experiences.
3. **No Global Installs**: Always pin dependencies inside virtualenvs or local node_modules.
4. **Bespoke Theme Styles**: Do not introduce default CSS palettes or generic UI kit libraries. Follow the amber/obsidian styling tokens defined in `frontend/src/app/globals.css`.
