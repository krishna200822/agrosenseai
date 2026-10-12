import { Check, Clock, Droplets, ExternalLink, Info, Sun, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CropRecommendation } from "@/lib/api/types";
import { CROP_IMAGES } from "@/lib/crop-images";

export const SEASON_LABEL = { kharif: "Kharif (monsoon)", rabi: "Rabi (winter)", zaid: "Zaid (summer)" } as const;
export const WATER_LABEL = { low: "Low water", medium: "Medium water", high: "High water" } as const;

export function CropCard({ crop, onDetails, compare }: { crop: CropRecommendation; onDetails: () => void; compare?: { checked: boolean; onToggle: () => void; disabled?: boolean } }) {
  return (
    <article className="card-surface flex flex-col overflow-hidden transition-shadow hover:shadow-[var(--shadow-lift)]">
      <div className="relative">
        <img src={CROP_IMAGES[crop.imageKey]} alt={crop.name} loading="lazy" width={944} height={704} className="h-40 w-full object-cover" />
        <Badge variant="secondary" className="absolute left-3 top-3 capitalize">{crop.category}</Badge>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-semibold">{crop.name}</h3>
          <span className="shrink-0 text-right text-xs text-muted-foreground">
            {crop.suitabilityScore === null ? "Score: not validated" : `Suitability ${crop.suitabilityScore}%`}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Sun className="h-3.5 w-3.5" />{SEASON_LABEL[crop.season]}</span>
          <span className="flex items-center gap-1"><Droplets className="h-3.5 w-3.5" />{WATER_LABEL[crop.waterNeed]}</span>
          <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{crop.durationDays[0]}–{crop.durationDays[1]} days</span>
        </div>
        <p className="mt-3 text-sm"><span className="text-muted-foreground">Soil fit: </span>{crop.soilCompatibility}</p>
        <ul className="mt-3 space-y-1.5 text-sm">
          {crop.reasons.slice(0, 2).map((r) => <li key={r} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{r}</li>)}
          {crop.limitations.slice(0, 1).map((r) => <li key={r} className="flex gap-2 text-muted-foreground"><TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" />{r}</li>)}
        </ul>
        <div className="mt-auto flex items-center justify-between gap-3 pt-5">
          {compare ? (
            <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
              <Checkbox checked={compare.checked} onCheckedChange={compare.onToggle} disabled={compare.disabled && !compare.checked} aria-label={`Compare ${crop.name}`} />
              Compare
            </label>
          ) : <span />}
          <Button variant="outline" size="sm" onClick={onDetails}>View details</Button>
        </div>
      </div>
    </article>
  );
}

export function CropDetailDialog({ crop, onClose }: { crop: CropRecommendation | null; onClose: () => void }) {
  return (
    <Dialog open={!!crop} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        {crop && (
          <>
            <img src={CROP_IMAGES[crop.imageKey]} alt={crop.name} className="-mx-6 -mt-6 h-48 w-[calc(100%+3rem)] max-w-none rounded-t-lg object-cover" />
            <DialogHeader>
              <DialogTitle className="text-2xl">{crop.name}</DialogTitle>
              <DialogDescription>{SEASON_LABEL[crop.season]} · {WATER_LABEL[crop.waterNeed]} · {crop.durationDays[0]}–{crop.durationDays[1]} days</DialogDescription>
            </DialogHeader>
            <div className="grid gap-5 sm:grid-cols-2">
              <DetailList title="Why it's suggested" items={crop.reasons} />
              <DetailList title="Limitations" items={crop.limitations} />
              <DetailList title="Growing constraints" items={crop.constraints} />
              <div>
                <h4 className="text-sm font-semibold">References</h4>
                <ul className="mt-2 space-y-1.5 text-sm">
                  {crop.references.map((r) => (
                    <li key={r.title}>{r.url ? <a href={r.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline">{r.title}<ExternalLink className="h-3 w-3" /></a> : r.title}</li>
                  ))}
                </ul>
              </div>
            </div>
            <p className="flex gap-2 rounded-lg bg-muted p-3 text-xs text-muted-foreground"><Info className="h-4 w-4 shrink-0" />Suitability scores appear only once a validated recommendation engine is connected. Content shown is general guidance for demonstration.</p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DetailList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h4 className="text-sm font-semibold">{title}</h4>
      <ul className="mt-2 list-disc space-y-1.5 pl-4 text-sm text-muted-foreground">{items.map((i) => <li key={i}>{i}</li>)}</ul>
    </div>
  );
}

export interface CropFilterState { season: string; water: string; category: string; duration: string }
export const EMPTY_FILTERS: CropFilterState = { season: "all", water: "all", category: "all", duration: "all" };

export function filterCrops(crops: CropRecommendation[], f: CropFilterState, q = "") {
  return crops.filter((c) =>
    (f.season === "all" || c.season === f.season) &&
    (f.water === "all" || c.waterNeed === f.water) &&
    (f.category === "all" || c.category === f.category) &&
    (f.duration === "all" || (f.duration === "short" ? c.durationDays[1] <= 115 : c.durationDays[1] > 115)) &&
    c.name.toLowerCase().includes(q.toLowerCase()));
}

export function CropFilters({ value, onChange }: { value: CropFilterState; onChange: (v: CropFilterState) => void }) {
  const opts: { key: keyof CropFilterState; label: string; items: [string, string][] }[] = [
    { key: "season", label: "Season", items: [["all", "All seasons"], ["kharif", "Kharif"], ["rabi", "Rabi"], ["zaid", "Zaid"]] },
    { key: "water", label: "Water", items: [["all", "Any water need"], ["low", "Low"], ["medium", "Medium"], ["high", "High"]] },
    { key: "category", label: "Category", items: [["all", "All categories"], ["cereal", "Cereals"], ["pulse", "Pulses"], ["oilseed", "Oilseeds"], ["vegetable", "Vegetables"]] },
    { key: "duration", label: "Duration", items: [["all", "Any duration"], ["short", "≤ 115 days"], ["long", "> 115 days"]] },
  ];
  return (
    <div className="grid grid-cols-2 gap-2 md:flex md:flex-wrap">
      {opts.map((o) => (
        <Select key={o.key} value={value[o.key]} onValueChange={(v) => onChange({ ...value, [o.key]: v })}>
          <SelectTrigger aria-label={o.label} className="bg-card md:w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>{o.items.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
        </Select>
      ))}
    </div>
  );
}
