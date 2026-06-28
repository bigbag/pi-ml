import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { MlExtensionSettings } from "./types/settings.js";

const SETTINGS_FILE = "pi-ml.json";

function getGlobalSettingsPath(): string {
  return path.join(process.env.PI_CODING_AGENT_DIR || path.join(process.env.HOME || "~", ".pi", "agent"), SETTINGS_FILE);
}

function getProjectSettingsPath(cwd: string): string {
  return path.join(cwd, ".pi", SETTINGS_FILE);
}

export async function loadSettings(cwd: string): Promise<MlExtensionSettings> {
  const defaults: MlExtensionSettings = {
    maxExperimentsInLeaderboard: 20,
    defaultArtifactTags: [],
  };

  let global: MlExtensionSettings = {};
  let project: MlExtensionSettings = {};

  try {
    const globalRaw = await fs.readFile(getGlobalSettingsPath(), "utf-8");
    global = JSON.parse(globalRaw);
  } catch {
    // ignore
  }

  try {
    const projectRaw = await fs.readFile(getProjectSettingsPath(cwd), "utf-8");
    project = JSON.parse(projectRaw);
  } catch {
    // ignore
  }

  return { ...defaults, ...global, ...project };
}

export async function saveProjectSettings(cwd: string, settings: MlExtensionSettings): Promise<void> {
  const dir = path.join(cwd, ".pi");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(getProjectSettingsPath(cwd), JSON.stringify(settings, null, 2));
}
