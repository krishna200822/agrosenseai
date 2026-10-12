import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Beaker, Bot, Camera, Cpu, Download, Droplets, FlaskConical, Info, Leaf, Bug, ImageOff, CloudSun } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AppShell } from "@/components/app-shell";
import { DemoBadge } from "@/components/brand";
import { CropCard, CropDetailDialog, CropFilters, EMPTY_FILTERS, filterCrops } from "@/components/crop-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getSoilAnalysis, TEXTURE_LABEL } from "@/lib/api/soil";
import type { CropRecommendation, Measurement, SoilAnalysisResponse } from "@/lib/api/types";
import { formatArea, formatNutrient, useSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/soil-analysis/results")({
  head: () => ({
    meta: [
      { title: "Soil Report — AgroSense AI" },
      { name: "description", content: "Soil analysis results with measurements, crop, fertilizer, irrigation and pest guidance." },
      { property: "og:title", content: "Soil Report — AgroSense AI" },
      { property: "og:description", content: "Your soil analysis report." },
    ],
  }),
  component: Results,
});

const SOURCE_META: Record<string, { label: string; icon: typeof Beaker }> = {
  laboratory: { label: "Laboratory", icon: Beaker },
  sensor: { label: "Sensor", icon: Cpu },
  image_observation: { label: "Image observation", icon: Camera },
  ai_hypothesis: { label: "AI hypothesis", icon: Bot },
  user_input: { label: "User input", icon: Info },
};

function Results() {
  const [data, setData] = useState<SoilAnalysisResponse | null | undefined>(undefined);
  useEffect(() => { getSoilAnalysis().then(setData).catch(() => setData(null)); }, []);

  return (
    <AppShell title="Soil Report" crumb="Soil Analysis / Results"
      actions={data ? <Button size="sm" variant="outline" onClick={() => window.print()} className="no-print hidden sm:inline-flex"><Download className="h-4 w-4" />Download Report</Button> : null}>
      {data === undefined ? <ResultsSkeleton /> : data === null ? <NoReport /> : <Report a={data} />}
    </AppShell>
  );
}

function ResultsSkeleton() {
  return <div className="space-y-4"><Skeleton className="h-28 w-full" /><div className="grid gap-4 md:grid-cols-3"><Skeleton className="h-40" /><Skeleton className="h-40" /><Skeleton className="h-40" /></div><Skeleton className="h-72 w-full" /></div>;
}

function NoReport() {
  return (
    <div className="card-surface grid-texture mx-auto max-w-xl px-6 py-16 text-center">
      <FlaskConical className="mx-auto h-10 w-10 text-primary" />
      <h2 className="mt-4 text-xl font-semibold">No report to show</h2>
      <p className="mt-2 text-muted-foreground">Reports are kept only in this browser tab during the demo. Run a new soil analysis to see results here.</p>
      <Button asChild className="mt-6"><Link to="/soil-analysis">Start soil analysis</Link></Button>
    </div>
  );
}

function SourceTag({ source }: { source: string | null }) {
  if (!source) return <span className="text-xs text-muted-foreground">No source</span>;
  const m = SOURCE_META[source];
  return <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground"><m.icon className="h-3 w-3" />{m.label}</span>;
}

