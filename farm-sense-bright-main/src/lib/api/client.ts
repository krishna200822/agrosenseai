import type { ZodType } from "zod";
import { ApiError } from "./types";

/**
 * Base URL of the future FastAPI backend. Contains only a URL — never a secret.
 * Equivalent of NEXT_PUBLIC_API_BASE_URL in this Vite-based stack.
 */
export const API_BASE_URL: string | undefined = import.meta.env["VITE_API_BASE_URL"] || undefined;

/** Demo mode is used whenever no backend is configured. */
export const API_MODE: "demo" | "production" = API_BASE_URL ? "production" : "demo";

export async function request<T>(path: string, schema: ZodType<T>, init?: RequestInit): Promise<T> {
  if (!API_BASE_URL) throw new ApiError("Backend is not configured.", "network");
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
  } catch {
    throw new ApiError("Could not reach the analysis service. Check your connection.", "network");
  }
  if (!res.ok) throw new ApiError(`Service responded with ${res.status}.`, res.status === 404 ? "not_found" : "server", res.status);
  return validate(await res.json(), schema);
}

export function validate<T>(data: unknown, schema: ZodType<T>): T {
  const parsed = schema.safeParse(data);
  if (!parsed.success) throw new ApiError("The service returned data in an unexpected format.", "validation");
  return parsed.data;
}

export const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
