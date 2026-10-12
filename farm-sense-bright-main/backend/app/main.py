from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from .config import CORS_ORIGINS
from .database import get_analysis, get_history, init_db, save_analysis
from .gemini import plant_insight, soil_insight
from .schemas import (
    CropRecommendation, DataReference, FertilizerOption, FertilizerRecommendation,
    FarmSummary, HistoryItem, ImageObservations, IrrigationPlan, MeasurementOut,
    PestConcern, PestPlan, PlantDiagnosis, PlantHealthRequest, SoilAnalysisRequest,
    SoilAnalysisResponse, WeeklyWater,
)
from .crops import crop_models


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="AgroSense AI API",
    description="Backend for soil analysis, crop recommendations and plant-health triage. AI routes require a Gemini API key.",
    version="1.0.0",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)


@app.get("/")
def root():
    return {"name": "AgroSense AI API", "status": "running", "docs": "/docs"}


@app.get("/health")
def health():
    from .config import GEMINI_API_KEY, GEMINI_MODEL
    return {"status": "ok", "aiConfigured": bool(GEMINI_API_KEY), "model": GEMINI_MODEL}


def _measurement(value: float | None, unit: str, source_type: str) -> dict:
    if value is None:
        source = None
    elif source_type == "laboratory":
        source = "laboratory"
    elif source_type == "sensor":
        source = "sensor"
    else:
        source = "user_input"
    return {"value": value, "unit": unit, "source": source}


def _crop_pests(crops: list[CropRecommendation]) -> PestPlan:
    # General scouting guidance only. These are not diagnoses of a particular field.
    known = {
        "wheat": ("Rusts and aphids", "Look for orange/yellow pustules, leaf discoloration or aphid colonies."),
        "chickpea": ("Pod borer and wilt", "Inspect flowers and pods for feeding damage; check for wilting patches."),
        "soybean": ("Defoliators and stem/girdle pests", "Inspect leaf undersides, stems and defoliation patterns."),
        "maize": ("Fall armyworm and stem borers", "Look for window-pane feeding, frass and whorl damage."),
        "mustard": ("Mustard aphid", "Check tender shoots and inflorescences for aphid colonies."),
        "rice": ("Stem borer and planthoppers", "Inspect deadhearts, whiteheads and insects near the plant base."),
        "green-gram": ("Whitefly and pod borer", "Inspect leaf undersides and pods for insects or feeding damage."),
    }
    concerns = []
    for crop in crops[:3]:
        name, symptoms = known.get(crop.id, ("Crop-specific pests", "Scout plants and compare symptoms with local extension guidance."))
        concerns.append(PestConcern(name=name, crop=crop.name, symptoms=symptoms))
    return PestPlan(
        concerns=concerns,
        prevention=["Use locally recommended varieties and healthy seed.", "Rotate crops where agronomically appropriate.", "Monitor the field regularly and keep records of pest pressure."],
        ipm=["Scout fields before treatment.", "Use traps and biological controls where recommended locally.", "Treat only when local economic thresholds and expert guidance support intervention."],
        biological=["Consider locally approved biological controls when suitable.", "Conserve beneficial insects and avoid unnecessary broad-spectrum spraying."],
        chemical_note="No pesticide product or dose is prescribed by this endpoint. Use only locally registered products and follow the current label; consult a local agricultural extension officer.",
    )


