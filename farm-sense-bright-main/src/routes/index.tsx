import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Beaker, Bug, Camera, ClipboardList, Droplets, FileText, FlaskConical, Leaf, Menu, MapPin, ShieldCheck, Sprout, Wheat, X } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import heroImg from "@/assets/hero-field.jpg";
import soilImg from "@/assets/soil-sample.jpg";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { DemoBadge, LanguageSelect, Logo, SectionTitle } from "@/components/brand";
import { useSettings } from "@/lib/settings";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AgroSense AI — Understand Your Soil. Grow Smarter." },
      { name: "description", content: "Turn soil data into smarter farming decisions with AI-assisted crop, fertilizer and irrigation insights." },
      { property: "og:title", content: "AgroSense AI — Understand Your Soil. Grow Smarter." },
      { property: "og:description", content: "AI-assisted precision agriculture: soil analysis, crop suggestions, nutrient and irrigation planning." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="bg-background">
      <SiteNav />
      <Hero />
      <Capabilities />
      <Workflow />
      <Features />
      <DashboardPreview />
      <Transparency />
      <Faq />
      <Footer />
    </div>
  );
}

function SiteNav() {
  const { t } = useSettings();
  const [open, setOpen] = useState(false);
  const links = [
    { href: "#top", label: t("home") },
    { href: "#features", label: t("features") },
  ];
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-5 md:px-8">
        <Logo />
        <nav className="hidden items-center gap-7 text-sm font-medium text-muted-foreground md:flex" aria-label="Main">
          {links.map((l) => <a key={l.href} href={l.href} className="hover:text-foreground">{l.label}</a>)}
          <Link to="/soil-analysis" className="hover:text-foreground">{t("soilAnalysis")}</Link>
          <Link to="/plant-health" className="hover:text-foreground">{t("plantHealth")}</Link>
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <LanguageSelect />
          <Button variant="ghost" asChild><Link to="/dashboard">{t("signIn")}</Link></Button>
          <Button asChild><Link to="/soil-analysis">{t("getStarted")}</Link></Button>
        </div>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>
      {open && (
        <div className="border-t border-border bg-background px-5 py-4 md:hidden">
          <nav className="flex flex-col gap-1 text-sm font-medium" aria-label="Mobile">
            {links.map((l) => <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="rounded-md px-2 py-2 hover:bg-muted">{l.label}</a>)}
            <Link to="/soil-analysis" className="rounded-md px-2 py-2 hover:bg-muted">{t("soilAnalysis")}</Link>
            <Link to="/plant-health" className="rounded-md px-2 py-2 hover:bg-muted">{t("plantHealth")}</Link>
          </nav>
          <div className="mt-3 flex gap-2">
            <LanguageSelect />
            <Button variant="outline" asChild className="flex-1"><Link to="/dashboard">{t("signIn")}</Link></Button>
            <Button asChild className="flex-1"><Link to="/soil-analysis">{t("getStarted")}</Link></Button>
          </div>
        </div>
      )}
    </header>
  );
}