function Report({ a }: { a: SoilAnalysisResponse }) {
  const { settings } = useSettings();
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [detail, setDetail] = useState<CropRecommendation | null>(null);
  const crops = useMemo(() => filterCrops(a.crops, filters), [a.crops, filters]);
  const sources = Array.from(new Set(Object.values(a.measurements).map((m) => m.source).filter(Boolean))) as string[];
  if (a.imageDataUrl) sources.push("image_observation");
  sources.push("ai_hypothesis");

  const cards: [string, string, Measurement][] = [
    ["ph", "pH", a.measurements.ph], ["ec", "Electrical conductivity", a.measurements.ec], ["nitrogen", "Nitrogen (N)", a.measurements.nitrogen],
    ["phosphorus", "Phosphorus (P₂O₅)", a.measurements.phosphorus], ["potassium", "Potassium (K₂O)", a.measurements.potassium], ["organicCarbon", "Organic carbon", a.measurements.organicCarbon],
  ];
  const npk = (["nitrogen", "phosphorus", "potassium"] as const).map((k) => ({ k, label: k === "nitrogen" ? "N" : k === "phosphorus" ? "P₂O₅" : "K₂O", v: a.measurements[k].value }));
  const factor = settings.nutrientUnit === "kg/ha" ? 1 : 0.892;
  const chartData = npk.filter((d) => d.v !== null).map((d) => ({ ...d, v: Math.round((d.v as number) * factor) }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="card-surface p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-semibold">Soil analysis report</h2>
              {a.mode === "demo" && <DemoBadge label="Demonstration data" />}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {a.farm.district}, {a.farm.state} · <span className="capitalize">{a.farm.season}</span> season · {formatArea(a.farm.area, a.farm.areaUnit as "acre", settings.areaUnit)} · {new Date(a.createdAt).toLocaleString()}
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">{sources.map((s) => <SourceTag key={s} source={s} />)}</div>
          </div>
          <Button variant="outline" onClick={() => window.print()} className="no-print sm:hidden"><Download className="h-4 w-4" />Download Report</Button>
        </div>
        {a.warnings.length > 0 && (
          <ul className="mt-5 space-y-2">
            {a.warnings.map((w) => <li key={w} className="flex gap-2 rounded-lg bg-warning-soft px-3 py-2 text-sm text-warning-foreground"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{w}</li>)}
          </ul>
        )}
      </section>

      {/* A. Overview */}
      <section className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="card-surface overflow-hidden">
          {a.imageDataUrl ? <img src={a.imageDataUrl} alt="Submitted soil" className="h-56 w-full object-cover" /> : (
            <div className="grid h-56 place-items-center bg-muted text-muted-foreground"><div className="text-center"><ImageOff className="mx-auto h-8 w-8" /><p className="mt-2 text-sm">No soil image submitted</p></div></div>
          )}
          <div className="space-y-3 p-5 text-sm">
            <div><p className="text-xs text-muted-foreground">Soil texture</p><p className="font-medium">{a.texture ? TEXTURE_LABEL[a.texture] : "Not provided"} {a.texture && <SourceTag source={a.measurements.ph.source ?? "user_input"} />}</p></div>
            <div><p className="text-xs text-muted-foreground">Image observations</p>
              {a.imageObservations.visibleCharacteristics.length ? <ul className="mt-1 list-disc pl-4">{a.imageObservations.visibleCharacteristics.map((c) => <li key={c}>{c}</li>)}</ul> : <p className="text-muted-foreground">None</p>}
            </div>
          </div>
        </div>
        <div className="card-surface p-6">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Overall interpretation</h3>
            <Confidence level={a.confidence} />
          </div>
          <p className="mt-3 leading-relaxed text-muted-foreground">{a.interpretation}</p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-border p-4">
              <p className="flex items-center gap-2 text-sm font-semibold"><AlertTriangle className="h-4 w-4 text-warning" />Missing inputs</p>
              {a.missingInputs.length ? <ul className="mt-2 flex flex-wrap gap-1.5">{a.missingInputs.map((m) => <li key={m} className="rounded-full bg-muted px-2.5 py-0.5 text-xs">{m}</li>)}</ul> : <p className="mt-2 text-sm text-muted-foreground">All core inputs supplied.</p>}
            </div>
            <div className="rounded-lg border border-border p-4">
              <p className="flex items-center gap-2 text-sm font-semibold"><Bot className="h-4 w-4 text-primary" />AI-generated hypotheses</p>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-muted-foreground">{a.hypotheses.map((h) => <li key={h}>{h}</li>)}</ul>
            </div>
          </div>
        </div>
      </section>

      {/* B. Measurements */}
      <section>
        <h3 className="mb-3 font-semibold">Soil measurements</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map(([k, label, m]) => {
            const isNutrient = ["nitrogen", "phosphorus", "potassium"].includes(k);
            const shown = m.value === null ? null : isNutrient ? formatNutrient(m.value, settings.nutrientUnit) : `${m.value} ${m.unit === "pH units" ? "" : m.unit}`;
            return (
              <div key={k} className="card-surface p-5">
                <div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">{label}</p><SourceTag source={m.source} /></div>
                <p className={cn("mt-2 text-2xl font-semibold", m.value === null && "text-base font-medium text-muted-foreground")}>{shown ?? "Not measured"}</p>
                {k === "ph" && m.value !== null && <PhScale v={m.value} />}
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                  {m.value === null ? "Add a laboratory or sensor value to include this parameter." : "Status classification requires crop-specific thresholds from validated reference data."}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* C. Nutrient chart */}
      <section className="card-surface p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold">Primary nutrients <span className="font-normal text-muted-foreground">({settings.nutrientUnit})</span></h3>
          <span className="text-xs text-muted-foreground">Same unit for all bars · crop reference ranges not yet available</span>
        </div>
        {chartData.length ? (
          <div className="mt-4 h-64" role="img" aria-label={`Bar chart of measured nutrients: ${chartData.map((d) => `${d.label} ${d.v}`).join(", ")} ${settings.nutrientUnit}`}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ left: -10 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: "var(--muted)" }} formatter={(v) => [`${v} ${settings.nutrientUnit}`, "Measured"]} />
                <Bar dataKey="v" radius={[6, 6, 0, 0]}>{chartData.map((d, i) => <Cell key={d.k} fill={`var(--chart-${i + 1})`} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : <p className="mt-4 rounded-lg border border-dashed border-input p-6 text-center text-sm text-muted-foreground">No nutrient measurements to chart.</p>}
        <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
          {chartData.map((d, i) => <span key={d.k} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: `var(--chart-${i + 1})` }} />{d.label}</span>)}
        </div>
      </section>

      {/* D–G tabs */}
      <Tabs defaultValue="crops">
        <TabsList className="no-print h-auto flex-wrap">
          <TabsTrigger value="crops"><Leaf className="h-4 w-4" />Crops</TabsTrigger>
          <TabsTrigger value="fertilizer"><FlaskConical className="h-4 w-4" />Fertilizer</TabsTrigger>
          <TabsTrigger value="irrigation"><Droplets className="h-4 w-4" />Irrigation</TabsTrigger>
          <TabsTrigger value="pests"><Bug className="h-4 w-4" />Pest management</TabsTrigger>
        </TabsList>

        <TabsContent value="crops" className="mt-5">
          <CropFilters value={filters} onChange={setFilters} />
          {crops.length ? (
            <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">{crops.map((c) => <CropCard key={c.id} crop={c} onDetails={() => setDetail(c)} />)}</div>
          ) : (
            <div className="mt-5 rounded-lg border border-dashed border-input p-8 text-center text-sm text-muted-foreground">No crops match these filters. <button className="font-medium text-primary underline" onClick={() => setFilters(EMPTY_FILTERS)}>Clear filters</button></div>
          )}
        </TabsContent>

        <TabsContent value="fertilizer" className="mt-5 grid gap-5 lg:grid-cols-2">
          <div className="card-surface p-6">
            <h4 className="font-semibold">Identified nutrient constraints</h4>
            {a.fertilizer.constraints.length ? <ul className="mt-3 list-disc space-y-1.5 pl-4 text-sm text-muted-foreground">{a.fertilizer.constraints.map((c) => <li key={c}>{c}</li>)}</ul> : <p className="mt-3 text-sm text-muted-foreground">None identified from the values supplied.</p>}
            <h4 className="mt-5 font-semibold">Nutrient requirements</h4>
            {a.fertilizer.requirements.length ? <ul className="mt-3 list-disc space-y-1.5 pl-4 text-sm text-muted-foreground">{a.fertilizer.requirements.map((c) => <li key={c}>{c}</li>)}</ul> : <p className="mt-3 text-sm text-muted-foreground">Requires soil-test values.</p>}
            {!a.fertilizer.dosageAvailable && <p className="mt-5 flex gap-2 rounded-lg bg-secondary p-3 text-sm text-secondary-foreground"><Info className="mt-0.5 h-4 w-4 shrink-0" />{a.fertilizer.explanation}</p>}
          </div>
          <div className="card-surface overflow-x-auto p-6">
            <h4 className="font-semibold">Fertilizer options</h4>
            <table className="mt-3 w-full min-w-[480px] text-left text-sm">
              <thead className="text-xs text-muted-foreground"><tr><th className="pb-2 font-medium">Option</th><th className="pb-2 font-medium">Quantity</th><th className="pb-2 font-medium">Timing</th><th className="pb-2 font-medium">Method</th></tr></thead>
              <tbody className="divide-y divide-border">
                {a.fertilizer.options.map((o) => (
                  <tr key={o.name}><td className="py-2.5 pr-3"><span className="font-medium">{o.name}</span><span className="block text-xs text-muted-foreground">{o.purpose}</span></td><td className="py-2.5 pr-3 text-muted-foreground">{o.quantity ?? "Needs validated calc."}</td><td className="py-2.5 pr-3">{o.timing}</td><td className="py-2.5">{o.method}</td></tr>
                ))}
              </tbody>
            </table>
            <h4 className="mt-5 font-semibold">Cautions</h4>
            <ul className="mt-2 space-y-1.5 text-sm">{a.fertilizer.cautions.map((c) => <li key={c} className="flex gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />{c}</li>)}</ul>
          </div>
        </TabsContent>

        <TabsContent value="irrigation" className="mt-5 grid gap-5 lg:grid-cols-3">
          <div className="card-surface p-6 lg:col-span-2">
            <h4 className="font-semibold">Weekly irrigation schedule</h4>
            {a.irrigation.estimateAvailable ? (
              <div className="mt-4 h-56"><ResponsiveContainer><BarChart data={a.irrigation.weekly}><XAxis dataKey="week" /><YAxis /><Bar dataKey="mm" fill="var(--chart-5)" /></BarChart></ResponsiveContainer></div>
            ) : (
              <div className="mt-4 rounded-lg border border-dashed border-input p-6 text-center">
                <p className="text-sm font-medium">Estimate not available yet</p>
                <p className="mt-1 text-sm text-muted-foreground">A schedule needs: {a.irrigation.missingForEstimate.join(", ")}.</p>
              </div>
            )}
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div><p className="text-xs text-muted-foreground">Water needs summary</p><p className="mt-1 text-sm">{a.irrigation.summary}</p></div>
              <div><p className="text-xs text-muted-foreground">Suggested method</p><p className="mt-1 text-sm">{a.irrigation.method}</p></div>
            </div>
          </div>
          <div className="space-y-5">
            <div className="card-surface p-6"><div className="flex items-center gap-2"><CloudSun className="h-5 w-5 text-primary" /><h4 className="font-semibold">Rainfall & weather</h4></div><p className="mt-2 text-sm text-muted-foreground">Not connected. Forecast-based adjustments will appear here.</p></div>
            <div className="card-surface p-6"><h4 className="font-semibold">Water conservation</h4><ul className="mt-2 list-disc space-y-1.5 pl-4 text-sm text-muted-foreground">{a.irrigation.tips.map((t) => <li key={t}>{t}</li>)}</ul></div>
          </div>
        </TabsContent>

        <TabsContent value="pests" className="mt-5 space-y-5">
          <p className="flex gap-2 rounded-lg bg-secondary p-3 text-sm text-secondary-foreground"><Info className="mt-0.5 h-4 w-4 shrink-0" />These are potential concerns for the suggested crops — not a diagnosis. A soil photo cannot detect plant disease. Use <Link to="/plant-health" className="font-medium underline">Plant Health</Link> for leaf symptoms.</p>
          <div className="grid gap-4 md:grid-cols-3">
            {a.pests.concerns.map((c) => (
              <div key={c.name} className="card-surface p-5"><p className="text-xs text-muted-foreground">{c.crop}</p><p className="mt-1 font-semibold">{c.name}</p><p className="mt-2 text-sm text-muted-foreground"><span className="font-medium text-foreground">Inspect for: </span>{c.symptoms}</p></div>
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {[["Prevention", a.pests.prevention], ["Integrated pest management", a.pests.ipm], ["Biological & mechanical", a.pests.biological]].map(([t, items]) => (
              <div key={t as string} className="card-surface p-5"><h4 className="font-semibold">{t as string}</h4><ul className="mt-2 list-disc space-y-1.5 pl-4 text-sm text-muted-foreground">{(items as string[]).map((i) => <li key={i}>{i}</li>)}</ul></div>
            ))}
          </div>
          <p className="flex gap-2 rounded-lg bg-warning-soft p-3 text-sm text-warning-foreground"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{a.pests.chemicalNote}</p>
        </TabsContent>
      </Tabs>

      <p className="text-xs text-muted-foreground">References: {a.references.map((r) => <a key={r.title} href={r.url} target="_blank" rel="noreferrer" className="underline">{r.title}</a>)}</p>
      <CropDetailDialog crop={detail} onClose={() => setDetail(null)} />
    </div>
  );
}

function Confidence({ level }: { level: "low" | "moderate" | "high" }) {
  const n = level === "low" ? 1 : level === "moderate" ? 2 : 3;
  return (
    <span className="flex items-center gap-2 text-xs text-muted-foreground" aria-label={`Confidence: ${level}`}>
      Confidence
      <span className="flex gap-0.5">{[1, 2, 3].map((i) => <span key={i} className={cn("h-2 w-5 rounded-full", i <= n ? (n === 1 ? "bg-warning" : "bg-primary") : "bg-border")} />)}</span>
      <span className="font-medium capitalize text-foreground">{level}</span>
    </span>
  );
}

function PhScale({ v }: { v: number }) {
  return (
    <div className="mt-3" aria-hidden>
      <div className="relative h-2 rounded-full" style={{ background: "linear-gradient(90deg, var(--chart-4), var(--fresh), var(--chart-5))" }}>
        <span className="absolute -top-1 h-4 w-1 rounded bg-foreground" style={{ left: `${(v / 14) * 100}%` }} />
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground"><span>0 acidic</span><span>7</span><span>14 alkaline</span></div>
    </div>
  );
}
