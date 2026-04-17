import Conf from "conf";
import { homedir } from "os";
import { join } from "path";

interface AiosConfig {
  apiKey: string | null;
  apiUrl: string;
  defaultModel: string;
  orgId: string | null;
}

const DEFAULT_CONFIG: AiosConfig = {
  apiKey: null,
  apiUrl: "https://aios.dev",
  defaultModel: "claude-sonnet-4-6",
  orgId: null,
};

const store = new Conf<AiosConfig>({
  projectName: "aios",
  defaults: DEFAULT_CONFIG,
});

export const config = {
  get<K extends keyof AiosConfig>(key: K): AiosConfig[K] {
    return store.get(key);
  },
  set<K extends keyof AiosConfig>(key: K, value: AiosConfig[K]): void {
    store.set(key, value);
  },
  getAll(): AiosConfig {
    return store.store;
  },
  clear(): void {
    store.clear();
  },
  get configPath(): string {
    return store.path;
  },
};

export function getProjectConfig(): { projectId?: string; agentId?: string } | null {
  const cwd = process.cwd();
  try {
    const fs = require("fs");
    const configPath = join(cwd, ".aios.json");
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, "utf-8"));
    }
  } catch {
    // No project config
  }
  return null;
}

export function writeProjectConfig(data: { projectId?: string; agentId?: string }): void {
  const fs = require("fs");
  const configPath = join(process.cwd(), ".aios.json");
  fs.writeFileSync(configPath, JSON.stringify(data, null, 2));
}