function Hero() {
  return (
    <section id="top" className="relative overflow-hidden">
      <img src={heroImg} alt="Farmer holding soil in a field at sunrise" width={1600} height={1104} className="absolute inset-0 h-full w-full object-cover" />
      <div className="hero-scrim absolute inset-0" />
      <div className="relative mx-auto grid max-w-7xl gap-12 px-5 pb-24 pt-20 md:px-8 md:pb-32 md:pt-28 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
        <div className="max-w-2xl text-forest-foreground">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-forest-foreground/25 px-3 py-1 text-xs font-medium tracking-wide">
            <Sprout className="h-3.5 w-3.5" /> Understand Your Soil. Grow Smarter.
          </p>
          <h1 className="text-4xl font-semibold leading-[1.08] md:text-6xl">
            Your Soil Has a Story.<br /><span className="text-fresh">Let AI Help You Read It.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-forest-foreground/85 md:text-lg">
            Turn soil data into smarter farming decisions. Analyze soil characteristics, discover suitable crops, plan nutrients, and make informed irrigation decisions with AI-assisted agricultural insights.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Button size="lg" asChild className="bg-fresh text-forest hover:bg-fresh/90"><Link to="/soil-analysis">Analyze My Soil <ArrowRight className="h-4 w-4" /></Link></Button>
            <Button size="lg" variant="outline" asChild className="border-forest-foreground/40 bg-transparent text-forest-foreground hover:bg-forest-foreground/10 hover:text-forest-foreground"><Link to="/dashboard">Explore Platform</Link></Button>
          </div>
        </div>
        <div className="card-surface w-full max-w-sm justify-self-end p-5 shadow-[var(--shadow-lift)]">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Soil report preview</p>
            <DemoBadge label="Demonstration" />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {[["Soil pH", "6.8", "lab"], ["EC", "0.42 dS/m", "lab"], ["Texture", "Loamy", "lab"], ["Org. carbon", "0.61 %", "lab"]].map(([k, v]) => (
              <div key={k} className="rounded-lg bg-muted p-3">
                <p className="text-xs text-muted-foreground">{k}</p>
                <p className="mt-1 text-lg font-semibold">{v}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs font-medium text-muted-foreground">Crop suggestions</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {["Wheat", "Soybean", "Chickpea"].map((c) => <span key={c} className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">{c}</span>)}
          </div>
          <p className="mt-4 border-t border-border pt-3 text-[11px] leading-relaxed text-muted-foreground">Illustrative values for demonstration. Measured values like pH and EC come from lab tests, not photos.</p>
        </div>
      </div>
    </section>
  );
}

function Capabilities() {
  const stats = [
    ["4-step", "guided soil intake"], ["6+", "nutrient & soil parameters"], ["5", "decision areas covered"], ["0", "values guessed from photos"],
  ];
  return (
    <section className="border-b border-border bg-card">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-5 py-10 md:grid-cols-4 md:px-8">
        {stats.map(([n, l]) => (
          <div key={l}>
            <p className="text-3xl font-semibold text-forest">{n}</p>
            <p className="mt-1 text-sm text-muted-foreground">{l}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Workflow() {
  const steps = [
    { icon: Camera, title: "Upload a soil photo", desc: "Visual clues on colour and apparent texture." },
    { icon: ClipboardList, title: "Add soil-test values", desc: "pH, EC, NPK and organic carbon from a lab or sensor." },
    { icon: MapPin, title: "Describe your farm", desc: "Region, season, water source and drainage." },
    { icon: FileText, title: "Get your report", desc: "Crops, nutrients, irrigation and pest guidance." },
  ];
  return (
    <section className="mx-auto max-w-7xl px-5 py-20 md:px-8 md:py-28">
      <SectionTitle eyebrow="How it works" title="From a handful of soil to a clear plan" desc="Each step adds evidence. The report tells you exactly which inputs it used — and which are missing." />
      <ol className="mt-12 grid gap-5 md:grid-cols-4">
        {steps.map((s, i) => (
          <li key={s.title} className="card-surface relative p-6">
            <span className="text-xs font-semibold text-muted-foreground">STEP {i + 1}</span>
            <s.icon className="mt-4 h-6 w-6 text-primary" />
            <h3 className="mt-4 font-semibold">{s.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Features() {
  const items = [
    { icon: Beaker, title: "Soil analysis", desc: "Organise lab, sensor and image observations — each clearly labelled by source.", to: "/soil-analysis" as const },
    { icon: Wheat, title: "Crop suggestions", desc: "Filter crops by season, water need and duration, then compare side by side.", to: "/recommendations" as const },
    { icon: FlaskConical, title: "Fertilizer planning", desc: "Nutrient constraints, timing and method — dosages only from validated calculations.", to: "/soil-analysis" as const },
    { icon: Droplets, title: "Irrigation planning", desc: "Water-need summaries and schedules once weather and growth stage are known.", to: "/soil-analysis" as const },
    { icon: Leaf, title: "Plant health", desc: "Upload a leaf photo for possible causes, verification steps and prevention.", to: "/plant-health" as const },
    { icon: Bug, title: "Pest management", desc: "Integrated pest management first: scouting, biological and mechanical controls.", to: "/soil-analysis" as const },
  ];
  return (
    <section id="features" className="bg-secondary/60">
      <div className="mx-auto max-w-7xl px-5 py-20 md:px-8 md:py-28">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:items-center">
          <div>
            <SectionTitle eyebrow="Platform" title="Everything a season needs, in one report" desc="Built around the questions farmers actually ask before sowing." />
            <img src={soilImg} alt="Soil sample in a tray" loading="lazy" width={944} height={704} className="mt-8 hidden h-64 w-full rounded-xl object-cover lg:block" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {items.map((f) => (
              <Link key={f.title} to={f.to} className="card-surface group p-6 transition-shadow hover:shadow-[var(--shadow-lift)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-secondary text-primary"><f.icon className="h-5 w-5" /></span>
                <h3 className="mt-4 font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">Open <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" /></span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

const PREVIEW = [{ n: "N", v: 236 }, { n: "P₂O₅", v: 18 }, { n: "K₂O", v: 310 }];
function DashboardPreview() {
  return (
    <section className="mx-auto max-w-7xl px-5 py-20 md:px-8 md:py-28">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <SectionTitle eyebrow="Analytics" title="A dashboard that respects the data" />
        <Button variant="outline" asChild><Link to="/dashboard">Open dashboard <ArrowRight className="h-4 w-4" /></Link></Button>
      </div>
      <div className="card-surface mt-10 grid gap-6 p-6 md:grid-cols-3 md:p-8">
        <div className="md:col-span-2">
          <div className="flex items-center justify-between">
            <p className="font-semibold">Available nutrients <span className="font-normal text-muted-foreground">(kg/ha)</span></p>
            <DemoBadge />
          </div>
          <div className="mt-4 h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={PREVIEW} margin={{ left: -10 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="n" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: "var(--muted)" }} />
                <Bar dataKey="v" name="kg/ha" fill="var(--primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="space-y-3">
          {[["pH", "6.8", "Laboratory"], ["EC", "0.42 dS/m", "Laboratory"], ["Texture", "Loam", "Image observation"], ["Moisture", "Not measured", "—"]].map(([k, v, s]) => (
            <div key={k} className="flex items-center justify-between rounded-lg border border-border p-3">
              <div><p className="text-xs text-muted-foreground">{k}</p><p className="font-semibold">{v}</p></div>
              <span className="text-xs text-muted-foreground">{s}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Transparency() {
  const points = [
    ["Photos are clues, not lab tests", "A soil image can suggest colour and apparent texture. It cannot determine pH, EC or nutrient levels."],
    ["Every value shows its source", "Laboratory, sensor, image observation or AI hypothesis — always labelled."],
    ["No invented dosages", "Fertilizer quantities appear only when backed by validated calculations and local references."],
    ["Diagnoses stay possibilities", "Plant-health results list alternatives and verification steps, with expert referral when confidence is low."],
  ];
  return (
    <section className="bg-forest text-forest-foreground">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 md:px-8 md:py-28 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <ShieldCheck className="h-8 w-8 text-fresh" />
          <h2 className="mt-5 text-3xl font-semibold md:text-4xl">Scientific transparency, by design</h2>
          <p className="mt-4 max-w-md leading-relaxed text-forest-foreground/75">Good advice starts with honest data. AgroSense AI is explicit about what it knows, what it infers, and what it cannot tell you.</p>
        </div>
        <div className="grid gap-px overflow-hidden rounded-xl bg-forest-foreground/15 sm:grid-cols-2">
          {points.map(([t, d]) => (
            <div key={t} className="bg-forest p-6">
              <h3 className="font-semibold">{t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-forest-foreground/70">{d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Faq() {
  const qs = [
    ["Can AgroSense AI tell my soil pH from a photo?", "No. pH, EC and nutrient concentrations require a laboratory or calibrated sensor test. Photos offer visual clues only."],
    ["Do I need a soil-test report?", "It is strongly recommended. You can still continue without one, but the report will flag missing measurements and limit its interpretation."],
    ["Is my data stored?", "In this demo, your latest report is kept only in this browser tab. Nothing is sent to a server."],
    ["Which crops and regions are supported?", "The demo focuses on common Indian field crops across kharif, rabi and zaid seasons."],
    ["Will it recommend pesticides?", "Only when backed by verified local guidance. By default it prioritises integrated pest management."],
  ];
  return (
    <section className="mx-auto max-w-3xl px-5 py-20 md:px-8 md:py-28">
      <SectionTitle eyebrow="FAQ" title="Questions farmers ask" />
      <Accordion type="single" collapsible className="mt-8">
        {qs.map(([q, a]) => (
          <AccordionItem key={q} value={q}>
            <AccordionTrigger className="text-left text-base">{q}</AccordionTrigger>
            <AccordionContent className="leading-relaxed text-muted-foreground">{a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}

function Footer() {
  const [open, setOpen] = useState<string | null>(null);
  const info: Record<string, string> = {
    Privacy: "This demonstration does not send your images or measurements to any server. Settings are saved only in your browser.",
    Contact: "For partnerships and pilots, reach the AgroSense AI team at hello@agrosense.example (placeholder address).",
    Disclaimer: "AgroSense AI provides decision support only. Always confirm fertilizer, irrigation and pest-control decisions with local agricultural experts.",
  };
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-10 md:flex-row md:items-start md:justify-between md:px-8">
        <div className="max-w-sm">
          <Logo />
          <p className="mt-3 text-sm text-muted-foreground">Understand Your Soil. Grow Smarter.</p>
        </div>
        <div className="max-w-md">
          <div className="flex gap-6 text-sm font-medium">
            {Object.keys(info).map((k) => (
              <button key={k} onClick={() => setOpen(open === k ? null : k)} aria-expanded={open === k} className="text-muted-foreground hover:text-foreground">{k}</button>
            ))}
          </div>
          {open && <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{info[open] ?? ""}</p>}
          <p className="mt-6 text-xs text-muted-foreground">© 2026 AgroSense AI</p>
        </div>
      </div>
    </footer>
  );
}
