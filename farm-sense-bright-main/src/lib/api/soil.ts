import { API_MODE, delay, request, validate } from "./client";
import { DEMO_CROPS, DEMO_HISTORY } from "./mock-data";
import {
  ApiError, historyItemSchema, soilAnalysisResponseSchema,
  type FertilizerRecommendation, type HistoryItem, type IrrigationPlan, type Measurement,
  type SoilAnalysisRequest, type SoilAnalysisResponse,
} from "./types";
import { z } from "zod";

const LAST_KEY = "agrosense:last-analysis";
let memoryLast: SoilAnalysisResponse | null = null;

export const TEXTURE_LABEL: Record<string, string> = {
  sandy: "Sandy", loamy_sand: "Loamy sand", sandy_loam: "Sandy loam", loam: "Loam",
  silt_loam: "Silt loam", clay_loam: "Clay loam", clay: "Clay", unknown: "Unknown",
};

function buildDemoResponse(req: SoilAnalysisRequest): SoilAnalysisResponse {
  const m = req.measurements;
  const src = m.sourceType === "laboratory" ? "laboratory" : m.sourceType === "sensor" ? "sensor" : null;
  const mk = (value: number | null, unit: string): Measurement => ({ value, unit, source: value === null ? null : src });
  const measurements = {
    ph: mk(m.ph, "pH units"), ec: mk(m.ec, "dS/m"), nitrogen: mk(m.nitrogen, "kg/ha"),
    phosphorus: mk(m.phosphorus, "kg/ha"), potassium: mk(m.potassium, "kg/ha"), organicCarbon: mk(m.organicCarbon, "%"),
    zinc: mk(m.zinc, "mg/kg"), iron: mk(m.iron, "mg/kg"), sulphur: mk(m.sulphur, "mg/kg"),
  };
  const labels: Record<string, string> = { ph: "pH", ec: "Electrical conductivity", nitrogen: "Nitrogen", phosphorus: "Phosphorus", potassium: "Potassium", organicCarbon: "Organic carbon" };
  const missing = Object.entries(labels).filter(([k]) => measurements[k as keyof typeof measurements].value === null).map(([, l]) => l);
  if (!m.texture || m.texture === "unknown") missing.push("Soil texture");
  if (!req.image) missing.push("Soil photograph");

  const crops = DEMO_CROPS.filter((c) => c.season === req.farm.season || req.farm.season === "zaid").slice(0, 4);
  const anyNPK = m.nitrogen !== null || m.phosphorus !== null || m.potassium !== null;
  const constraints: string[] = [];
  if (m.nitrogen !== null && m.nitrogen < 280) constraints.push("Available nitrogen is below 280 kg/ha, a common general soil-test reference point; confirm with crop-specific local guidance.");
  if (m.ph !== null && (m.ph < 6 || m.ph > 8)) constraints.push("pH is outside the 6.0–8.0 band most field crops tolerate; nutrient availability may be affected.");

  const fertilizer: FertilizerRecommendation = {
    constraints,
    requirements: anyNPK ? ["Balance N, P and K according to crop removal and soil-test values", "Include organic matter to sustain soil carbon"] : [],
    options: [
      { name: "Farmyard manure / compost", purpose: "Organic matter and slow-release nutrients", quantity: null, timing: "2–3 weeks before sowing", method: "Broadcast and incorporate" },
      { name: "Urea (46% N)", purpose: "Nitrogen supply", quantity: null, timing: "Split: basal and top-dressing", method: "Band placement or broadcast with irrigation" },
      { name: "DAP / SSP", purpose: "Phosphorus supply", quantity: null, timing: "Basal at sowing", method: "Drill below the seed" },
    ],
    cautions: ["Do not apply nitrogen to waterlogged soil.", "Follow your state Soil Health Card recommendations for exact dosages."],
    dosageAvailable: false,
    explanation: "Exact quantities are not shown. Dosage requires validated crop-specific calculations and local reference data, which the backend will provide. Use your Soil Health Card or local Krishi Vigyan Kendra for dosage today.",
  };

  const irrigation: IrrigationPlan = {
    summary: req.farm.irrigation === "rainfed" ? "Rainfed field — plan around soil moisture conservation." : "Irrigation is available. Schedule should follow critical crop growth stages.",
    method: req.farm.irrigation === "limited" ? "Drip or sprinkler recommended to stretch limited water." : "Furrow or sprinkler, depending on field layout.",
    estimateAvailable: false,
    missingForEstimate: ["Local weather forecast", "Crop growth stage", "Measured soil moisture"],
    weekly: ["W1", "W2", "W3", "W4", "W5", "W6"].map((w) => ({ week: w, mm: null })),
    tips: ["Irrigate early morning or evening to cut evaporation losses.", "Mulch with crop residue to conserve moisture.", "Level fields to avoid uneven water distribution."],
  };

  return {
    id: `demo-${Date.now().toString(36)}`,
    createdAt: new Date().toISOString(),
    mode: "demo",
    imageDataUrl: req.image?.dataUrl ?? null,
    imageObservations: {
      apparentTexture: req.image ? "Apparent texture can only be confirmed by a lab or feel test." : null,
      visibleCharacteristics: req.image ? ["Visual inspection pending backend image analysis"] : [],
    },
    interpretation: "This is a demonstration report. It summarises the values you entered and lists general considerations; it is not produced by an AI model or validated recommendation engine.",
    confidence: missing.length > 3 ? "low" : "moderate",
    measurements,
    texture: m.texture,
    missingInputs: missing,
    warnings: [
      "Demonstration data: no backend or AI model was called.",
      ...(m.sourceType === "none" ? ["No soil-test measurements were supplied. Nutrient interpretation is not possible."] : []),
    ],
    hypotheses: ["Crop list is filtered by the season you selected, not scored by a validated engine."],
    crops,
    fertilizer,
    irrigation,
    pests: {
      concerns: crops.slice(0, 3).map((c) => ({
        name: c.id === "chickpea" ? "Pod borer (Helicoverpa)" : c.id === "soybean" ? "Girdle beetle" : c.id === "wheat" ? "Yellow rust" : "Aphids",
        crop: c.name,
        symptoms: c.id === "wheat" ? "Yellow stripe-like pustules on leaves" : c.id === "chickpea" ? "Bored pods, larvae feeding on seeds" : "Wilting branches, girdled stems",
      })),
      prevention: ["Use certified, treated seed", "Follow crop rotation", "Remove crop residues hosting pests"],
      ipm: ["Scout fields weekly", "Install pheromone traps", "Act only when economic threshold is reached"],
      biological: ["Bird perches (≈20/acre)", "Trichoderma seed treatment", "Neem-based sprays", "Hand-picking larvae"],
      chemicalNote: "Chemical treatment details are shown only when backed by verified local guidance. Consult your local agricultural extension officer.",
    },
    farm: { state: req.farm.state, district: req.farm.district, season: req.farm.season, area: req.farm.area, areaUnit: req.farm.areaUnit },
    references: [{ title: "Soil Health Card Scheme, Govt. of India", url: "https://soilhealth.dac.gov.in" }],
  };
}

