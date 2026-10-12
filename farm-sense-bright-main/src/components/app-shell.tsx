import { Link, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { Bell, FlaskConical, History, Home, LayoutDashboard, LifeBuoy, Leaf, Menu, Settings as SettingsIcon, Sprout, Wheat } from "lucide-react";
import { Logo, LanguageSelect } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useSettings, type DictKey } from "@/lib/settings";
import { cn } from "@/lib/utils";

const NAV: { to: "/dashboard" | "/soil-analysis" | "/recommendations" | "/plant-health" | "/history" | "/settings"; key: DictKey; icon: typeof Home }[] = [
  { to: "/dashboard", key: "overview", icon: LayoutDashboard },
  { to: "/soil-analysis", key: "soilAnalysis", icon: FlaskConical },
  { to: "/recommendations", key: "cropRecs", icon: Wheat },
  { to: "/plant-health", key: "plantHealth", icon: Leaf },
  { to: "/history", key: "history", icon: History },
  { to: "/settings", key: "settings", icon: SettingsIcon },
];

function NavList({ onNavigate, onHelp }: { onNavigate?: () => void; onHelp: () => void }) {
  const { t } = useSettings();
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="flex flex-1 flex-col gap-1" aria-label="Application">
      {NAV.map(({ to, key, icon: Icon }) => {
        const active = path === to || path.startsWith(to + "/");
        return (
          <Link key={to} to={to} onClick={onNavigate}
            className={cn("flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
              active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground")}>
            <Icon className={cn("h-4 w-4 shrink-0", active && "text-sidebar-primary")} aria-hidden />
            {t(key)}
          </Link>
        );
      })}
      <div className="mt-auto pt-4">
        <button onClick={() => { onNavigate?.(); onHelp(); }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring">
          <LifeBuoy className="h-4 w-4" aria-hidden /> {t("help")}
        </button>
        <div className="mt-3 rounded-lg border border-sidebar-border p-3 text-xs leading-relaxed text-sidebar-foreground">
          <p className="font-medium text-sidebar-accent-foreground">Demo mode</p>
          No analysis backend is connected. Reports are illustrative.
        </div>
      </div>
    </nav>
  );
}

export function AppShell({ title, crumb, actions, children }: { title: string; crumb?: string; actions?: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [help, setHelp] = useState(false);
  const { settings } = useSettings();
  return (
    <div className="min-h-screen bg-background">
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-[250px] flex-col bg-sidebar px-4 py-5 lg:flex">
        <Logo inverted className="mb-8 px-2" />
        <NavList onHelp={() => setHelp(true)} />
      </aside>
      <div className="lg:pl-[250px]">
        <header className="no-print sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
          <div className="grid h-16 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 md:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="shrink-0 lg:hidden" aria-label="Open navigation"><Menu className="h-5 w-5" /></Button>
                </SheetTrigger>
                <SheetContent side="left" className="flex w-[270px] flex-col border-sidebar-border bg-sidebar p-5">
                  <SheetTitle className="sr-only">Navigation</SheetTitle>
                  <Logo inverted className="mb-8 px-2" />
                  <NavList onNavigate={() => setOpen(false)} onHelp={() => setHelp(true)} />
                </SheetContent>
              </Sheet>
              <div className="min-w-0">
                {crumb && <p className="truncate text-xs text-muted-foreground">{crumb}</p>}
                <h1 className="truncate text-base font-semibold text-foreground md:text-lg">{title}</h1>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {actions}
              <LanguageSelect className="hidden sm:flex" />
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
                    <Bell className="h-5 w-5" />
                    <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-primary" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-72">
                  <p className="text-sm font-semibold">Notifications</p>
                  <ul className="mt-3 space-y-3 text-sm">
                    <li className="flex gap-2"><Sprout className="mt-0.5 h-4 w-4 shrink-0 text-primary" />Rabi sowing window typically opens mid-October. <span className="sr-only">(demo)</span></li>
                    <li className="flex gap-2"><FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-primary" />Soil tests are generally recommended every 2–3 seasons.</li>
                  </ul>
                </PopoverContent>
              </Popover>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button aria-label="Account menu" className="grid h-9 w-9 place-items-center rounded-full bg-forest text-sm font-semibold text-forest-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    {settings.name.slice(0, 1).toUpperCase()}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuLabel>{settings.name}<span className="block text-xs font-normal text-muted-foreground">Guest profile</span></DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild><Link to="/settings">Settings</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to="/history">Analysis history</Link></DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setHelp(true)}>Help & support</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild><Link to="/">Back to website</Link></DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>
        <main className="print-full mx-auto max-w-[1280px] px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
      <Dialog open={help} onOpenChange={setHelp}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Help & support</DialogTitle>
            <DialogDescription>Getting the most reliable report from AgroSense AI.</DialogDescription>
          </DialogHeader>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li><strong className="text-foreground">Use lab values when you can.</strong> A Soil Health Card report gives measured pH, EC and NPK. Photos cannot.</li>
            <li><strong className="text-foreground">Photograph in daylight.</strong> Take a top-down photo of moist soil, without shadows.</li>
            <li><strong className="text-foreground">Confirm before acting.</strong> Check fertilizer and pesticide decisions with your local Krishi Vigyan Kendra.</li>
          </ul>
        </DialogContent>
      </Dialog>
    </div>
  );
}
