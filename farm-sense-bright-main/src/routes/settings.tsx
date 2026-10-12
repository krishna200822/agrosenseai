import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { formatNutrient, useSettings } from "@/lib/settings";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — AgroSense AI" },
      { name: "description", content: "Language, units, farm information, notifications and privacy preferences." },
      { property: "og:title", content: "Settings — AgroSense AI" },
      { property: "og:description", content: "Manage your AgroSense AI preferences." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { settings: s, update, t } = useSettings();
  return (
    <AppShell title={t("settings")} crumb="Settings">
      <p className="mb-6 text-sm text-muted-foreground">Preferences are saved in this browser only.</p>
      <div className="grid max-w-3xl gap-5">
        <Section title="Profile" desc="Guest profile — accounts arrive with the backend.">
          <div className="grid gap-4 sm:grid-cols-2">
            <div><Label htmlFor="name">Display name</Label><Input id="name" className="mt-1.5" value={s.name} maxLength={40} onChange={(e) => update({ name: e.target.value || "Farmer" })} /></div>
          </div>
        </Section>

        <Section title={t("language")} desc="Changes navigation and key headings across the app.">
          <RadioGroup value={s.lang} onValueChange={(v) => update({ lang: v as "en" | "hi" })} className="flex gap-6">
            <Opt id="l-en" value="en" label="English" /><Opt id="l-hi" value="hi" label="हिन्दी (Hindi)" />
          </RadioGroup>
        </Section>

        <Section title="Units" desc="Used in forms, the dashboard and reports.">
          <div className="grid gap-5 sm:grid-cols-2">
            <div><p className="mb-2 text-sm font-medium">Farm area</p>
              <RadioGroup value={s.areaUnit} onValueChange={(v) => update({ areaUnit: v as "acre" })} className="flex gap-6"><Opt id="a-ac" value="acre" label="Acres" /><Opt id="a-ha" value="hectare" label="Hectares" /></RadioGroup></div>
            <div><p className="mb-2 text-sm font-medium">Nutrients</p>
              <RadioGroup value={s.nutrientUnit} onValueChange={(v) => update({ nutrientUnit: v as "kg/ha" })} className="flex gap-6"><Opt id="n-kg" value="kg/ha" label="kg/ha" /><Opt id="n-lb" value="lb/acre" label="lb/acre" /></RadioGroup>
              <p className="mt-2 text-xs text-muted-foreground">Example: 236 kg/ha shows as {formatNutrient(236, s.nutrientUnit)}</p></div>
          </div>
        </Section>

        <Section title="Farm information" desc="General location only — no precise coordinates.">
          <div className="grid gap-4 sm:grid-cols-2">
            <div><Label htmlFor="fn">Farm name</Label><Input id="fn" className="mt-1.5" value={s.farmName} maxLength={60} onChange={(e) => update({ farmName: e.target.value })} /></div>
            <div><Label htmlFor="fl">District / state</Label><Input id="fl" className="mt-1.5" value={s.farmLocation} maxLength={80} onChange={(e) => update({ farmLocation: e.target.value })} /></div>
          </div>
        </Section>

        <Section title="Notifications" desc="Shown in the bell menu in this browser.">
          <Toggle id="ns" label="Seasonal reminders" desc="Sowing windows and soil-test reminders" checked={s.notifySeasonal} onChange={(v) => update({ notifySeasonal: v })} />
          <Toggle id="nr" label="Report ready alerts" desc="When an analysis finishes" checked={s.notifyReports} onChange={(v) => update({ notifyReports: v })} />
        </Section>

        <Section title="Privacy">
          <Toggle id="pa" label="Share anonymised data for research" desc="Will apply once the backend is connected. Nothing is sent today." checked={s.shareAnonymised} onChange={(v) => update({ shareAnonymised: v })} />
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div><p className="text-sm font-medium">Clear session report</p><p className="text-xs text-muted-foreground">Removes the latest soil report and image from this tab.</p></div>
            <Button variant="outline" onClick={() => { sessionStorage.removeItem("agrosense:last-analysis"); toast.success("Session report cleared"); setTimeout(() => location.reload(), 600); }}>Clear</Button>
          </div>
        </Section>
      </div>
    </AppShell>
  );
}

function Section({ title, desc, children }: { title: string; desc?: string; children: ReactNode }) {
  return <section className="card-surface p-6"><h2 className="font-semibold">{title}</h2>{desc && <p className="mt-0.5 text-sm text-muted-foreground">{desc}</p>}<div className="mt-5 space-y-4">{children}</div></section>;
}
function Opt({ id, value, label }: { id: string; value: string; label: string }) {
  return <div className="flex items-center gap-2"><RadioGroupItem id={id} value={value} /><Label htmlFor={id} className="font-normal">{label}</Label></div>;
}
function Toggle({ id, label, desc, checked, onChange }: { id: string; label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return <div className="flex items-center justify-between gap-4"><Label htmlFor={id} className="font-normal"><span className="block text-sm font-medium">{label}</span><span className="text-xs text-muted-foreground">{desc}</span></Label><Switch id={id} checked={checked} onCheckedChange={onChange} /></div>;
}
