# AgroSense AI

AI-assisted agriculture frontend for soil analysis, crop recommendations, fertilizer planning, irrigation guidance, and plant-health workflows.

## Requirements

- Node.js (LTS) and npm, or Bun

## Run locally with npm

```sh
npm install
npm run dev
```

Open the local URL printed by Vite in your terminal.

## Available scripts

```sh
npm run dev      # Start the development server
npm run build    # Build the application
npm run lint     # Run ESLint
npm test         # Run tests
```

## API configuration

The frontend can use a separate backend through `VITE_API_BASE_URL`. Configure it in a local `.env` file when the backend is available. Never put AI-provider secrets in frontend environment variables; keep them on the backend. Without a configured backend, the application uses its demo service layer.

## Project status

This repository currently contains the frontend and demo API services. A production AI backend and persistent database must be configured separately.

## FastAPI backend

A Python backend is included in the `backend/` directory. See `backend/README.md` for setup instructions. In short:

1. Create a Python virtual environment in `backend/` and install `backend/requirements.txt`.
2. Copy `backend/.env.example` to `backend/.env` and set `GEMINI_API_KEY`.
3. Run `python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000` from the `backend/` directory.
4. Copy the root `.env.example` to `.env` in the frontend project root and restart `npm run dev`.

Never commit `.env` files or expose `GEMINI_API_KEY` in the frontend.
