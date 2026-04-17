import { config } from "./config.js";

interface FetchOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const apiUrl = config.get("apiUrl");
  const apiKey = config.get("apiKey");

  if (!apiKey) {
    throw new ApiError(401, "Not authenticated. Run `aios auth login` first.");
  }

  const { default: fetch } = await import("node-fetch");

  const res = await fetch(`${apiUrl}/api/v1${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = (await res.json()) as { success: boolean; data: T; error: string | null };

  if (!res.ok || !data.success) {
    throw new ApiError(res.status, data.error ?? `API error ${res.status}`);
  }

  return data.data;
}

export const api = {
  projects: {
    list: () => apiFetch<{ projects: unknown[]; total: number }>("/projects"),
    create: (data: { name: string; description?: string }) =>
      apiFetch<{ project: unknown }>("/projects", { method: "POST", body: data }),
    get: (id: string) => apiFetch<{ project: unknown }>(`/projects/${id}`),
  },
  agents: {
    list: (projectId?: string) =>
      apiFetch<{ agents: unknown[]; total: number }>(
        `/agents${projectId ? `?project_id=${projectId}` : ""}`
      ),
    create: (data: {
      project_id: string;
      name: string;
      model?: string;
      system_prompt?: string;
    }) => apiFetch<{ agent: unknown }>("/agents", { method: "POST", body: data }),
  },
  sessions: {
    run: (data: {
      project_id: string;
      agent_id?: string;
      messages: Array<{ role: "user" | "assistant"; content: string }>;
      model?: string;
    }) => apiFetch<{ session_id: string; content: unknown[]; usage: unknown }>("/sessions", {
      method: "POST",
      body: data,
    }),
  },
};
