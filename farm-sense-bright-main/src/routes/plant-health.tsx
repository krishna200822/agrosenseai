import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AlertTriangle, Loader2, RotateCcw, Search, ShieldCheck, Stethoscope } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { DemoBadge } from "@/components/brand";
import { ImageDropzone, type PickedImage } from "@/components/image-dropzone";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { analyzePlantHealth } from "@/lib/api/plant-health";
import type { PlantDiagnosis } from "@/lib/api/types";

export const Route = createFileRoute("/plant-health")({
  head: () => ({
    meta: [
      { title: "Plant Health Check — AgroSense AI" },
      { name: "description", content: "Upload a leaf or plant photo to see possible causes, verification steps and prevention options." },
      { property: "og:title", content: "Plant Health Check — AgroSense AI" },
      { property: "og:description", content: "Possible diagnoses for crop leaf and plant symptoms." },
    ],
  }),
  component: PlantHealth,
});

const CROPS = ["Wheat", "Rice", "Maize", "Soybean", "Chickpea", "Mustard", "Cotton", "Tomato", "Potato"];
const STAGES = ["Seedling", "Vegetative", "Flowering", "Fruiting / grain fill", "Maturity"];

function PlantHealth() {
  const [img, setImg] = useState<PickedImage | null>(null);
  const [crop, setCrop] = useState("");
  const [stage, setStage] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [res, setRes] = useState<PlantDiagnosis | null>(null);
  const valid = !!img && !!crop && !!stage;

  const run = async () => {
    if (!img) return;
    setState("loading");
    try {
      setRes(await analyzePlantHealth({ imageDataUrl: img.dataUrl, crop, growthStage: stage, symptoms }));
      setState("done");
    } catch { setState("error"); }
  };
  const reset = () => { setImg(null); setCrop(""); setStage(""); setSymptoms(""); setRes(null); setState("idle"); };

  return (
    <AppShell title="Plant Health" crumb="Plant Health / Diagnosis">
      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
        <form className="card-surface space-y-5 p-5 md:p-6" onSubmit={(e) => { e.preventDefault(); if (valid) run(); }}>
          <div>
            <h2 className="text-lg font-semibold">Describe the affected plant</h2>
            <p className="mt-1 text-sm text-muted-foreground">Photograph a single affected leaf in daylight, filling the frame.</p>
          </div>
          <ImageDropzone value={img} onChange={setImg} label="Drop a leaf or plant photo" compact />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="crop">Crop</Label>
              <Select value={crop} onValueChange={setCrop}><SelectTrigger id="crop" className="mt-1.5"><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>{CROPS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
            </div>
            <div>
              <Label htmlFor="stage">Growth stage</Label>
              <Select value={stage} onValueChange={setStage}><SelectTrigger id="stage" className="mt-1.5"><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>{STAGES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
            </div>
          </div>
          <div>
            <Label htmlFor="symptoms">Symptoms (optional)</Label>
            <Textarea id="symptoms" value={symptoms} onChange={(e) => setSymptoms(e.target.value.slice(0, 500))} rows={4} className="mt-1.5" placeholder="e.g. brown spots with yellow halo on lower leaves, spreading upward" />
            <p className="mt-1 text-right text-xs text-muted-foreground">{symptoms.length}/500</p>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={!valid || state === "loading"} className="flex-1">{state === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Stethoscope className="h-4 w-4" />}Analyze Plant</Button>
            {state !== "idle" && <Button type="button" variant="outline" onClick={reset}><RotateCcw className="h-4 w-4" />New</Button>}
          </div>
          {!valid && <p className="text-xs text-muted-foreground">Add a photo, crop and growth stage to continue.</p>}
        </form>

        <div>
          {state === "idle" && (
            <div className="card-surface grid-texture flex h-full min-h-80 flex-col items-center justify-center p-8 text-center">
              <Search className="h-10 w-10 text-primary" />
              <h3 className="mt-4 text-lg font-semibold">Possible causes will appear here</h3>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground">Results are possible diagnoses, never confirmed ones. Always verify in the field or with an expert.</p>
            </div>
          )}
          {state === "loading" && (
            <div className="card-surface flex min-h-80 flex-col items-center justify-center p-8 text-center">
              <Loader2 className="h-9 w-9 animate-spin text-primary" />
              <p className="mt-4 font-medium">Comparing symptoms with known conditions…</p>
              <p className="mt-1 text-xs text-muted-foreground">Demo mode — no AI model is called.</p>
            </div>
          )}
          {state === "error" && (
            <div className="card-surface flex min-h-80 flex-col items-center justify-center p-8 text-center">
              <AlertTriangle className="h-9 w-9 text-destructive" /><p className="mt-4 font-medium">Diagnosis failed</p>
              <Button className="mt-4" onClick={run}><RotateCcw className="h-4 w-4" />Retry</Button>
            </div>
          )}
          {state === "done" && res && (
            <div className="space-y-5">
              <div className="card-surface p-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-lg font-semibold">Possible diagnoses · {crop}</h3>
                  {res.mode === "demo" && <DemoBadge label="Demonstration result" />}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">Ranked possibilities — not confirmed diagnoses.</p>
                <ul className="mt-5 space-y-4">
                  {res.possibleConditions.map((c) => (
                    <li key={c.name}>
                      <div className="flex items-center justify-between text-sm"><span className="font-medium">{c.name} <span className="ml-1 text-xs font-normal capitalize text-muted-foreground">{c.kind}</span></span><span className="text-muted-foreground">{Math.round(c.confidence * 100)}%</span></div>
                      <Progress value={c.confidence * 100} className="mt-2 h-2" />
                    </li>
                  ))}
                </ul>
                {res.lowConfidence && (
                  <p className="mt-5 flex gap-2 rounded-lg bg-warning-soft p-3 text-sm text-warning-foreground"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />Confidence is low. Please consult a local agricultural expert or Krishi Vigyan Kendra before treating.</p>
                )}
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                <ListCard title="Observed symptoms" items={res.observedSymptoms} />
                <ListCard title="Alternative explanations" items={res.alternatives} />
                <ListCard title="Verify before acting" items={res.verificationSteps} />
                <ListCard title="Prevention" items={res.prevention} />
              </div>
              <div className="card-surface p-6">
                <div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /><h4 className="font-semibold">Treatment options</h4></div>
                <ul className="mt-2 list-disc space-y-1.5 pl-4 text-sm text-muted-foreground">{res.treatment.map((t) => <li key={t}>{t}</li>)}</ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function ListCard({ title, items }: { title: string; items: string[] }) {
  return <div className="card-surface p-5"><h4 className="font-semibold">{title}</h4><ul className="mt-2 list-disc space-y-1.5 pl-4 text-sm text-muted-foreground">{items.map((i) => <li key={i}>{i}</li>)}</ul></div>;
}
