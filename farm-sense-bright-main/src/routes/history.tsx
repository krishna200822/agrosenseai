import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, History as HistoryIcon, RotateCcw, Search } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { DemoBadge } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getAnalysisHistory, getSoilAnalysis } from "@/lib/api/soil";
import type { HistoryItem } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "Analysis History — AgroSense AI" },
      { name: "description", content: "Review previous soil analyses by date, farm and measurement availability." },
      { property: "og:title", content: "Analysis History — AgroSense AI" },
      { property: "og:description", content: "Your previous soil analyses." },
    ],
  }),
  component: HistoryPage,
});

const MEAS = { lab: "Laboratory", sensor: "Sensor", image_only: "Image only", none: "None" } as const;
const STATUS_CLS = { completed: "bg-secondary text-secondary-foreground", incomplete: "bg-warning-soft text-warning-foreground", failed: "bg-destructive/10 text-destructive" } as const;

function HistoryPage() {
  const [items, setItems] = useState<HistoryItem[] | null>(null);
  const [error, setError] = useState(false);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [meas, setMeas] = useState("all");
  const [hasCurrent, setHasCurrent] = useState(false);

  const load = useCallback((fail = false) => {
    setItems(null); setError(false);
    getAnalysisHistory({ simulateFailure: fail }).then(setItems).catch(() => setError(true));
  }, []);
  useEffect(() => { load(); getSoilAnalysis().then((a) => setHasCurrent(!!a)); }, [load]);

  const list = useMemo(() => (items ?? []).filter((i) =>
    (status === "all" || i.status === status) && (meas === "all" || i.measurements === meas) &&
    `${i.farm} ${i.location}`.toLowerCase().includes(q.toLowerCase())), [items, q, status, meas]);

  return (
    <AppShell title="Analysis History" crumb="History">
      <div className="flex flex-wrap items-center gap-2"><h2 className="text-2xl font-semibold">Previous analyses</h2><DemoBadge /></div>
      <p className="mt-1 text-sm text-muted-foreground">Sample records for demonstration. Real history will be saved once the backend is connected.</p>

      {hasCurrent && (
        <div className="card-surface mt-5 flex flex-wrap items-center justify-between gap-3 p-4">
          <p className="text-sm"><span className="font-medium">Current session report</span> <span className="text-muted-foreground">— kept in this browser tab only</span></p>
          <Button size="sm" asChild><Link to="/soil-analysis/results">View report</Link></Button>
        </div>
      )}

      <div className="mt-5 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search farm or location" aria-label="Search" className="bg-card pl-9" /></div>
        <Select value={status} onValueChange={setStatus}><SelectTrigger aria-label="Status" className="bg-card sm:w-40"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All statuses</SelectItem><SelectItem value="completed">Completed</SelectItem><SelectItem value="incomplete">Incomplete</SelectItem><SelectItem value="failed">Failed</SelectItem></SelectContent></Select>
        <Select value={meas} onValueChange={setMeas}><SelectTrigger aria-label="Measurements" className="bg-card sm:w-44"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">Any measurements</SelectItem>{Object.entries(MEAS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select>
      </div>

      <div className="card-surface mt-5 overflow-hidden">
        {error ? (
          <div className="p-10 text-center"><AlertTriangle className="mx-auto h-8 w-8 text-destructive" /><p className="mt-3 font-medium">History couldn't be loaded</p><Button className="mt-4" onClick={() => load()}><RotateCcw className="h-4 w-4" />Retry</Button></div>
        ) : !items ? (
          <div className="space-y-3 p-5">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : list.length === 0 ? (
          <div className="p-12 text-center"><HistoryIcon className="mx-auto h-8 w-8 text-muted-foreground" /><p className="mt-3 font-medium">No analyses found</p><p className="text-sm text-muted-foreground">Try a different search or filter.</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-border bg-muted/50 text-xs text-muted-foreground"><tr><th className="px-5 py-3 font-medium">Date</th><th className="px-5 py-3 font-medium">Farm</th><th className="px-5 py-3 font-medium">Measurements</th><th className="px-5 py-3 font-medium">Status</th><th className="px-5 py-3" /></tr></thead>
              <tbody className="divide-y divide-border">
                {list.map((i) => (
                  <tr key={i.id}>
                    <td className="px-5 py-3.5 tabular-nums">{new Date(i.date).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}</td>
                    <td className="px-5 py-3.5"><span className="font-medium">{i.farm}</span><span className="block text-xs text-muted-foreground">{i.location}</span></td>
                    <td className="px-5 py-3.5">{MEAS[i.measurements]}</td>
                    <td className="px-5 py-3.5"><span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium capitalize", STATUS_CLS[i.status])}>{i.status}</span></td>
                    <td className="px-5 py-3.5 text-right">
                      <Button size="sm" variant="ghost" disabled={i.status === "failed"} onClick={() => toast.info("Sample record", { description: "Archived reports will open once the backend is connected. Run a new analysis to see a full report." })}>View report</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <button onClick={() => load(true)} className="mt-3 text-xs text-muted-foreground underline-offset-4 hover:underline">Simulate a loading error (demo testing)</button>
    </AppShell>
  );
}