@app.post("/soil/analyze", response_model=SoilAnalysisResponse)
async def analyze_soil(request: SoilAnalysisRequest):
    m = request.measurements
    farm = request.farm
    # Gemini is used for cautious image/text interpretation only. Numerical measurements come from user input.
    insight = await soil_insight(
        image_data_url=request.image.data_url if request.image else None,
        measurements=m.model_dump(by_alias=True),
        farm=farm.model_dump(by_alias=True),
    )
    crops = crop_models(farm.season, farm.crop_category)
    source_type = m.source_type
    values = {
        "ph": _measurement(m.ph, "pH units", source_type),
        "ec": _measurement(m.ec, "dS/m", source_type),
        "nitrogen": _measurement(m.nitrogen, "kg/ha", source_type),
        "phosphorus": _measurement(m.phosphorus, "kg/ha", source_type),
        "potassium": _measurement(m.potassium, "kg/ha", source_type),
        "organicCarbon": _measurement(m.organic_carbon, "%", source_type),
        "zinc": _measurement(m.zinc, "mg/kg", source_type),
        "iron": _measurement(m.iron, "mg/kg", source_type),
        "sulphur": _measurement(m.sulphur, "mg/kg", source_type),
    }
    missing_labels = {
        "ph": "pH", "ec": "Electrical conductivity", "nitrogen": "Nitrogen",
        "phosphorus": "Phosphorus", "potassium": "Potassium", "organicCarbon": "Organic carbon",
    }
    missing = [label for key, label in missing_labels.items() if values[key]["value"] is None]
    if not m.texture or m.texture == "unknown":
        missing.append("Soil texture")
    if not request.image:
        missing.append("Soil photograph")
    if request.report_file_name:
        missing.append("Soil report contents (filename supplied only; document extraction is not implemented)")

    constraints: list[str] = []
    if m.ph is not None and (m.ph < 5.5 or m.ph > 8.5):
        constraints.append("The entered pH is outside a broad range commonly suitable for many field crops. Confirm crop-specific interpretation with a soil laboratory or local agronomist.")
    if m.ec is not None and m.ec >= 2:
        constraints.append("The entered EC may indicate salinity concerns depending on the measurement method and crop. Verify the test method and crop-specific threshold.")
    any_npk = any(v is not None for v in (m.nitrogen, m.phosphorus, m.potassium))
    fertilizer = FertilizerRecommendation(
        constraints=constraints,
        requirements=(["Use the crop-specific soil-test recommendation to balance N, P and K."] if any_npk else ["Obtain a soil test before drawing nutrient conclusions."]) + ["Maintain organic matter using locally appropriate residue and compost practices."],
        options=[
            FertilizerOption(name="Farmyard manure / compost", purpose="Organic matter and gradual nutrient contribution", quantity=None, timing="Timing depends on crop and local recommendations", method="Use mature material and incorporate as locally advised"),
            FertilizerOption(name="Nitrogen fertilizer options", purpose="Nitrogen supply when required by the soil test and crop plan", quantity=None, timing="Crop- and stage-specific", method="Follow local soil-test and crop recommendations"),
            FertilizerOption(name="Phosphorus / potassium sources", purpose="Supply only nutrients required by the soil test", quantity=None, timing="Crop- and soil-specific", method="Follow local recommendations and product labels"),
        ],
        cautions=["No fertilizer dose is calculated by this starter backend.", "Use units and recommendations from the soil-test laboratory and local agricultural university.", "Avoid fertilizer application immediately before heavy rainfall or into waterlogged soil."],
        dosage_available=False,
        explanation="This version does not calculate fertilizer quantities. A reliable dose needs the crop, target yield, verified soil-test method, local recommendation tables and fertilizer grade.",
    )
    irrigation = IrrigationPlan(
        summary=("Rainfed field: prioritize soil-moisture conservation and plan around rainfall." if farm.irrigation == "rainfed" else "Irrigation is available; scheduling depends on crop stage, soil moisture and weather."),
        method=("Water-saving irrigation methods may help where suitable; confirm crop and field compatibility." if farm.irrigation == "limited" else "Choose an irrigation method based on crop, field layout, soil and available water."),
        estimate_available=False,
        missing_for_estimate=["Crop and growth stage", "Local weather / rainfall", "Measured soil moisture", "Field-specific water-holding information"],
        weekly=[WeeklyWater(week=f"W{i}", mm=None) for i in range(1, 7)],
        tips=["Check soil moisture before irrigating.", "Use rainfall forecasts and critical crop growth stages when scheduling.", "Reduce runoff and repair leaks; use mulch where suitable."],
    )
    warnings = ["AI-assisted interpretation is not a laboratory test or a confirmed diagnosis.", "Exact pH, EC and nutrient values are taken only from supplied measurements; the photo does not determine them.", "Fertilizer quantities and irrigation depths are not calculated by this starter backend."]
    if source_type == "none":
        warnings.append("No laboratory or sensor source was selected. Entered values, if any, are treated as user input and are not independently verified.")
    if not crops:
        warnings.append("No crop in the starter catalogue matches the selected season and category. Expand the catalogue with locally verified crop data.")

    analysis_id = str(uuid4())
    created_at = datetime.now(timezone.utc).isoformat()
    result = SoilAnalysisResponse(
        id=analysis_id,
        created_at=created_at,
        mode="production",
        image_data_url=request.image.data_url if request.image else None,
        image_observations=ImageObservations(apparent_texture=insight.apparentTexture, visible_characteristics=insight.visibleCharacteristics),
        interpretation=insight.interpretation,
        confidence=insight.confidence if not missing else "low" if len(missing) >= 4 else insight.confidence,
        measurements={key: MeasurementOut.model_validate(value) for key, value in values.items()},
        texture=m.texture or insight.apparentTexture,
        missing_inputs=missing,
        warnings=warnings,
        hypotheses=insight.hypotheses,
        crops=crops,
        fertilizer=fertilizer,
        irrigation=irrigation,
        pests=_crop_pests(crops),
        farm=FarmSummary(state=farm.state, district=farm.district, season=farm.season, area=farm.area, area_unit=farm.area_unit),
        references=[DataReference(title="Soil Health Card Scheme, Government of India", url="https://soilhealth.dac.gov.in/"), DataReference(title="Indian Council of Agricultural Research", url="https://icar.org.in/")],
    )
    payload = result.model_dump(by_alias=True, mode="json")
    payload["_sourceType"] = "lab" if source_type == "laboratory" else "sensor" if source_type == "sensor" else "image_only" if request.image else "none"
    save_analysis(payload)
    return result


@app.get("/soil/history", response_model=list[HistoryItem])
def soil_history():
    return get_history()


@app.get("/soil/{analysis_id}", response_model=SoilAnalysisResponse)
def soil_by_id(analysis_id: str):
    result = get_analysis(analysis_id)
    if not result:
        raise HTTPException(status_code=404, detail="Soil analysis not found.")
    return result


@app.get("/crops/recommendations", response_model=list[CropRecommendation])
def crop_recommendations(analysis: str | None = Query(default=None)):
    if analysis:
        record = get_analysis(analysis)
        if not record:
            raise HTTPException(status_code=404, detail="Soil analysis not found.")
        farm = record.get("farm", {})
        # Respect the original analysis season. Category filtering can be applied in the UI.
        return crop_models(farm.get("season"))
    return crop_models()


@app.post("/plant-health/analyze", response_model=PlantDiagnosis)
async def analyze_plant(request: PlantHealthRequest):
    insight = await plant_insight(image_data_url=request.image_data_url, crop=request.crop, growth_stage=request.growth_stage, symptoms=request.symptoms)
    return PlantDiagnosis(
        id=str(uuid4()),
        mode="production",
        possible_conditions=insight.possibleConditions,
        observed_symptoms=insight.observedSymptoms,
        alternatives=insight.alternatives,
        verification_steps=insight.verificationSteps,
        prevention=insight.prevention,
        treatment=insight.treatment,
        low_confidence=insight.lowConfidence,
    )
