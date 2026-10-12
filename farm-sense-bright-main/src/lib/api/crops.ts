import { z } from "zod";
import { API_MODE, delay, request, validate } from "./client";
import { DEMO_CROPS } from "./mock-data";
import { cropRecommendationSchema, type CropRecommendation } from "./types";

export async function getCropRecommendations(analysisId?: string): Promise<CropRecommendation[]> {
  if (API_MODE === "production") return request(`/crops/recommendations${analysisId ? `?analysis=${analysisId}` : ""}`, z.array(cropRecommendationSchema));
  await delay(400);
  return validate(DEMO_CROPS, z.array(cropRecommendationSchema));
}
