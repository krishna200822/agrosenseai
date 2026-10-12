
from __future__ import annotations

import base64
import binascii
import json
import re

import httpx
from fastapi import HTTPException
from pydantic import BaseModel, ConfigDict, Field

from . import config


class SoilInsight(BaseModel):
    model_config = ConfigDict(extra="ignore")

    apparentTexture: str | None = None
    visibleCharacteristics: list[str] = Field(default_factory=list)
    interpretation: str
    confidence: str = "low"
    hypotheses: list[str] = Field(default_factory=list)


class PlantInsight(BaseModel):
    model_config = ConfigDict(extra="ignore")

    possibleConditions: list[dict] = Field(default_factory=list)
    observedSymptoms: list[str] = Field(default_factory=list)
    alternatives: list[str] = Field(default_factory=list)
    verificationSteps: list[str] = Field(default_factory=list)
    prevention: list[str] = Field(default_factory=list)
    treatment: list[str] = Field(default_factory=list)
    lowConfidence: bool = True


def parse_data_url(data_url: str) -> tuple[str, bytes]:
    match = re.fullmatch(
        r"data:(image/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=\r\n]+)",
        data_url.strip(),
    )

    if not match:
        raise HTTPException(
            status_code=422,
            detail="Image must be a base64 data URL for JPEG, PNG, or WEBP.",
        )

    mime, encoded = match.groups()

    try:
        raw = base64.b64decode(encoded, validate=True)
    except (ValueError, binascii.Error):
        raise HTTPException(
            status_code=422,
            detail="The uploaded image data is invalid.",
        ) from None

    if len(raw) > config.MAX_IMAGE_MB * 1024 * 1024:
        raise HTTPException(
            status_code=413,
            detail=f"Image exceeds the {config.MAX_IMAGE_MB} MB limit.",
        )

    return mime, raw


async def _generate(
    parts: list[dict],
    *,
    temperature: float = 0.2,
) -> str:
    api_key = config.GEMINI_API_KEY
    model = config.GEMINI_MODEL

    if not api_key:
        raise HTTPException(
            status_code=503,
            detail=(
                "AI service is not configured. "
                "Check GEMINI_API_KEY in backend/.env and restart the server."
            ),
        )

    if not model:
        raise HTTPException(
            status_code=503,
            detail="GEMINI_MODEL is not configured.",
        )

    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"{model}:generateContent"
    )

    payload = {
        "contents": [
            {
                "role": "user",
                "parts": parts,
            }
        ],
        "generationConfig": {
            "temperature": temperature,
            "responseMimeType": "application/json",
        },
        "safetySettings": [
            {
                "category": "HARM_CATEGORY_HARASSMENT",
                "threshold": "BLOCK_MEDIUM_AND_ABOVE",
            },
            {
                "category": "HARM_CATEGORY_HATE_SPEECH",
                "threshold": "BLOCK_MEDIUM_AND_ABOVE",
            },
            {
                "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                "threshold": "BLOCK_MEDIUM_AND_ABOVE",
            },
            {
                "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
                "threshold": "BLOCK_MEDIUM_AND_ABOVE",
            },
        ],
    }

    try:
        async with httpx.AsyncClient(
            timeout=httpx.Timeout(45.0, connect=10.0)
        ) as client:
            response = await client.post(
                url,
                headers={"x-goog-api-key": api_key},
                json=payload,
            )

    except httpx.TimeoutException:
        raise HTTPException(
            status_code=504,
            detail="The AI provider took too long to respond. Try again.",
        ) from None

    except httpx.HTTPError:
        raise HTTPException(
            status_code=502,
            detail="Could not reach the AI provider. Check your connection.",
        ) from None

    if response.status_code >= 400:
        try:
            error_data = response.json()
            provider_message = (
                error_data.get("error", {}).get("message")
                or "Unknown provider error"
            )
        except (ValueError, AttributeError):
            provider_message = "Could not parse provider error."

        # Do not log the API key or the request headers.
        print(
            f"Gemini API error: HTTP {response.status_code}: "
            f"{provider_message}"
        )

        if response.status_code == 429:
            raise HTTPException(
                status_code=503,
                detail=(
                    "Gemini rate limit or quota reached. "
                    "Check your API quota and try again later."
                ),
            )

        if response.status_code in (401, 403):
            raise HTTPException(
                status_code=502,
                detail=(
                    "Gemini rejected the API key or access request. "
                    "Check the key, permissions, and model availability."
                ),
            )

        if response.status_code == 404:
            raise HTTPException(
                status_code=502,
                detail=(
                    "Gemini model or API endpoint was not found. "
                    "Verify GEMINI_MODEL in Google AI Studio."
                ),
            )

        raise HTTPException(
            status_code=502,
            detail=(
                f"Gemini API returned HTTP {response.status_code}. "
                "Check the backend terminal for details."
            ),
        )

    try:
        data = response.json()
        candidates = data.get("candidates", [])

        if not candidates:
            raise ValueError("No response candidates")

        content = candidates[0].get("content", {})
        response_parts = content.get("parts", [])

        text_parts = [
            part["text"]
            for part in response_parts
            if isinstance(part.get("text"), str)
        ]

        if not text_parts:
            raise ValueError("No text in response")

        return "\n".join(text_parts)

    except (ValueError, KeyError, IndexError, TypeError, AttributeError):
        raise HTTPException(
            status_code=502,
            detail=(
                "Gemini returned an empty or unexpected response. "
                "Check the model response and safety settings."
            ),
        ) from None