export async function analyzeSoil(req: SoilAnalysisRequest, opts?: { simulateFailure?: boolean }): Promise<SoilAnalysisResponse> {
  let result: SoilAnalysisResponse;
  if (API_MODE === "production") {
    result = await request("/soil/analyze", soilAnalysisResponseSchema, { method: "POST", body: JSON.stringify(req) });
  } else {
    await delay(4500);
    if (opts?.simulateFailure) throw new ApiError("The analysis service did not respond in time.", "network");
    result = validate(buildDemoResponse(req), soilAnalysisResponseSchema);
  }
  memoryLast = result;
  try { sessionStorage.setItem(LAST_KEY, JSON.stringify(result)); } catch { /* storage full or unavailable */ }
  return result;
}

export async function getSoilAnalysis(id?: string): Promise<SoilAnalysisResponse | null> {
  if (API_MODE === "production" && id) return request(`/soil/${id}`, soilAnalysisResponseSchema);
  if (memoryLast) return memoryLast;
  try {
    const raw = sessionStorage.getItem(LAST_KEY);
    if (raw) return (memoryLast = validate(JSON.parse(raw), soilAnalysisResponseSchema));
  } catch { /* ignore */ }
  return null;
}

export async function getFertilizerRecommendations(id?: string) {
  return (await getSoilAnalysis(id))?.fertilizer ?? null;
}
export async function getIrrigationPlan(id?: string) {
  return (await getSoilAnalysis(id))?.irrigation ?? null;
}

export async function getAnalysisHistory(opts?: { simulateFailure?: boolean }): Promise<HistoryItem[]> {
  if (API_MODE === "production") return request("/soil/history", z.array(historyItemSchema));
  await delay(700);
  if (opts?.simulateFailure) throw new ApiError("Could not load history.", "network");
  return validate(DEMO_HISTORY, z.array(historyItemSchema));
}
