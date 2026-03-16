# Clinical NLP Platform

A full-stack platform for automated analysis of clinical reports. Upload TXT or PDF reports, and the system extracts medical conditions (with ICD-10 codes), severity assessment, and a concise patient summary — powered by OpenAI.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Browser (: 3000)                  │
│              React + MUI + Vite frontend             │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP (localhost:8080)
┌──────────────────────▼──────────────────────────────┐
│              FastAPI backend (: 8080)                │
│   auth · document upload · OpenAI · result store     │
└──────┬──────────────────────────┬───────────────────┘
       │ S3 API (: 9000)          │ DynamoDB API (: 8000)
┌──────▼──────┐           ┌───────▼──────────┐
│    MinIO    │ ──webhook──▶  DynamoDB Local  │
│  (: 9000/   │ (PUT event) │  users / files  │
│    9001)    │             │  document_results│
└─────────────┘             └──────────────────┘
```

**Flow:** User uploads a file → stored in MinIO → MinIO fires a webhook to the backend → backend calls OpenAI → structured result persisted in DynamoDB → frontend polls and displays results.

---

## Tech Stack

| Layer       | Technology                              |
|-------------|-----------------------------------------|
| Frontend    | React 19, Vite, MUI 7, Tailwind CSS 4   |
| Backend     | Python 3.11, FastAPI, Uvicorn           |
| AI          | Ollama (local LLM — free, no API key)   |
| Storage     | MinIO (S3-compatible object store)      |
| Database    | DynamoDB Local                          |
| Container   | Docker, Docker Compose                  |

---

## Quickstart

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (includes Docker Compose)
- [Ollama](https://ollama.com) installed and running on your machine

### 1 — Install Ollama and pull a model

```bash
# Install: https://ollama.com/download
# Then pull the model (one-time, ~2 GB):
ollama pull llama3.2
```

### 2 — Configure environment

```bash
cp .env.example .env   # defaults are fine — no API key needed
```

### 3 — Start everything

```bash
docker compose up --build
```

First run builds the images (~2–3 min). Subsequent starts take ~30 s.

### 3 — Open the app

| Service          | URL                                      |
|------------------|------------------------------------------|
| Frontend         | http://localhost:3000                    |
| API (Swagger UI) | http://localhost:8080/docs               |
| MinIO Console    | http://localhost:9001  (minio / minio123)|
| DynamoDB Admin   | http://localhost:8001                    |

---

## API Reference

Base URL: `http://localhost:8080`

### Auth

| Method | Path      | Body                                     | Description          |
|--------|-----------|------------------------------------------|----------------------|
| POST   | /signup   | `{username, email, password}`            | Create account       |
| POST   | /login    | `{username, password}`                   | Authenticate user    |

### Documents

| Method | Path                    | Description                                     |
|--------|-------------------------|-------------------------------------------------|
| POST   | /document/upload        | Upload TXT or PDF (`multipart/form-data`)       |
| GET    | /document/              | List all uploaded documents                     |
| POST   | /document/process       | MinIO webhook (called automatically on upload)  |
| GET    | /document/result?uuid=  | Fetch structured analysis result                |

Full interactive docs at `/docs`.

---

## Project Structure

```
clinical-nlp-platform/
├── backend/
│   ├── app/
│   │   ├── main.py           # FastAPI app, CORS, startup (bucket + table init)
│   │   ├── config.py         # All settings from environment variables
│   │   ├── auth.py           # bcrypt password hashing
│   │   ├── models.py         # Pydantic models
│   │   ├── storage.py        # Boto3 S3 + DynamoDB clients
│   │   ├── openai.py         # OpenAI function-calling wrapper
│   │   ├── routers/
│   │   │   ├── user.py       # /signup  /login
│   │   │   └── document.py   # /document/* endpoints
│   │   └── document/
│   │       └── download.py   # Read TXT/PDF from S3
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── context/UserContext.jsx
│   │   └── components/
│   │       ├── Navbar.jsx
│   │       ├── Login/Login.jsx
│   │       ├── Signup/Signup.jsx
│   │       ├── Dashboard/Dashboard.jsx
│   │       └── Results/ResultScreen.jsx
│   ├── nginx.conf
│   ├── package.json
│   ├── vite.config.js
│   └── Dockerfile
├── docker-compose.yml
├── .env.example
├── .gitignore
└── README.md
```

---

## Local Development (without Docker)

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Start infrastructure only
docker compose up dynamodb-local minio -d

export OPENAI_API_KEY=sk-...
uvicorn app.main:app --host 0.0.0.0 --port 8080 --reload
```

### Frontend

```bash
cd frontend
npm install

# Create a local env file
echo "VITE_API_BASE_URL=http://localhost:8080" > .env

npm run dev   # http://localhost:5173
```

The Vite dev server proxies `/login`, `/signup`, and `/document/*` to the backend automatically (see `vite.config.js`), so you can also omit `VITE_API_BASE_URL` and it will use relative URLs.

---

## How It Works

1. **Upload** — A user uploads a `.txt` or `.pdf` file via the dashboard. The backend stores the file in MinIO with custom metadata (`uuid`, `uploader`, `filename`) and records it in DynamoDB with `status: uploaded`.

2. **Webhook trigger** — MinIO is configured to send a `PUT` event webhook to the backend at `/document/process` when a new object lands in the `uploads` bucket.

3. **OpenAI analysis** — The backend downloads the file, sends the text to `gpt-4o-mini` using function calling, and receives a structured JSON response containing:
   - `summary` — 100-word clinical summary
   - `conditions` — list of `{name, code}` objects (ICD-10 codes where available)
   - `severity` — `mild`, `moderate`, or `severe`

4. **Persistence** — The result is written to the `document_results` table in DynamoDB, and the file record is updated to `status: processed`.

5. **Result view** — The frontend polls `/document/result?uuid=...` and renders the structured analysis.

---

## Troubleshooting

**Webhook not firing**
MinIO must be able to reach `http://backend:8080`. Both services share the same Docker network — confirm with `docker compose ps`. Also verify the event is registered in MinIO Console → Events.

**DynamoDB tables missing**
Tables are created automatically on backend startup via the `lifespan` hook. If the backend started before DynamoDB was ready, restart it: `docker compose restart backend`.

**Ollama errors**
Confirm Ollama is running (`ollama serve`) and the model is pulled (`ollama pull llama3.2`). Check backend logs: `docker compose logs backend`. The backend reaches Ollama at `host.docker.internal:11434` — this works on Mac and Windows automatically.

**Frontend shows blank/no data**
Open browser DevTools → Network. Ensure requests to `http://localhost:8080` succeed (not blocked by CORS or network). CORS is configured to allow `http://localhost:3000`.
