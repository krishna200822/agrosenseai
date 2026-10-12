import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useForm, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle, ArrowLeft, ArrowRight, Check, FileUp, Info, Loader2, Pencil, RotateCcw, TriangleAlert } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { DemoBadge } from "@/components/brand";
import { ImageDropzone, type PickedImage } from "@/components/image-dropzone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { analyzeSoil, TEXTURE_LABEL } from "@/lib/api/soil";
import { API_MODE } from "@/lib/api/client";
import { soilTextures, type SoilAnalysisRequest } from "@/lib/api/types";
import { useSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/soil-analysis/")({
  head: () => ({
    meta: [
      { title: "Soil Analysis — AgroSense AI" },
      { name: "description", content: "Upload a soil photo, add soil-test values and farm details to generate a soil report." },
      { property: "og:title", content: "Soil Analysis — AgroSense AI" },
      { property: "og:description", content: "A guided four-step soil analysis workflow." },
    ],
  }),
  component: SoilAnalysis,
});

const num = (min: number, max: number, label: string) =>
  z.string().refine((v) => v.trim() === "" || (!isNaN(Number(v)) && Number(v) >= min && Number(v) <= max), `${label} must be between ${min} and ${max}`);

const schema = z.object({
  sourceType: z.enum(["laboratory", "sensor", "none"]),
  ph: num(0, 14, "pH"), ec: num(0, 20, "EC"), nitrogen: num(0, 2000, "Nitrogen"), phosphorus: num(0, 500, "Phosphorus"),
  potassium: num(0, 3000, "Potassium"), organicCarbon: num(0, 15, "Organic carbon"),
  zinc: num(0, 100, "Zinc"), iron: num(0, 500, "Iron"), sulphur: num(0, 200, "Sulphur"),
  texture: z.string(),
  country: z.string().min(1, "Select a country"), state: z.string().min(1, "Select a state"), district: z.string().trim().min(2, "Enter your district").max(60),
  village: z.string().max(80), area: num(0, 100000, "Farm area"), areaUnit: z.enum(["acre", "hectare"]),
  currentCrop: z.string().max(40), previousCrop: z.string().max(40),
  season: z.string().min(1, "Select a season"), cropCategory: z.string().min(1), irrigation: z.string().min(1, "Select irrigation availability"),
  waterSource: z.string().min(1, "Select a water source"), drainage: z.string().min(1, "Select drainage"), targetYield: num(0, 200, "Target yield"),
});
type FormValues = z.infer<typeof schema>;

const STEPS = ["Soil Image", "Soil Test Results", "Farm Details", "Review & Analyze"];
const STEP_FIELDS: FieldPath<FormValues>[][] = [
  [], ["sourceType", "ph", "ec", "nitrogen", "phosphorus", "potassium", "organicCarbon", "zinc", "iron", "sulphur", "texture"],
  ["country", "state", "district", "village", "area", "areaUnit", "season", "cropCategory", "irrigation", "waterSource", "drainage", "targetYield"], [],
];
const STATES = ["Andhra Pradesh", "Bihar", "Gujarat", "Haryana", "Karnataka", "Madhya Pradesh", "Maharashtra", "Punjab", "Rajasthan", "Tamil Nadu", "Telangana", "Uttar Pradesh", "West Bengal"];
const STATUS = ["Validating submitted information", "Reviewing soil imagery", "Interpreting available soil-test measurements", "Evaluating crop suitability", "Preparing your agricultural report"];

const toNum = (v: string) => (v.trim() === "" ? null : Number(v));

