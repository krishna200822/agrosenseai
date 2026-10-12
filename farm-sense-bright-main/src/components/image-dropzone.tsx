import { useRef, useState, type DragEvent } from "react";
import { ImagePlus, RefreshCw, Trash2, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ACCEPT = ["image/jpeg", "image/png", "image/webp"];
const MAX_MB = 8;

export interface PickedImage { name: string; dataUrl: string; size: number }

export function ImageDropzone({ value, onChange, label = "Drop a soil photo here", hint, compact }: {
  value: PickedImage | null; onChange: (v: PickedImage | null) => void; label?: string; hint?: string; compact?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handle = (file?: File) => {
    if (!file) return;
    if (!ACCEPT.includes(file.type)) return setError("Unsupported file type. Please use JPG, JPEG, PNG or WEBP.");
    if (file.size > MAX_MB * 1024 * 1024) return setError(`This file is ${(file.size / 1048576).toFixed(1)} MB. The limit is ${MAX_MB} MB.`);
    setError(null);
    const reader = new FileReader();
    reader.onload = () => onChange({ name: file.name, dataUrl: String(reader.result), size: file.size });
    reader.onerror = () => setError("The file could not be read. Try another image.");
    reader.readAsDataURL(file);
  };
  const onDrop = (e: DragEvent) => { e.preventDefault(); setDrag(false); handle(e.dataTransfer.files?.[0]); };

  return (
    <div>
      <input ref={input} type="file" accept=".jpg,.jpeg,.png,.webp" className="sr-only" aria-label="Upload image"
        onChange={(e) => { handle(e.target.files?.[0]); e.target.value = ""; }} />
      {value ? (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <img src={value.dataUrl} alt="Uploaded preview" className={cn("w-full object-cover", compact ? "h-56" : "h-72 md:h-80")} />
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{value.name}</p>
              <p className="text-xs text-muted-foreground">{(value.size / 1048576).toFixed(2)} MB</p>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => input.current?.click()}><RefreshCw className="h-4 w-4" />Replace</Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" />Remove</Button>
            </div>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => input.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={onDrop}
          className={cn("grid-texture flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            compact ? "py-10" : "py-16", drag ? "border-primary bg-secondary" : "border-input bg-card hover:border-primary/60")}>
          <span className="grid h-14 w-14 place-items-center rounded-full bg-secondary text-primary">
            {drag ? <ImagePlus className="h-6 w-6" /> : <UploadCloud className="h-6 w-6" />}
          </span>
          <span className="mt-4 text-base font-medium text-foreground">{label}</span>
          <span className="mt-1 text-sm text-muted-foreground">or <span className="font-medium text-primary underline-offset-4 hover:underline">browse files</span></span>
          <span className="mt-3 text-xs text-muted-foreground">{hint ?? `JPG, JPEG, PNG or WEBP · up to ${MAX_MB} MB`}</span>
        </button>
      )}
      {error && <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}
    </div>
  );
}
