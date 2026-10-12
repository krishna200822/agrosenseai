from __future__ import annotations

from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, field_validator


def to_camel(value: str) -> str:
    first, *rest = value.split("_")
    return first + "".join(part.capitalize() for part in rest)


class APIModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, extra="ignore")


Season = Literal["kharif", "rabi", "zaid"]
Category = Literal["cereal", "pulse", "oilseed", "vegetable", "any"]
WaterNeed = Literal["low", "medium", "high"]
Provenance = Literal["laboratory", "sensor", "image_observation", "ai_hypothesis", "user_input"]


class SoilImage(APIModel):
    name: str = Field(min_length=1, max_length=255)
    data_url: str = Field(min_length=1)


class SoilMeasurements(APIModel):
    source_type: Literal["laboratory", "sensor", "none"] = "none"
    ph: float | None = None
    ec: float | None = None
    nitrogen: float | None = None
    phosphorus: float | None = None
    potassium: float | None = None
    organic_carbon: float | None = None
    texture: Literal["sandy", "loamy_sand", "sandy_loam", "loam", "silt_loam", "clay_loam", "clay", "unknown"] | None = None
    zinc: float | None = None
    iron: float | None = None
    sulphur: float | None = None

    @field_validator("ph")
    @classmethod
    def valid_ph(cls, value: float | None) -> float | None:
        if value is not None and not 0 <= value <= 14:
            raise ValueError("pH must be between 0 and 14")
        return value

    @field_validator("ec", "nitrogen", "phosphorus", "potassium", "organic_carbon", "zinc", "iron", "sulphur")
    @classmethod
    def nonnegative_measurement(cls, value: float | None) -> float | None:
        if value is not None and value < 0:
            raise ValueError("Soil measurements cannot be negative")
        return value


class FarmDetails(APIModel):
    country: str = Field(default="India", max_length=100)
    state: str = Field(min_length=1, max_length=100)
    district: str = Field(min_length=1, max_length=100)
    village: str | None = Field(default=None, max_length=150)
    area: float | None = Field(default=None, gt=0)
    area_unit: Literal["acre", "hectare"] = "acre"
    current_crop: str | None = Field(default=None, max_length=100)
    previous_crop: str | None = Field(default=None, max_length=100)
    season: Season
    crop_category: Category = "any"
    irrigation: Literal["assured", "limited", "rainfed"] = "rainfed"
    water_source: Literal["canal", "borewell", "rain", "pond", "other"] = "rain"
    drainage: Literal["good", "moderate", "poor"] = "moderate"
    target_yield: float | None = Field(default=None, gt=0)


class SoilAnalysisRequest(APIModel):
    image: SoilImage | None = None
    report_file_name: str | None = None
    measurements: SoilMeasurements
    farm: FarmDetails


class PlantHealthRequest(APIModel):
    image_data_url: str = Field(min_length=1)
    crop: str = Field(min_length=1, max_length=100)
    growth_stage: str = Field(min_length=1, max_length=100)
    symptoms: str = Field(default="", max_length=2000)


class MeasurementOut(APIModel):
    value: float | None
    unit: str
    source: Provenance | None


class DataReference(APIModel):
    title: str
    url: str | None = None


class CropRecommendation(APIModel):
    id: str
    name: str
    category: Literal["cereal", "pulse", "oilseed", "vegetable"]
    season: Season
    water_need: WaterNeed
    duration_days: tuple[int, int]
    suitability_score: float | None = None
    soil_compatibility: str
    reasons: list[str]
    limitations: list[str]
    constraints: list[str]
    references: list[DataReference]
    image_key: str


class FertilizerOption(APIModel):
    name: str
    purpose: str
    quantity: str | None = None
    timing: str
    method: str


class FertilizerRecommendation(APIModel):
    constraints: list[str]
    requirements: list[str]
    options: list[FertilizerOption]
    cautions: list[str]
    dosage_available: bool
    explanation: str


class WeeklyWater(APIModel):
    week: str
    mm: float | None


class IrrigationPlan(APIModel):
    summary: str
    method: str
    estimate_available: bool
    missing_for_estimate: list[str]
    weekly: list[WeeklyWater]
    tips: list[str]


class PestConcern(APIModel):
    name: str
    crop: str
    symptoms: str


class PestPlan(APIModel):
    concerns: list[PestConcern]
    prevention: list[str]
    ipm: list[str]
    biological: list[str]
    chemical_note: str


class ImageObservations(APIModel):
    apparent_texture: str | None
    visible_characteristics: list[str]


class FarmSummary(APIModel):
    state: str
    district: str
    season: str
    area: float | None
    area_unit: str


class SoilAnalysisResponse(APIModel):
    id: str
    created_at: str
    mode: Literal["demo", "production"]
    image_data_url: str | None
    image_observations: ImageObservations
    interpretation: str
    confidence: Literal["low", "moderate", "high"]
    measurements: dict[str, MeasurementOut]
    texture: str | None
    missing_inputs: list[str]
    warnings: list[str]
    hypotheses: list[str]
    crops: list[CropRecommendation]
    fertilizer: FertilizerRecommendation
    irrigation: IrrigationPlan
    pests: PestPlan
    farm: FarmSummary
    references: list[DataReference]


class PossibleCondition(APIModel):
    name: str
    kind: Literal["disease", "pest", "nutrient", "abiotic"]
    confidence: float = Field(ge=0, le=1)


class PlantDiagnosis(APIModel):
    id: str
    mode: Literal["demo", "production"]
    possible_conditions: list[PossibleCondition]
    observed_symptoms: list[str]
    alternatives: list[str]
    verification_steps: list[str]
    prevention: list[str]
    treatment: list[str]
    low_confidence: bool


class HistoryItem(APIModel):
    id: str
    date: str
    farm: str
    location: str
    measurements: Literal["lab", "sensor", "image_only", "none"]
    status: Literal["completed", "incomplete", "failed"]
