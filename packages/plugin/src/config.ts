import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

export const DEFAULT_RELAY_URL = "https://relay.connectclaw.io";

export interface ConnectClawConfig {
  relayUrl?: string;
  relayAccessToken?: string;
}

export function connectClawConfigSchema() {
  return {
    validate(value: unknown) {
      if (value === undefined || value === null) {
        return { ok: true, value: {} };
      }
      if (typeof value !== "object") {
        return { ok: false, errors: ["Config must be an object"] };
      }
      return { ok: true, value };
    },
    uiHints: {
      relayUrl: {
        label: "Relay URL",
        help: `URL of the ConnectClaw relay server (default: ${DEFAULT_RELAY_URL})`,
        placeholder: DEFAULT_RELAY_URL,
      },
      relayAccessToken: {
        label: "Relay Access Token",
        help: "Required only for private relays",
        sensitive: true,
      },
    },
    jsonSchema: {
      type: "object",
      properties: {
        relayUrl: { type: "string" },
        relayAccessToken: { type: "string" },
      },
      additionalProperties: false,
    },
  };
}

function tokenFilePath(stateDir: string): string {
  return join(stateDir, "connectclaw-token.json");
}

export function saveToken(
  stateDir: string,
  data: { token: string; handle: string; relayUrl: string }
) {
  mkdirSync(stateDir, { recursive: true });
  writeFileSync(tokenFilePath(stateDir), JSON.stringify(data, null, 2));
}

export function loadToken(
  stateDir: string
): { token: string; handle: string; relayUrl: string } | null {
  try {
    const raw = readFileSync(tokenFilePath(stateDir), "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
