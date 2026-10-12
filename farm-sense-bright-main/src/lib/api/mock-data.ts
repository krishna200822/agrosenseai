import type { CropRecommendation, HistoryItem } from "./types";

/** DEMONSTRATION DATA — illustrative only, not derived from any real analysis. */
export const DEMO_CROPS: CropRecommendation[] = [
  {
    id: "wheat", name: "Wheat", category: "cereal", season: "rabi", waterNeed: "medium", durationDays: [110, 130],
    suitabilityScore: null, soilCompatibility: "Loam to clay loam, near-neutral pH",
    reasons: ["Well suited to cool-season rabi sowing", "Tolerates the moderate EC range entered", "Fits rotation after a kharif legume"],
    limitations: ["Needs 4–6 irrigations at critical stages", "Sensitive to terminal heat stress"],
    constraints: ["Sow before late November for most northern regions", "Avoid waterlogging at crown-root initiation"],
    references: [{ title: "ICAR-IIWBR Wheat Production Guidelines", url: "https://iiwbr.icar.gov.in" }], imageKey: "wheat",
  },
  {
    id: "chickpea", name: "Chickpea", category: "pulse", season: "rabi", waterNeed: "low", durationDays: [95, 120],
    suitabilityScore: null, soilCompatibility: "Well-drained loam, pH 6–8",
    reasons: ["Low water requirement", "Biological nitrogen fixation improves soil N", "Good fit for residual moisture"],
    limitations: ["Prone to wilt in poorly drained soils", "Pod borer pressure in warm spells"],
    constraints: ["Requires good drainage", "Seed treatment recommended before sowing"],
    references: [{ title: "ICAR-IIPR Chickpea Package of Practices", url: "https://iipr.icar.gov.in" }], imageKey: "chickpea",
  },
  {
    id: "soybean", name: "Soybean", category: "oilseed", season: "kharif", waterNeed: "medium", durationDays: [90, 110],
    suitabilityScore: null, soilCompatibility: "Well-drained loam to clay loam",
    reasons: ["Suited to monsoon season sowing", "Legume — adds to soil nitrogen", "Strong market demand in central India"],
    limitations: ["Sensitive to waterlogging", "Yellow mosaic risk in some regions"],
    constraints: ["Use broad-bed furrow on heavy soils", "Rhizobium inoculation advised"],
    references: [{ title: "ICAR-IISR Soybean Guidelines", url: "https://iisrindore.icar.gov.in" }], imageKey: "soybean",
  },
  {
    id: "maize", name: "Maize", category: "cereal", season: "kharif", waterNeed: "medium", durationDays: [90, 120],
    suitabilityScore: null, soilCompatibility: "Deep, fertile, well-drained loam",
    reasons: ["Flexible across seasons", "High yield potential under good fertility"],
    limitations: ["Heavy nitrogen feeder", "Fall armyworm pressure"],
    constraints: ["Avoid waterlogged fields", "Requires split nitrogen application"],
    references: [{ title: "ICAR-IIMR Maize Production Technology", url: "https://iimr.icar.gov.in" }], imageKey: "maize",
  },
  {
    id: "mustard", name: "Mustard", category: "oilseed", season: "rabi", waterNeed: "low", durationDays: [110, 140],
    suitabilityScore: null, soilCompatibility: "Sandy loam to loam, tolerates mild salinity",
    reasons: ["Low irrigation requirement", "Tolerant of moderate EC"],
    limitations: ["Aphid pressure in foggy spells", "Frost sensitivity at flowering"],
    constraints: ["Sulphur supply matters for oil content"],
    references: [{ title: "ICAR-DRMR Rapeseed-Mustard Guidelines", url: "https://drmr.res.in" }], imageKey: "mustard",
  },
  {
    id: "rice", name: "Rice", category: "cereal", season: "kharif", waterNeed: "high", durationDays: [120, 150],
    suitabilityScore: null, soilCompatibility: "Clay to clay loam with water retention",
    reasons: ["Performs well with assured irrigation", "Tolerates heavier soils"],
    limitations: ["Very high water demand", "Not suited to light, fast-draining soils"],
    constraints: ["Needs assured water supply or reliable monsoon"],
    references: [{ title: "ICAR-NRRI Rice Production Manual", url: "https://icar-nrri.in" }], imageKey: "rice",
  },
];

export const DEMO_HISTORY: HistoryItem[] = [
  { id: "demo-1042", date: "2026-09-28", farm: "North Plot", location: "Sehore, Madhya Pradesh", measurements: "lab", status: "completed" },
  { id: "demo-1038", date: "2026-08-14", farm: "River Field", location: "Sehore, Madhya Pradesh", measurements: "sensor", status: "completed" },
  { id: "demo-1031", date: "2026-07-02", farm: "East Block", location: "Vidisha, Madhya Pradesh", measurements: "image_only", status: "incomplete" },
  { id: "demo-1024", date: "2026-05-19", farm: "North Plot", location: "Sehore, Madhya Pradesh", measurements: "none", status: "failed" },
  { id: "demo-1017", date: "2026-03-08", farm: "Orchard Edge", location: "Bhopal, Madhya Pradesh", measurements: "lab", status: "completed" },
];
