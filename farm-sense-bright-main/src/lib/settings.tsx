import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "en" | "hi";
export interface Settings {
  lang: Lang;
  areaUnit: "acre" | "hectare";
  nutrientUnit: "kg/ha" | "lb/acre";
  name: string;
  farmName: string;
  farmLocation: string;
  notifySeasonal: boolean;
  notifyReports: boolean;
  shareAnonymised: boolean;
  keepImages: boolean;
}

const DEFAULTS: Settings = {
  lang: "en", areaUnit: "acre", nutrientUnit: "kg/ha", name: "Farmer", farmName: "North Plot",
  farmLocation: "Sehore, Madhya Pradesh", notifySeasonal: true, notifyReports: true, shareAnonymised: false, keepImages: false,
};
const KEY = "agrosense:settings";

const dict = {
  en: {
    home: "Home", features: "Features", soilAnalysis: "Soil Analysis", plantHealth: "Plant Health", signIn: "Sign In", getStarted: "Get Started",
    overview: "Overview", cropRecs: "Crop Recommendations", history: "Analysis History", settings: "Settings", help: "Help & support",
    goodMorning: "Good morning", goodAfternoon: "Good afternoon", goodEvening: "Good evening", farmOverview: "Here is your farm health overview.",
    startSoil: "Start Soil Analysis", checkPlant: "Check Plant Health", demoData: "Demo Data", language: "Language",
  },
  hi: {
    home: "होम", features: "विशेषताएँ", soilAnalysis: "मिट्टी विश्लेषण", plantHealth: "पौधों का स्वास्थ्य", signIn: "साइन इन", getStarted: "शुरू करें",
    overview: "अवलोकन", cropRecs: "फसल सुझाव", history: "विश्लेषण इतिहास", settings: "सेटिंग्स", help: "सहायता",
    goodMorning: "सुप्रभात", goodAfternoon: "नमस्कार", goodEvening: "शुभ संध्या", farmOverview: "यह आपके खेत के स्वास्थ्य का सारांश है।",
    startSoil: "मिट्टी विश्लेषण शुरू करें", checkPlant: "पौधों की जाँच करें", demoData: "डेमो डेटा", language: "भाषा",
  },
} as const;
export type DictKey = keyof (typeof dict)["en"];

interface Ctx { settings: Settings; update: (p: Partial<Settings>) => void; t: (k: DictKey) => string }
const SettingsContext = createContext<Ctx | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setSettings({ ...DEFAULTS, ...JSON.parse(raw) });
    } catch { /* ignore */ }
  }, []);
  useEffect(() => { document.documentElement.lang = settings.lang; }, [settings.lang]);
  const update = (p: Partial<Settings>) =>
    setSettings((s) => {
      const next = { ...s, ...p };
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  const t = (k: DictKey) => dict[settings.lang][k];
  return <SettingsContext.Provider value={{ settings, update, t }}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const c = useContext(SettingsContext);
  if (!c) throw new Error("useSettings must be used inside SettingsProvider");
  return c;
}

/** Convert a nutrient value stored in kg/ha to the user's preferred unit. */
export function formatNutrient(v: number | null, unit: Settings["nutrientUnit"]) {
  if (v === null) return null;
  return unit === "kg/ha" ? `${round(v)} kg/ha` : `${round(v * 0.892)} lb/acre`;
}
export function formatArea(v: number | null, from: "acre" | "hectare", to: "acre" | "hectare") {
  if (v === null) return "—";
  const val = from === to ? v : from === "acre" ? v * 0.4047 : v / 0.4047;
  return `${round(val)} ${to === "acre" ? "acres" : "ha"}`;
}
const round = (n: number) => Math.round(n * 10) / 10;