function SoilAnalysis() {
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [image, setImage] = useState<PickedImage | null>(null);
  const [noImage, setNoImage] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const [phase, setPhase] = useState<"form" | "loading" | "error">("form");
  const [errMsg, setErrMsg] = useState("");
  const [simFail, setSimFail] = useState(false);
  const [statusIdx, setStatusIdx] = useState(0);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: {
      sourceType: "laboratory", ph: "", ec: "", nitrogen: "", phosphorus: "", potassium: "", organicCarbon: "", zinc: "", iron: "", sulphur: "",
      texture: "", country: "India", state: "", district: "", village: "", area: "", areaUnit: settings.areaUnit, currentCrop: "", previousCrop: "",
      season: "", cropCategory: "any", irrigation: "", waterSource: "", drainage: "", targetYield: "",
    },
  });
  const { register, watch, setValue, formState: { errors } } = form;
  const v = watch();
  useEffect(() => { if (!form.getValues("district")) setValue("areaUnit", settings.areaUnit); }, [settings.areaUnit]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasMeasurement = v.sourceType !== "none" && ["ph", "ec", "nitrogen", "phosphorus", "potassium", "organicCarbon"].some((k) => v[k as keyof FormValues]?.toString().trim());
  const step0Ok = !!image || noImage;
  const sufficient = !!image || hasMeasurement || (!!v.texture && v.texture !== "unknown");

  useEffect(() => {
    if (phase !== "loading") return;
    const id = setInterval(() => setStatusIdx((i) => Math.min(i + 1, STATUS.length - 1)), 900);
    return () => clearInterval(id);
  }, [phase]);

  const next = async () => {
    if (step === 0 && !step0Ok) return;
    const ok = await form.trigger(STEP_FIELDS[step]);
    if (ok) { setStep((s) => s + 1); window.scrollTo({ top: 0, behavior: "smooth" }); }
  };

  const submit = form.handleSubmit(async (d) => {
    if (!sufficient) return;
    const none = d.sourceType === "none";
    const req: SoilAnalysisRequest = {
      image: image ? { name: image.name, dataUrl: image.dataUrl } : null,
      reportFileName: report,
      measurements: {
        sourceType: d.sourceType,
        ph: none ? null : toNum(d.ph), ec: none ? null : toNum(d.ec), nitrogen: none ? null : toNum(d.nitrogen),
        phosphorus: none ? null : toNum(d.phosphorus), potassium: none ? null : toNum(d.potassium), organicCarbon: none ? null : toNum(d.organicCarbon),
        zinc: none ? null : toNum(d.zinc), iron: none ? null : toNum(d.iron), sulphur: none ? null : toNum(d.sulphur),
        texture: (d.texture || null) as SoilAnalysisRequest["measurements"]["texture"],
      },
      farm: {
        country: d.country, state: d.state, district: d.district, village: d.village || null, area: toNum(d.area), areaUnit: d.areaUnit,
        currentCrop: d.currentCrop || null, previousCrop: d.previousCrop || null,
        season: d.season as "rabi", cropCategory: d.cropCategory as "any", irrigation: d.irrigation as "assured",
        waterSource: d.waterSource as "canal", drainage: d.drainage as "good", targetYield: toNum(d.targetYield),
      },
    };
    setStatusIdx(0); setPhase("loading");
    try {
      await analyzeSoil(req, { simulateFailure: simFail });
      navigate({ to: "/soil-analysis/results" });
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : "Something went wrong.");
      setPhase("error");
    }
  });

  if (phase !== "form") {
    return (
      <AppShell title="Soil Analysis" crumb="Soil Analysis / Analyzing">
        <div className="card-surface mx-auto mt-6 max-w-xl p-8 text-center md:p-10">
          {phase === "loading" ? (
            <>
              <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
              <h2 className="mt-5 text-xl font-semibold">Analyzing your soil</h2>
              <Progress value={((statusIdx + 1) / STATUS.length) * 100} className="mt-6" />
              <ul className="mt-6 space-y-2 text-left text-sm">
                {STATUS.map((s, i) => (
                  <li key={s} className={cn("flex items-center gap-2", i > statusIdx ? "text-muted-foreground/60" : i === statusIdx ? "font-medium" : "text-muted-foreground")}>
                    {i < statusIdx ? <Check className="h-4 w-4 text-primary" /> : i === statusIdx ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <span className="h-4 w-4" />}
                    {s}…
                  </li>
                ))}
              </ul>
              {API_MODE === "demo" && <p className="mt-6 text-xs text-muted-foreground">Demo mode: no AI model is being called. The report will be labelled as demonstration data.</p>}
            </>
          ) : (
            <>
              <AlertCircle className="mx-auto h-10 w-10 text-destructive" />
              <h2 className="mt-5 text-xl font-semibold">The analysis couldn't be completed</h2>
              <p className="mt-2 text-muted-foreground">{errMsg} Your entries are safe — nothing was lost.</p>
              <div className="mt-6 flex justify-center gap-2">
                <Button variant="outline" onClick={() => setPhase("form")}><ArrowLeft className="h-4 w-4" />Back to review</Button>
                <Button onClick={() => { setSimFail(false); submit(); }}><RotateCcw className="h-4 w-4" />Retry</Button>
              </div>
            </>
          )}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Soil Analysis" crumb={`Soil Analysis / ${STEPS[step]}`}>
      <ol className="grid grid-cols-4 gap-2" aria-label="Progress">
        {STEPS.map((s, i) => (
          <li key={s}>
            <button type="button" disabled={i > step} onClick={() => setStep(i)} aria-current={i === step ? "step" : undefined}
              className="w-full text-left disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded">
              <span className={cn("block h-1.5 rounded-full", i <= step ? "bg-primary" : "bg-border")} />
              <span className={cn("mt-2 flex items-center gap-1.5 text-xs font-medium sm:text-sm", i === step ? "text-foreground" : "text-muted-foreground")}>
                <span className={cn("hidden h-5 w-5 place-items-center rounded-full text-[10px] sm:grid", i < step ? "bg-primary text-primary-foreground" : i === step ? "bg-forest text-forest-foreground" : "bg-muted")}>{i < step ? <Check className="h-3 w-3" /> : i + 1}</span>
                <span className="truncate">{s}</span>
              </span>
            </button>
          </li>
        ))}
      </ol>

      <form onSubmit={(e) => { e.preventDefault(); step === 3 ? submit() : next(); }} className="mt-8 grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="card-surface p-5 md:p-8">
          {step === 0 && (
            <section>
              <h2 className="text-xl font-semibold">Upload a soil photograph</h2>
              <p className="mt-1 text-sm text-muted-foreground">A top-down photo of freshly dug, slightly moist soil in daylight works best.</p>
              <div className="mt-6"><ImageDropzone value={image} onChange={(i) => { setImage(i); if (i) setNoImage(false); }} /></div>
              <Notice className="mt-5">A soil photograph can provide visual clues about colour and apparent texture. It cannot reliably determine exact pH, electrical conductivity, or nutrient concentrations.</Notice>
              {!image && (
                <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-lg border border-border p-4">
                  <Checkbox checked={noImage} onCheckedChange={(c) => setNoImage(!!c)} className="mt-0.5" />
                  <span className="text-sm"><span className="font-medium">Continue without an image</span><span className="block text-muted-foreground">You'll need to provide soil-test values or the soil texture in the next step.</span></span>
                </label>
              )}
            </section>
          )}

          {step === 1 && (
            <section>
              <h2 className="text-xl font-semibold">Soil-test results</h2>
              <p className="mt-1 text-sm text-muted-foreground">Leave a field blank if it wasn't measured. Blank values stay empty — we never estimate them.</p>
              <RadioGroup value={v.sourceType} onValueChange={(x) => setValue("sourceType", x as FormValues["sourceType"])} className="mt-6 grid gap-3 sm:grid-cols-3">
                {[["laboratory", "I have laboratory soil-test results"], ["sensor", "I have sensor measurements"], ["none", "I do not have soil-test measurements"]].map(([val, l]) => (
                  <Label key={val} htmlFor={`src-${val}`} className={cn("flex cursor-pointer items-start gap-3 rounded-lg border p-4 text-sm font-normal leading-snug", v.sourceType === val ? "border-primary bg-secondary/60" : "border-border")}>
                    <RadioGroupItem id={`src-${val}`} value={val} className="mt-0.5" />{l}
                  </Label>
                ))}
              </RadioGroup>

              {v.sourceType !== "none" ? (
                <>
                  <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <NumField id="ph" label="pH" unit="pH units" tip="Acidity/alkalinity on a 0–14 scale, measured in a 1:2.5 soil–water suspension." reg={register("ph")} err={errors.ph?.message} />
                    <NumField id="ec" label="Electrical conductivity (EC)" unit="dS/m" tip="Indicates soluble salts. Higher values can signal salinity." reg={register("ec")} err={errors.ec?.message} />
                    <NumField id="nitrogen" label="Available nitrogen (N)" unit="kg/ha" tip="Alkaline permanganate method, as reported on Soil Health Cards." reg={register("nitrogen")} err={errors.nitrogen?.message} />
                    <NumField id="phosphorus" label="Available phosphorus (P₂O₅)" unit="kg/ha" tip="Olsen or Bray method depending on soil pH." reg={register("phosphorus")} err={errors.phosphorus?.message} />
                    <NumField id="potassium" label="Available potassium (K₂O)" unit="kg/ha" tip="Ammonium acetate extractable potassium." reg={register("potassium")} err={errors.potassium?.message} />
                    <NumField id="organicCarbon" label="Organic carbon" unit="%" tip="Walkley–Black method. Indicates soil organic matter." reg={register("organicCarbon")} err={errors.organicCarbon?.message} />
                  </div>
                  <details className="mt-5 rounded-lg border border-border p-4">
                    <summary className="cursor-pointer text-sm font-medium">Micronutrients (optional)</summary>
                    <div className="mt-4 grid gap-4 sm:grid-cols-3">
                      <NumField id="zinc" label="Zinc (Zn)" unit="mg/kg" tip="DTPA-extractable zinc." reg={register("zinc")} err={errors.zinc?.message} />
                      <NumField id="iron" label="Iron (Fe)" unit="mg/kg" tip="DTPA-extractable iron." reg={register("iron")} err={errors.iron?.message} />
                      <NumField id="sulphur" label="Sulphur (S)" unit="mg/kg" tip="Available sulphur." reg={register("sulphur")} err={errors.sulphur?.message} />
                    </div>
                  </details>
                </>
              ) : (
                <Notice className="mt-6" tone="warning">Without measurements, the report can describe general crop suitability but cannot interpret nutrient status or suggest fertilizer quantities.</Notice>
              )}

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="texture">Soil texture</Label>
                  <Select value={v.texture} onValueChange={(x) => setValue("texture", x)}>
                    <SelectTrigger id="texture" className="mt-1.5"><SelectValue placeholder="Select texture" /></SelectTrigger>
                    <SelectContent>{soilTextures.map((t) => <SelectItem key={t} value={t}>{TEXTURE_LABEL[t]}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="report">Soil-test report (optional)</Label>
                  <label htmlFor="report" className="mt-1.5 flex h-9 cursor-pointer items-center gap-2 truncate rounded-md border border-input bg-card px-3 text-sm text-muted-foreground hover:border-primary/60">
                    <FileUp className="h-4 w-4 shrink-0" /><span className="truncate">{report ?? "Upload PDF or image"}</span>
                  </label>
                  <input id="report" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="sr-only" onChange={(e) => setReport(e.target.files?.[0]?.name ?? null)} />
                  <p className="mt-1 text-xs text-muted-foreground">Saved for future automatic reading. Please also type values above.</p>
                </div>
              </div>
            </section>
          )}

          {step === 2 && (
            <section>
              <h2 className="text-xl font-semibold">Farm details</h2>
              <p className="mt-1 text-sm text-muted-foreground">A general location is enough. We never ask for precise coordinates.</p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <SelectField id="country" label="Country" value={v.country} onChange={(x) => setValue("country", x, { shouldValidate: true })} items={[["India", "India"]]} err={errors.country?.message} />
                <SelectField id="state" label="State" value={v.state} onChange={(x) => setValue("state", x, { shouldValidate: true })} items={STATES.map((s) => [s, s])} err={errors.state?.message} />
                <TextField id="district" label="District" reg={register("district")} err={errors.district?.message} />
                <TextField id="village" label="Village or general location (optional)" reg={register("village")} />
                <div>
                  <Label htmlFor="area">Farm area (optional)</Label>
                  <div className="mt-1.5 flex gap-2">
                    <Input id="area" inputMode="decimal" {...register("area")} aria-invalid={!!errors.area} />
                    <Select value={v.areaUnit} onValueChange={(x) => setValue("areaUnit", x as "acre")}>
                      <SelectTrigger aria-label="Area unit" className="w-32"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="acre">Acres</SelectItem><SelectItem value="hectare">Hectares</SelectItem></SelectContent>
                    </Select>
                  </div>
                  {errors.area && <p className="mt-1 text-xs text-destructive">{errors.area.message}</p>}
                </div>
                <SelectField id="season" label="Intended growing season" value={v.season} onChange={(x) => setValue("season", x, { shouldValidate: true })} items={[["kharif", "Kharif (monsoon)"], ["rabi", "Rabi (winter)"], ["zaid", "Zaid (summer)"]]} err={errors.season?.message} />
                <TextField id="currentCrop" label="Current crop (optional)" reg={register("currentCrop")} />
                <TextField id="previousCrop" label="Previous crop (optional)" reg={register("previousCrop")} />
                <SelectField id="cropCategory" label="Preferred crop category" value={v.cropCategory} onChange={(x) => setValue("cropCategory", x)} items={[["any", "No preference"], ["cereal", "Cereals"], ["pulse", "Pulses"], ["oilseed", "Oilseeds"], ["vegetable", "Vegetables"]]} />
                <SelectField id="irrigation" label="Irrigation availability" value={v.irrigation} onChange={(x) => setValue("irrigation", x, { shouldValidate: true })} items={[["assured", "Assured irrigation"], ["limited", "Limited irrigation"], ["rainfed", "Rainfed only"]]} err={errors.irrigation?.message} />
                <SelectField id="waterSource" label="Water source" value={v.waterSource} onChange={(x) => setValue("waterSource", x, { shouldValidate: true })} items={[["canal", "Canal"], ["borewell", "Borewell / tubewell"], ["rain", "Rain only"], ["pond", "Pond / tank"], ["other", "Other"]]} err={errors.waterSource?.message} />
                <SelectField id="drainage" label="Soil drainage" value={v.drainage} onChange={(x) => setValue("drainage", x, { shouldValidate: true })} items={[["good", "Good — water drains within hours"], ["moderate", "Moderate"], ["poor", "Poor — water stands for days"]]} err={errors.drainage?.message} />
                <div>
                  <Label htmlFor="targetYield">Target yield (optional)</Label>
                  <div className="relative mt-1.5"><Input id="targetYield" inputMode="decimal" {...register("targetYield")} className="pr-16" /><span className="absolute right-3 top-2 text-xs text-muted-foreground">q/ha</span></div>
                  {errors.targetYield && <p className="mt-1 text-xs text-destructive">{errors.targetYield.message}</p>}
                </div>
              </div>
            </section>
          )}

          {step === 3 && (
            <section>
              <h2 className="text-xl font-semibold">Review and analyze</h2>
              <p className="mt-1 text-sm text-muted-foreground">Check your entries. You can edit any section.</p>
              <div className="mt-6 space-y-5">
                <ReviewBlock title="Soil image" onEdit={() => setStep(0)}>
                  {image ? <div className="flex items-center gap-3"><img src={image.dataUrl} alt="" className="h-16 w-16 rounded-md object-cover" /><span className="text-sm">{image.name}</span></div> : <p className="text-sm text-muted-foreground">No image provided</p>}
                </ReviewBlock>
                <ReviewBlock title="Soil measurements" onEdit={() => setStep(1)}>
                  <p className="mb-3 text-xs text-muted-foreground">Source: {v.sourceType === "laboratory" ? "Laboratory" : v.sourceType === "sensor" ? "Sensor" : "None supplied"}</p>
                  <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
                    {([["pH", v.ph, ""], ["EC", v.ec, "dS/m"], ["N", v.nitrogen, "kg/ha"], ["P₂O₅", v.phosphorus, "kg/ha"], ["K₂O", v.potassium, "kg/ha"], ["Org. C", v.organicCarbon, "%"]] as const).map(([k, val, u]) => (
                      <div key={k}><dt className="text-muted-foreground">{k}</dt><dd className={cn("font-medium", (!val || v.sourceType === "none") && "text-muted-foreground font-normal")}>{val && v.sourceType !== "none" ? `${val} ${u}` : "Not measured"}</dd></div>
                    ))}
                    <div><dt className="text-muted-foreground">Texture</dt><dd className="font-medium">{v.texture ? TEXTURE_LABEL[v.texture] : "Not given"}</dd></div>
                  </dl>
                </ReviewBlock>
                <ReviewBlock title="Farm details" onEdit={() => setStep(2)}>
                  <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
                    {[["Location", `${v.district}, ${v.state}`], ["Season", v.season], ["Area", v.area ? `${v.area} ${v.areaUnit}s` : "—"], ["Irrigation", v.irrigation], ["Water", v.waterSource], ["Drainage", v.drainage]].map(([k, val]) => (
                      <div key={k}><dt className="text-muted-foreground">{k}</dt><dd className="font-medium capitalize">{val}</dd></div>
                    ))}
                  </dl>
                </ReviewBlock>
                {!sufficient && <Notice tone="error">Add a soil photo, at least one soil-test value, or the soil texture before analyzing.</Notice>}
                {sufficient && !hasMeasurement && <Notice tone="warning">No soil-test values were provided. Nutrient interpretation and fertilizer planning will be limited.</Notice>}
                {API_MODE === "demo" && (
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Checkbox checked={simFail} onCheckedChange={(c) => setSimFail(!!c)} /> Simulate a service failure (demo testing)
                  </label>
                )}
              </div>
            </section>
          )}

          <div className="mt-8 flex items-center justify-between gap-3 border-t border-border pt-5">
            <Button type="button" variant="ghost" onClick={() => setStep((s) => s - 1)} disabled={step === 0}><ArrowLeft className="h-4 w-4" />Back</Button>
            {step < 3 ? (
              <Button type="submit" disabled={step === 0 && !step0Ok}>Continue<ArrowRight className="h-4 w-4" /></Button>
            ) : (
              <Button type="submit" disabled={!sufficient || Object.keys(errors).length > 0}>Analyze Soil<ArrowRight className="h-4 w-4" /></Button>
            )}
          </div>
        </div>

        <aside className="space-y-4">
          <div className="card-surface p-5">
            <div className="flex items-center justify-between"><p className="text-sm font-semibold">What we'll use</p>{API_MODE === "demo" && <DemoBadge label="Demo mode" />}</div>
            <ul className="mt-4 space-y-2.5 text-sm">
              <Check2 ok={!!image}>Soil photograph</Check2>
              <Check2 ok={hasMeasurement}>Soil-test values</Check2>
              <Check2 ok={!!v.texture && v.texture !== "unknown"}>Soil texture</Check2>
              <Check2 ok={!!v.state && !!v.district}>Location</Check2>
              <Check2 ok={!!v.season}>Season</Check2>
              <Check2 ok={!!v.irrigation}>Irrigation</Check2>
            </ul>
          </div>
          <div className="rounded-xl bg-secondary p-5 text-sm leading-relaxed text-secondary-foreground">
            <p className="font-semibold">Tip</p>
            Your Soil Health Card lists pH, EC, organic carbon and N, P, K in the units used here.
          </div>
        </aside>
      </form>
    </AppShell>
  );
}

function Check2({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return <li className={cn("flex items-center gap-2", !ok && "text-muted-foreground")}>{ok ? <Check className="h-4 w-4 text-primary" /> : <span className="ml-1 mr-1 h-2 w-2 rounded-full border border-muted-foreground" />}{children}</li>;
}

function Notice({ children, tone = "info", className }: { children: React.ReactNode; tone?: "info" | "warning" | "error"; className?: string }) {
  const Icon = tone === "info" ? Info : tone === "warning" ? TriangleAlert : AlertCircle;
  return (
    <div role={tone === "error" ? "alert" : undefined} className={cn("flex gap-3 rounded-lg p-4 text-sm leading-relaxed",
      tone === "info" && "bg-secondary text-secondary-foreground", tone === "warning" && "bg-warning-soft text-warning-foreground", tone === "error" && "bg-destructive/10 text-destructive", className)}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />{children}
    </div>
  );
}

function NumField({ id, label, unit, tip, reg, err }: { id: string; label: string; unit: string; tip: string; reg: ReturnType<ReturnType<typeof useForm<FormValues>>["register"]>; err?: string | undefined }) {
  return (
    <div>
      <div className="flex items-center gap-1.5">
        <Label htmlFor={id}>{label}</Label>
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger type="button" aria-label={`About ${label}`} className="text-muted-foreground hover:text-foreground"><Info className="h-3.5 w-3.5" /></TooltipTrigger>
            <TooltipContent className="max-w-xs">{tip}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <div className="relative mt-1.5">
        <Input id={id} inputMode="decimal" placeholder="Not measured" {...reg} aria-invalid={!!err} className="pr-20" />
        <span className="pointer-events-none absolute right-3 top-2 text-xs text-muted-foreground">{unit}</span>
      </div>
      {err && <p className="mt-1 text-xs text-destructive">{err}</p>}
    </div>
  );
}

function TextField({ id, label, reg, err }: { id: string; label: string; reg: ReturnType<ReturnType<typeof useForm<FormValues>>["register"]>; err?: string | undefined }) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} {...reg} aria-invalid={!!err} className="mt-1.5" />
      {err && <p className="mt-1 text-xs text-destructive">{err}</p>}
    </div>
  );
}

function SelectField({ id, label, value, onChange, items, err }: { id: string; label: string; value: string; onChange: (v: string) => void; items: string[][]; err?: string | undefined }) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className="mt-1.5" aria-invalid={!!err}><SelectValue placeholder="Select…" /></SelectTrigger>
        <SelectContent>{items.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
      </Select>
      {err && <p className="mt-1 text-xs text-destructive">{err}</p>}
    </div>
  );
}

function ReviewBlock({ title, onEdit, children }: { title: string; onEdit: () => void; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{title}</h3>
        <Button type="button" variant="ghost" size="sm" onClick={onEdit}><Pencil className="h-3.5 w-3.5" />Edit</Button>
      </div>
      {children}
    </div>
  );
}
