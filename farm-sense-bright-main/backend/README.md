# AgroSense AI Backend

Python FastAPI backend designed to match the current AgroSense AI frontend API client.

## Features

- `POST /soil/analyze` — validates supplied soil inputs, asks Gemini for cautious image/text interpretation, creates a structured report, and stores it in SQLite.
- `GET /soil/{analysis_id}` — fetches a saved report.
- `GET /soil/history` — returns recent reports in the frontend's expected shape.
- `GET /crops/recommendations` — returns starter crop catalogue entries, optionally filtered by an analysis ID's season.
- `POST /plant-health/analyze` — sends a crop image and user-provided context to Gemini for cautious triage.
- `GET /health` — reports backend status and whether a Gemini key is configured.
- Interactive API documentation at `/docs`.

## 1. Requirements

Install Python 3.11 or newer from https://www.python.org/downloads/ and make sure `python` and `pip` are available in the terminal.

## 2. Setup on Windows (PowerShell)

Open this `backend` folder in VS Code, then choose **Terminal → New Terminal** and run:

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
Copy-Item .env.example .env
```

If PowerShell blocks activation, run the server without activating the environment by using `.venv\Scripts\python.exe -m pip install -r requirements.txt` and `.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000`.

## 3. Configure Gemini

1. Get a Gemini API key from Google AI Studio: https://aistudio.google.com/apikey
2. Open `backend/.env`.
3. Set `GEMINI_API_KEY=your_real_key_here`.
4. Keep this key only in the backend `.env`. Never put it in React/Vite environment variables or commit `.env` to GitHub.

Without a key, health checks, crop recommendations and history can still work, but the two AI analysis endpoints intentionally return HTTP 503 rather than pretending an AI analysis occurred.

## 4. Start the backend

From the `backend` folder:

```powershell
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Open these URLs:

- API status: http://127.0.0.1:8000/health
- Interactive API docs: http://127.0.0.1:8000/docs

SQLite is created automatically at `backend/data/agrosense.db`.

## 5. Connect the frontend

In the **frontend project root** (the folder containing `package.json`), create a `.env` file containing:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

Restart the frontend dev server after changing `.env`:

```powershell
npm run dev
```

The frontend currently uses these endpoints and this backend implements them:

- `POST /soil/analyze`
- `GET /soil/{id}`
- `GET /soil/history`
- `GET /crops/recommendations?analysis={id}`
- `POST /plant-health/analyze`

## Important limitations

- This is an initial backend, not a validated agronomy decision system.
- Soil photos do not measure exact pH, EC, NPK, organic carbon, or micronutrients. Numeric values are passed through from user-provided measurements.
- Fertilizer quantities and irrigation depths are intentionally not calculated. Add verified, location-specific agronomic data and validated calculation rules before providing them.
- Crop catalogue entries are a starter list and should be reviewed/expanded with local agricultural university or ICAR guidance before real-world use.
- The uploaded report's filename is received from the frontend, but the current frontend does not send report bytes; PDF/OCR ingestion is not implemented.
- This starter does not implement user accounts or per-user access control. Do not expose it publicly with private farm data until authentication, authorization, rate limiting and privacy controls are added.
- SQLite stores the report JSON including its optional image data URL. For a production service, move image storage to private object storage and store only an object key in the database.
