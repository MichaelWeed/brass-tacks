# Security & Secrets Management

This document outlines the protocols for managing sensitive configuration and secrets in your local Brass Tacks installation.

## 🔑 Required Secrets

| Key | Description |
|-----|-------------|
| `GEMINI_API_KEY` | Your Google AI Studio API key for resume generation. |
| `QDRANT_API_KEY` | API key for your local Qdrant instance (if authentication is enabled). |
| `SECRET_KEY` | A strong random string used to sign JWT tokens. Generate one with `openssl rand -hex 32`. |
| `DATABASE_URL` | Connection string for your local PostgreSQL database. |

## 🛡️ Secret Management

Brass Tacks is a **local, self-hosted application** — your machine IS the environment. All secrets are managed via a `.env` file in the project root.

### Setup

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
2. Fill in your own API keys and a strong `SECRET_KEY`.
3. **Never commit `.env` to version control.** It is already listed in `.gitignore`.

### Key Rotation

Periodically rotate your secrets, especially `SECRET_KEY` and any API keys:

- Generate a new `SECRET_KEY` with `openssl rand -hex 32` and update `.env`.
- Regenerate API keys in their respective dashboards (Google AI Studio, etc.) and update `.env`.
- Restart Brass Tacks after any key change.

## 🚫 Local Development Safety

- The `.env` file is explicitly ignored by `.gitignore` — never override this.
- For local Qdrant, ensure it is bound to `localhost` and not exposed to the network without an API key.
- If you fork or share this project, double-check that no secrets are included in your commits.

## 🔒 Bearer Authentication

Brass Tacks uses **JWT (JSON Web Tokens)** for Bearer authentication.

1. **Token Retrieval**: Call `POST /api/v1/auth/token` with valid credentials.
2. **Usage**: Include the token in the `Authorization` header:
   ```http
   Authorization: Bearer <your_jwt_token>
   ```
3. **Validation**: The backend validates the `sub` claim and ensures the token has not expired.