def _json_from_text(text: str) -> dict:
    try:
        value = json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", text, flags=re.S)

        if not match:
            raise HTTPException(
                status_code=502,
                detail="AI response was not valid JSON.",
            ) from None

        try:
            value = json.loads(match.group(0))
        except json.JSONDecodeError:
            raise HTTPException(
                status_code=502,
                detail="AI response was not valid JSON.",
            ) from None

    if not isinstance(value, dict):
        raise HTTPException(
            status_code=502,
            detail="AI response had an unexpected structure.",
        )

    return value


async def soil_insight(
    *,
    image_data_url: str | None,
    measurements: dict,
    farm: dict,
) -> SoilInsight:
    prompt = f"""You are an agricultural assistant.

Return JSON only with these keys:
- apparentTexture: string or null
- visibleCharacteristics: array of short strings
- interpretation: string
- confidence: low, moderate, or high
- hypotheses: array of strings

Rules:
- A photo cannot establish exact pH, EC, NPK, organic carbon,
  or micronutrient concentrations.
- Never invent measurements.
- Treat supplied measurements as user-provided, not verified facts.
- Describe soil texture from an image only as a tentative observation.
- Do not prescribe fertilizer quantities or pesticides.
- If no photo is supplied, apparentTexture must be null and
  visibleCharacteristics must be empty.
- Clearly explain limitations.

Farm details:
{json.dumps(farm, ensure_ascii=False)}

Supplied soil measurements:
{json.dumps(measurements, ensure_ascii=False)}
"""

    parts: list[dict] = [{"text": prompt}]

    if image_data_url:
        mime, raw = parse_data_url(image_data_url)
        parts.append(
            {
                "inline_data": {
                    "mime_type": mime,
                    "data": base64.b64encode(raw).decode("ascii"),
                }
            }
        )

    raw_text = await _generate(parts)

    try:
        result = SoilInsight.model_validate(_json_from_text(raw_text))
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=502,
            detail="AI response did not match the expected soil-analysis format.",
        ) from None

    if result.confidence not in {"low", "moderate", "high"}:
        result.confidence = "low"

    if not image_data_url:
        result.apparentTexture = None
        result.visibleCharacteristics = []

    return result


async def plant_insight(
    *,
    image_data_url: str,
    crop: str,
    growth_stage: str,
    symptoms: str,
) -> PlantInsight:
    mime, raw = parse_data_url(image_data_url)

    prompt = f"""You are a cautious crop-health triage assistant.

Return JSON only with these keys:
- possibleConditions: array of objects with name, kind, confidence
- observedSymptoms: array of strings
- alternatives: array of strings
- verificationSteps: array of strings
- prevention: array of strings
- treatment: array of strings
- lowConfidence: boolean

Each condition's kind must be disease, pest, nutrient, or abiotic.
Its confidence must be a number between 0 and 1.

Crop: {crop}
Growth stage: {growth_stage}
User-described symptoms: {symptoms or "not provided"}

Rules:
- Examine the image without claiming certainty.
- If evidence is weak, return low confidence and plausible alternatives.
- Do not invent laboratory test results.
- Do not prescribe pesticide products, doses, or application rates.
- Prefer safe cultural and integrated pest management advice.
- Recommend verification by a local agricultural expert before
  chemical treatment.
"""

    raw_text = await _generate(
        [
            {"text": prompt},
            {
                "inline_data": {
                    "mime_type": mime,
                    "data": base64.b64encode(raw).decode("ascii"),
                }
            },
        ]
    )

    try:
        result = PlantInsight.model_validate(_json_from_text(raw_text))
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=502,
            detail="AI response did not match the expected plant-health format.",
        ) from None

    safe_conditions = []

    for item in result.possibleConditions[:5]:
        if not isinstance(item, dict):
            continue

        try:
            confidence = float(item.get("confidence", 0.0))
            kind = item.get("kind")

            if kind not in {"disease", "pest", "nutrient", "abiotic"}:
                kind = "abiotic"

            safe_conditions.append(
                {
                    "name": str(
                        item.get("name", "Possible condition")
                    )[:160],
                    "kind": kind,
                    "confidence": max(0.0, min(1.0, confidence)),
                }
            )

        except (TypeError, ValueError):
            continue

    result.possibleConditions = safe_conditions

    if (
        not safe_conditions
        or max(
            (item["confidence"] for item in safe_conditions),
            default=0.0,
        ) < 0.55
    ):
        result.lowConfidence = True

    return result
