import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, CalendarDays, CloudSun, FileText, FlaskConical, Leaf, MapPin, Sprout, Wheat, ClipboardList } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AppShell } from "@/components/app-shell";
import { DemoBadge } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getSoilAnalysis } from "@/lib/api/soil";
import type { SoilAnalysisResponse } from "@/lib/api/types";
import { DEMO_CROPS, DEMO_HISTORY } from "@/lib/api/mock-data";
import { CROP_IMAGES } from "@/lib/crop-images";
import { formatNutrient, useSettings } from "@/lib/settings";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Farm Dashboard — AgroSense AI" },
      { name: "description", content: "Your farm health overview: soil analyses, nutrients, crops and seasonal activities." },
      { property: "og:title", content: "Farm Dashboard — AgroSense AI" },
      { property: "og:description", content: "Overview of soil analyses, nutrient levels and recommended crops." },
    ],
  }),
  component: Dashboard,
});

function greetingKey() {
  const h = new Date().getHours();
  return h < 12 ? "goodMorning" : h < 17 ? "goodAfternoon" : "goodEvening";
}

function Dashboard() {
  const { t, settings } = useSettings();
  const [view, setView] = useState<"demo" | "mine">("demo");
  const [mine, setMine] = useState<SoilAnalysisResponse | null>(null);
  const [greet, setGreet] = useState<"goodMorning" | "goodAfternoon" | "goodEvening">("goodMorning");
  useEffect(() => { setGreet(greetingKey()); getSoilAnalysis().then(setMine); }, []);

  return (
    <AppShell title={t("overview")} crumb="Dashboard">
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold md:text-3xl">{t(greet)}, {settings.name}.</h2>
          <p className="mt-1 text-muted-foreground">{t("farmOverview")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild><Link to="/soil-analysis"><FlaskConical className="h-4 w-4" />{t("startSoil")}</Link></Button>
          <Button variant="outline" asChild><Link to="/plant-health"><Leaf className="h-4 w-4" />{t("checkPlant")}</Link></Button>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <Tabs value={view} onValueChange={(v) => setView(v as "demo" | "mine")}>
          <TabsList>
            <TabsTrigger value="demo">Demo farm</TabsTrigger>
            <TabsTrigger value="mine">My analyses</TabsTrigger>
          </TabsList>
        </Tabs>
        {view === "demo" && <DemoBadge />}
      </div>

      {view === "mine" ? (mine ? <MyLatest a={mine} /> : <EmptyState />) : <DemoDashboard unit={settings.nutrientUnit} />}
    </AppShell>
  );
}

function EmptyState() {
  return (
    <div className="card-surface grid-texture mt-6 flex flex-col items-center px-6 py-16 text-center">
      <span className="grid h-16 w-16 place-items-center rounded-2xl bg-secondary text-primary"><Sprout className="h-7 w-7" /></span>
      <h3 className="mt-5 text-xl font-semibold">No soil analyses yet</h3>
      <p className="mt-2 max-w-md text-muted-foreground">Start with a soil photo and, if you have it, your Soil Health Card values. Your first report takes about five minutes.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button asChild><Link to="/soil-analysis">Start your first analysis <ArrowRight className="h-4 w-4" /></Link></Button>
        <Button variant="ghost" asChild><Link to="/recommendations">Browse crops</Link></Button>
      </div>
    </div>
  );
}

function MyLatest({ a }: { a: SoilAnalysisResponse }) {
  return (
    <div className="card-surface mt-6 flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
      <div>
        <p className="text-sm text-muted-foreground">Latest report · {new Date(a.createdAt).toLocaleString()}</p>
        <h3 className="mt-1 text-lg font-semibold">{a.farm.district}, {a.farm.state}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{a.missingInputs.length} missing inputs · {a.crops.length} crops suggested</p>
      </div>
      <div className="flex items-center gap-3">
        {a.mode === "demo" && <DemoBadge />}
        <Button asChild><Link to="/soil-analysis/results">View report</Link></Button>
      </div>
    </div>
  );
}

function DemoDashboard({ unit }: { unit: "kg/ha" | "lb/acre" }) {
  const factor = unit === "kg/ha" ? 1 : 0.892;
  const nutrients = [{ n: "Nitrogen", v: 236 }, { n: "Phosphorus", v: 18 }, { n: "Potassium", v: 310 }].map((d) => ({ ...d, v: Math.round(d.v * factor) }));
  const summary = [
    { icon: FileText, label: "Soil analyses completed", value: "3" },
    { icon: MapPin, label: "Farms tracked", value: "2" },
    { icon: Wheat, label: "Crop recommendations", value: "4" },
    { icon: ClipboardList, label: "Pending soil measurements", value: "2" },
  ];
  const planner = [
    ["Oct 15 – Nov 10", "Rabi sowing window — wheat, chickpea"],
    ["Oct 20", "Apply compost before final tillage"],
    ["Nov 25", "First irrigation at crown-root initiation (wheat)"],
    ["Dec", "Scout chickpea for pod borer; install pheromone traps"],
  ];
  return (
    <>
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {summary.map((s) => (
          <div key={s.label} className="card-surface p-5">
            <s.icon className="h-5 w-5 text-primary" />
            <p className="mt-4 text-3xl font-semibold">{s.value}</p>
            <p className="mt-1 text-sm text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className="card-surface p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Soil nutrient overview <span className="font-normal text-muted-foreground">({unit})</span></h3>
            <span className="text-xs text-muted-foreground">Source: laboratory · North Plot</span>
          </div>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={nutrients} margin={{ left: -10 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="n" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: "var(--muted)" }} />
                <Bar dataKey="v" name={unit} fill="var(--primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="card-surface p-6">
          <h3 className="font-semibold">Latest soil analysis</h3>
          <p className="mt-1 text-sm text-muted-foreground">North Plot · 28 Sep 2026</p>
          <dl className="mt-4 space-y-3 text-sm">
            {[["pH", "6.8", "Lab"], ["EC", "0.42 dS/m", "Lab"], ["Nitrogen", formatNutrient(236, unit), "Lab"], ["Organic carbon", "0.61 %", "Lab"], ["Texture", "Loam", "Lab"]].map(([k, v, s]) => (
              <div key={k} className="flex items-center justify-between border-b border-border pb-2 last:border-0">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="font-medium">{v} <span className="ml-1 text-xs font-normal text-muted-foreground">{s}</span></dd>
              </div>
            ))}
          </dl>
        </section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className="card-surface p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Recommended crops</h3>
            <Link to="/recommendations" className="text-sm font-medium text-primary hover:underline">See all</Link>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {DEMO_CROPS.filter((c) => c.season === "rabi").map((c) => (
              <div key={c.id} className="overflow-hidden rounded-lg border border-border">
                <img src={CROP_IMAGES[c.imageKey]} alt={c.name} loading="lazy" className="h-24 w-full object-cover" />
                <div className="p-3"><p className="font-medium">{c.name}</p><p className="text-xs text-muted-foreground">{c.durationDays[0]}–{c.durationDays[1]} days · {c.waterNeed} water</p></div>
              </div>
            ))}
          </div>
        </section>
        <section className="card-surface p-6">
          <div className="flex items-center gap-2"><CloudSun className="h-5 w-5 text-primary" /><h3 className="font-semibold">Weather</h3></div>
          <div className="mt-4 rounded-lg border border-dashed border-input p-5 text-center">
            <p className="text-sm font-medium">Weather not connected</p>
            <p className="mt-1 text-xs text-muted-foreground">Forecasts will appear when a weather service is linked to the backend.</p>
          </div>
        </section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className="card-surface p-6">
          <div className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-primary" /><h3 className="font-semibold">Seasonal planner</h3></div>
          <ol className="mt-4 space-y-4">
            {planner.map(([d, a]) => (
              <li key={d} className="grid grid-cols-[96px_1fr] gap-3 text-sm"><span className="font-medium text-primary">{d}</span><span className="text-muted-foreground">{a}</span></li>
            ))}
          </ol>
        </section>
        <section className="card-surface p-6">
          <div className="flex items-center justify-between"><h3 className="font-semibold">Recent reports</h3><Link to="/history" className="text-sm font-medium text-primary hover:underline">History</Link></div>
          <ul className="mt-4 divide-y divide-border">
            {DEMO_HISTORY.slice(0, 4).map((h) => (
              <li key={h.id} className="flex items-center justify-between py-2.5 text-sm">
                <span><span className="font-medium">{h.farm}</span><span className="block text-xs text-muted-foreground">{h.date}</span></span>
                <span className="text-xs capitalize text-muted-foreground">{h.status}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="grid gap-3">
          {[
            { to: "/soil-analysis" as const, icon: FlaskConical, t: "New soil analysis", d: "Photo, lab values, farm details" },
            { to: "/plant-health" as const, icon: Leaf, t: "Check a sick plant", d: "Leaf photo + symptoms" },
            { to: "/recommendations" as const, icon: Wheat, t: "Compare crops", d: "Season, water, duration" },
          ].map((q) => (
            <Link key={q.t} to={q.to} className="card-surface flex items-center gap-4 p-4 transition-shadow hover:shadow-[var(--shadow-lift)]">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-secondary text-primary"><q.icon className="h-5 w-5" /></span>
              <span className="min-w-0 flex-1"><span className="block font-medium">{q.t}</span><span className="block truncate text-xs text-muted-foreground">{q.d}</span></span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          ))}
        </section>
      </div>
    </>
  );
}
