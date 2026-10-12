import { z } from "zod";

/** Where a value came from. Never conflate these in the UI. */
export const provenanceSchema = z.enum(["laboratory", "sensor", "image_observation", "ai_hypothesis", "user_input"]);
export type MeasurementProvenance = z.infer<typeof provenanceSchema>;

export const measurementSchema = z.object({
  value: z.number().nullable(),
  unit: z.string(),
  source: provenanceSchema.nullable(),
});
export type Measurement = z.infer<typeof measurementSchema>;

export const soilTextures = ["sandy", "loamy_sand", "sandy_loam", "loam", "silt_loam", "clay_loam", "clay", "unknown"] as const;
export type SoilTexture = (typeof soilTextures)[number];

export type MeasurementSourceType = "laboratory" | "sensor" | "none";

export interface SoilMeasurements {
  sourceType: MeasurementSourceType;
  ph: number | null;
  ec: number | null; // dS/m
  nitrogen: number | null; // kg/ha available N
  phosphorus: number | null; // kg/ha P2O5
  potassium: number | null; // kg/ha K2O
  organicCarbon: number | null; // %
  texture: SoilTexture | null;
  zinc: number | null; // mg/kg
  iron: number | null; // mg/kg
  sulphur: number | null; // mg/kg
}

export interface FarmDetails {
  country: string;
  state: string;
  district: string;
  village: string | null;
  area: number | null;
  areaUnit: "acre" | "hectare";
  currentCrop: string | null;
  previousCrop: string | null;
  season: "kharif" | "rabi" | "zaid";
  cropCategory: "cereal" | "pulse" | "oilseed" | "vegetable" | "any";
  irrigation: "assured" | "limited" | "rainfed";
  waterSource: "canal" | "borewell" | "rain" | "pond" | "other";
  drainage: "good" | "moderate" | "poor";
  targetYield: number | null;
}

export interface SoilAnalysisRequest {
  image: { name: string; dataUrl: string } | null;
  reportFileName: string | null;
  measurements: SoilMeasurements;
  farm: FarmDetails;
}

export const dataRefSchema = z.object({ title: z.string(), url: z.string().optional() });

export const cropRecommendationSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.enum(["cereal", "pulse", "oilseed", "vegetable"]),
  season: z.enum(["kharif", "rabi", "zaid"]),
  waterNeed: z.enum(["low", "medium", "high"]),
  durationDays: z.tuple([z.number(), z.number()]),
  suitabilityScore: z.number().nullable(), // null unless from validated engine
  soilCompatibility: z.string(),
  reasons: z.array(z.string()),
  limitations: z.array(z.string()),
  constraints: z.array(z.string()),
  references: z.array(dataRefSchema),
  imageKey: z.string(),
});
export type CropRecommendation = z.infer<typeof cropRecommendationSchema>;

export const fertilizerSchema = z.object({
  constraints: z.array(z.string()),
  requirements: z.array(z.string()),
  options: z.array(z.object({ name: z.string(), purpose: z.string(), quantity: z.string().nullable(), timing: z.string(), method: z.string() })),
  cautions: z.array(z.string()),
  dosageAvailable: z.boolean(),
  explanation: z.string(),
});
export type FertilizerRecommendation = z.infer<typeof fertilizerSchema>;

export const irrigationSchema = z.object({
  summary: z.string(),
  method: z.string(),
  estimateAvailable: z.boolean(),
  missingForEstimate: z.array(z.string()),
  weekly: z.array(z.object({ week: z.string(), mm: z.number().nullable() })),
  tips: z.array(z.string()),
});
export type IrrigationPlan = z.infer<typeof irrigationSchema>;

export const pestSchema = z.object({
  concerns: z.array(z.object({ name: z.string(), crop: z.string(), symptoms: z.string() })),
  prevention: z.array(z.string()),
  ipm: z.array(z.string()),
  biological: z.array(z.string()),
  chemicalNote: z.string(),
});

export const soilAnalysisResponseSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  mode: z.enum(["demo", "production"]),
  imageDataUrl: z.string().nullable(),
  imageObservations: z.object({
    apparentTexture: z.string().nullable(),
    visibleCharacteristics: z.array(z.string()),
  }),
  interpretation: z.string(),
  confidence: z.enum(["low", "moderate", "high"]),
  measurements: z.record(z.string(), measurementSchema),
  texture: z.string().nullable(),
  missingInputs: z.array(z.string()),
  warnings: z.array(z.string()),
  hypotheses: z.array(z.string()),
  crops: z.array(cropRecommendationSchema),
  fertilizer: fertilizerSchema,
  irrigation: irrigationSchema,
  pests: pestSchema,
  farm: z.object({ state: z.string(), district: z.string(), season: z.string(), area: z.number().nullable(), areaUnit: z.string() }),
  references: z.array(dataRefSchema),
});
export type SoilAnalysisResponse = z.infer<typeof soilAnalysisResponseSchema>;

export const plantDiagnosisSchema = z.object({
  id: z.string(),
  mode: z.enum(["demo", "production"]),
  possibleConditions: z.array(z.object({ name: z.string(), kind: z.enum(["disease", "pest", "nutrient", "abiotic"]), confidence: z.number() })),
  observedSymptoms: z.array(z.string()),
  alternatives: z.array(z.string()),
  verificationSteps: z.array(z.string()),
  prevention: z.array(z.string()),
  treatment: z.array(z.string()),
  lowConfidence: z.boolean(),
});
export type PlantDiagnosis = z.infer<typeof plantDiagnosisSchema>;

export interface PlantHealthRequest {
  imageDataUrl: string;
  crop: string;
  growthStage: string;
  symptoms: string;
}

export const historyItemSchema = z.object({
  id: z.string(),
  date: z.string(),
  farm: z.string(),
  location: z.string(),
  measurements: z.enum(["lab", "sensor", "image_only", "none"]),
  status: z.enum(["completed", "incomplete", "failed"]),
});
export type HistoryItem = z.infer<typeof historyItemSchema>;

export class ApiError extends Error {
  constructor(message: string, public code: "network" | "validation" | "server" | "not_found" = "server", public status?: number) {
    super(message);
    this.name = "ApiError";
  }
}
