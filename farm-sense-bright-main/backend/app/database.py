from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from .config import DATABASE_PATH


def connect() -> sqlite3.Connection:
    DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DATABASE_PATH, timeout=15)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with connect() as conn:
        conn.execute("""CREATE TABLE IF NOT EXISTS soil_analyses (
            id TEXT PRIMARY KEY,
            created_at TEXT NOT NULL,
            state TEXT NOT NULL,
            district TEXT NOT NULL,
            season TEXT NOT NULL,
            area REAL,
            area_unit TEXT NOT NULL,
            source_type TEXT NOT NULL,
            payload_json TEXT NOT NULL
        )""")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_soil_analyses_created_at ON soil_analyses(created_at DESC)")


def save_analysis(analysis: dict) -> None:
    farm = analysis["farm"]
    with connect() as conn:
        conn.execute(
            """INSERT OR REPLACE INTO soil_analyses
            (id, created_at, state, district, season, area, area_unit, source_type, payload_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (analysis["id"], analysis["createdAt"], farm["state"], farm["district"], farm["season"],
             farm.get("area"), farm["areaUnit"], analysis.get("_sourceType", "none"),
             json.dumps({k: v for k, v in analysis.items() if not k.startswith("_")}, ensure_ascii=False)),
        )


def get_analysis(analysis_id: str) -> dict | None:
    with connect() as conn:
        row = conn.execute("SELECT payload_json FROM soil_analyses WHERE id = ?", (analysis_id,)).fetchone()
    return json.loads(row["payload_json"]) if row else None


def get_history() -> list[dict]:
    with connect() as conn:
        rows = conn.execute("""SELECT id, created_at, state, district, season, source_type
            FROM soil_analyses ORDER BY created_at DESC LIMIT 100""").fetchall()
    result = []
    for row in rows:
        source = row["source_type"]
        measurement_kind = source if source in {"lab", "sensor", "image_only"} else "none"
        result.append({
            "id": row["id"],
            "date": row["created_at"][:10],
            "farm": f"{row['district']} farm" if row["district"] else "Farm",
            "location": ", ".join(x for x in [row["district"], row["state"]] if x),
            "measurements": measurement_kind,
            "status": "completed",
        })
    return result
