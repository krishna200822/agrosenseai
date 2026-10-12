import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { GitCompare, Search, X } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { DemoBadge } from "@/components/brand";
import { CropCard, CropDetailDialog, CropFilters, EMPTY_FILTERS, filterCrops, SEASON_LABEL, WATER_LABEL } from "@/components/crop-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getCropRecommendations } from "@/lib/api/crops";
import type { CropRecommendation } from "@/lib/api/types";
import { CROP_IMAGES } from "@/lib/crop-images";

export const Route = createFileRoute("/recommendations")({
  head: () => ({
    meta: [
      { title: "Crop Recommendations — AgroSense AI" },
      { name: "description", content: "Browse, filter and compare crops by season, water need and duration." },
      { property: "og:title", content: "Crop Recommendations — AgroSense AI" },
      { property: "og:description", content: "Compare crops side by side with reasons and constraints." },
    ],
  }),
  component: Recs,
});

function Recs() {
  const [crops, setCrops] = useState<CropRecommendation[] | null>(null);
  const [q, setQ] = useState("");
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [detail, setDetail] = useState<CropRecommendation | null>(null);
  const [cmp, setCmp] = useState<string[]>([]);
  const [showCmp, setShowCmp] = useState(false);
  useEffect(() => { getCropRecommendations().then(setCrops); }, []);
  const list = useMemo(() => (crops ? filterCrops(crops, filters, q) : []), [crops, filters, q]);
  const selected = (crops ?? []).filter((c) => cmp.includes(c.id));
  const toggle = (id: string) => setCmp((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <AppShell title="Crop Recommendations" crumb="Crops">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2"><h2 className="text-2xl font-semibold">Crop library</h2><DemoBadge /></div>
          <p className="mt-1 text-sm text-muted-foreground">General guidance. Suitability scores appear once a validated engine scores your soil report.</p>
        </div>
        <div className="relative md:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search crops" aria-label="Search crops" className="bg-card pl-9" />
        </div>
      </div>
      <div className="mt-5"><CropFilters value={filters} onChange={setFilters} /></div>

      {!crops ? (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-96" />)}</div>
      ) : list.length ? (
        <div className="mt-6 grid gap-5 pb-24 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((c) => <CropCard key={c.id} crop={c} onDetails={() => setDetail(c)} compare={{ checked: cmp.includes(c.id), onToggle: () => toggle(c.id), disabled: cmp.length >= 3 }} />)}
        </div>
      ) : (
        <div className="mt-6 rounded-xl border border-dashed border-input p-10 text-center text-sm text-muted-foreground">No crops match. <button className="font-medium text-primary underline" onClick={() => { setFilters(EMPTY_FILTERS); setQ(""); }}>Reset</button></div>
      )}

      {cmp.length > 0 && (
        <div className="fixed inset-x-0 bottom-4 z-30 mx-auto flex w-[calc(100%-2rem)] max-w-xl items-center justify-between gap-3 rounded-xl bg-forest px-4 py-3 text-forest-foreground shadow-[var(--shadow-lift)] lg:ml-[calc(250px+50%-18rem)] lg:mr-0">
          <span className="min-w-0 truncate text-sm">{selected.map((s) => s.name).join(", ")} <span className="opacity-70">({cmp.length}/3)</span></span>
          <div className="flex shrink-0 gap-2">
            <Button size="sm" variant="ghost" onClick={() => setCmp([])} className="text-forest-foreground hover:bg-forest-foreground/10 hover:text-forest-foreground" aria-label="Clear comparison"><X className="h-4 w-4" /></Button>
            <Button size="sm" disabled={cmp.length < 2} onClick={() => setShowCmp(true)} className="bg-fresh text-forest hover:bg-fresh/90"><GitCompare className="h-4 w-4" />Compare</Button>
          </div>
        </div>
      )}

      <Dialog open={showCmp} onOpenChange={setShowCmp}>
        <DialogContent className="max-h-[90vh] overflow-auto sm:max-w-4xl">
          <DialogHeader><DialogTitle>Compare crops</DialogTitle><DialogDescription>Side-by-side general characteristics.</DialogDescription></DialogHeader>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead><tr><th className="w-32" />{selected.map((c) => <th key={c.id} className="p-2 align-bottom"><img src={CROP_IMAGES[c.imageKey]} alt="" className="mb-2 h-20 w-full rounded-md object-cover" /><span className="font-semibold">{c.name}</span></th>)}</tr></thead>
              <tbody className="divide-y divide-border">
                {[
                  ["Season", (c: CropRecommendation) => SEASON_LABEL[c.season]],
                  ["Water need", (c: CropRecommendation) => WATER_LABEL[c.waterNeed]],
                  ["Duration", (c: CropRecommendation) => `${c.durationDays[0]}–${c.durationDays[1]} days`],
                  ["Category", (c: CropRecommendation) => c.category],
                  ["Soil fit", (c: CropRecommendation) => c.soilCompatibility],
                  ["Strengths", (c: CropRecommendation) => c.reasons.join("; ")],
                  ["Limitations", (c: CropRecommendation) => c.limitations.join("; ")],
                  ["Suitability", (c: CropRecommendation) => (c.suitabilityScore === null ? "Not validated" : `${c.suitabilityScore}%`)],
                ].map(([label, fn]) => (
                  <tr key={label as string}><th className="p-2 font-medium text-muted-foreground">{label as string}</th>{selected.map((c) => <td key={c.id} className="p-2 align-top capitalize-first">{(fn as (c: CropRecommendation) => string)(c)}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>
      <CropDetailDialog crop={detail} onClose={() => setDetail(null)} />
    </AppShell>
  );
}
