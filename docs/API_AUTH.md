# API Authentication Guide

Brass Tacks uses a stateless Bearer Authentication system based on JWT. This guide explains how to authenticate your requests.

## 🔑 Generating a Token

To obtain an access token, send a request to the authentication endpoint:

**Endpoint**: `POST /api/v1/auth/login`
**Payload** (Form Data):
```form-data
username: your_email@example.com
password: your_password
```

**Response**:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

## 🛡️ Using the Token

Include the access token in the headers of every request that requires authentication:

```bash
curl -X GET "http://localhost:8000/api/v1/users/me" \
     -H "Authorization: Bearer <access_token>"
```

## 📡 Authenticating SSE Streams

Server-Sent Events (`EventSource`) in browsers do not natively support custom headers. Brass Tacks handles this via a verified `run_id` UUID mechanism for specific generation events.

**Current Implementation**:
- `GET /api/v1/generation/events/{run_id}`: Gated by the existence and ownership of the `run_id`.

## ⚙️ Configuration

The token expiration and signing algorithm are configured in `backend/app/core/config.py`.

- `ACCESS_TOKEN_EXPIRE_MINUTES`: Default is 10080 minutes (1 week).
- `ALGORITHM`: HS256.

## 📡 SSE Authentication Fallback
For Server-Sent Events (SSE) where custom headers are difficult to set in native `EventSource`, the API supports a token fallback via a query parameter:

```http
GET /api/v1/generation/events/{run_id}?token=<your_jwt_token>
```

The `get_current_user` dependency automatically checks for the `token` parameter if the `Authorization` header is missing.
