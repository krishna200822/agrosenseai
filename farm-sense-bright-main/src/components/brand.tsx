import { Link } from "@tanstack/react-router";
import { Sprout, FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSettings } from "@/lib/settings";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function Logo({ inverted = false, className }: { inverted?: boolean; className?: string }) {
  return (
    <Link to="/" className={cn("flex items-center gap-2.5 font-semibold tracking-tight", className)}>
      <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-lg", inverted ? "bg-sidebar-primary text-sidebar-primary-foreground" : "bg-primary text-primary-foreground")}>
        <Sprout className="h-4.5 w-4.5" aria-hidden />
      </span>
      <span className={cn("text-[1.05rem]", inverted ? "text-sidebar-accent-foreground" : "text-foreground")}>
        AgroSense <span className={inverted ? "text-sidebar-primary" : "text-primary"}>AI</span>
      </span>
    </Link>
  );
}

export function DemoBadge({ className, label = "Demo Data" }: { className?: string; label?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border border-warning/40 bg-warning-soft px-2.5 py-0.5 text-xs font-medium text-warning-foreground", className)}>
      <FlaskConical className="h-3 w-3" aria-hidden /> {label}
    </span>
  );
}

export function LanguageSelect({ className }: { className?: string }) {
  const { settings, update, t } = useSettings();
  return (
    <Select value={settings.lang} onValueChange={(v) => update({ lang: v as "en" | "hi" })}>
      <SelectTrigger aria-label={t("language")} className={cn("h-9 w-[110px] bg-card", className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="en">English</SelectItem>
        <SelectItem value="hi">हिन्दी</SelectItem>
      </SelectContent>
    </Select>
  );
}

export function SectionTitle({ eyebrow, title, desc, className }: { eyebrow?: string; title: string; desc?: string; className?: string }) {
  return (
    <div className={cn("max-w-2xl", className)}>
      {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
      <h2 className="text-3xl font-semibold text-foreground md:text-4xl">{title}</h2>
      {desc && <p className="mt-4 text-base leading-relaxed text-muted-foreground">{desc}</p>}
    </div>
  );
}
