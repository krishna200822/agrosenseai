import { API_MODE, delay, request, validate } from "./client";
import { plantDiagnosisSchema, type PlantDiagnosis, type PlantHealthRequest } from "./types";

export async function analyzePlantHealth(req: PlantHealthRequest): Promise<PlantDiagnosis> {
  if (API_MODE === "production") return request("/plant-health/analyze", plantDiagnosisSchema, { method: "POST", body: JSON.stringify(req) });
  await delay(3000);
  const leafSpot = /spot|brown|ring/i.test(req.symptoms);
  const yellow = /yellow|pale|chlor/i.test(req.symptoms);
  const demo: PlantDiagnosis = {
    id: `demo-ph-${Date.now().toString(36)}`,
    mode: "demo",
    possibleConditions: leafSpot
      ? [{ name: "Fungal leaf spot (e.g. Alternaria)", kind: "disease", confidence: 0.42 }, { name: "Bacterial leaf blight", kind: "disease", confidence: 0.23 }]
      : yellow
        ? [{ name: "Nitrogen deficiency", kind: "nutrient", confidence: 0.38 }, { name: "Viral mosaic", kind: "disease", confidence: 0.2 }]
        : [{ name: "Sucking pest damage (aphids / jassids)", kind: "pest", confidence: 0.31 }, { name: "Moisture stress", kind: "abiotic", confidence: 0.25 }],
    observedSymptoms: req.symptoms ? [req.symptoms.slice(0, 160)] : ["No symptom description supplied"],
    alternatives: ["Herbicide drift", "Waterlogging or drought stress", "Micronutrient imbalance"],
    verificationSteps: ["Inspect the underside of several leaves across the field", "Check whether symptoms spread from older or younger leaves", "Send a sample to your nearest Krishi Vigyan Kendra or plant clinic"],
    prevention: ["Use resistant varieties where available", "Maintain field sanitation", "Avoid overhead irrigation late in the day"],
    treatment: ["Remove and destroy severely affected leaves", "Consult a local extension officer before applying any chemical treatment"],
    lowConfidence: true,
  };
  return validate(demo, plantDiagnosisSchema);
}
