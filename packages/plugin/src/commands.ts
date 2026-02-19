import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { RelayClient } from "./relay-client.js";
import {
  saveToken,
  loadToken,
  DEFAULT_RELAY_URL,
  type ConnectClawConfig,
} from "./config.js";

export function registerCommands(
  api: OpenClawPluginApi,
  client: RelayClient,
  getStateDir: () => string
) {
  const pluginConfig = (api.pluginConfig ?? {}) as ConnectClawConfig;
  const relayUrl = pluginConfig.relayUrl ?? DEFAULT_RELAY_URL;

  api.registerCommand({
    name: "signup",
    description:
      "Register on the ConnectClaw relay. Usage: /signup <handle>",
    acceptsArgs: true,
    requireAuth: true,
    handler: async (ctx) => {
      const handle = ctx.args?.trim().toLowerCase();
      if (!handle || !/^[a-z0-9_]{2,32}$/.test(handle)) {
        return {
          text: "Usage: /signup <handle>\nHandle must be 2-32 chars: lowercase letters, numbers, underscores.",
          isError: true,
        };
      }

      const stateDir = getStateDir();
      const existing = loadToken(stateDir);
      if (existing && existing.relayUrl === relayUrl) {
        return {
          text: `Already signed up as "${existing.handle}" on ${relayUrl}. Token is stored locally.`,
        };
      }

      try {
        const res = await client.signup(
          handle,
          pluginConfig.relayAccessToken
        );
        saveToken(stateDir, {
          token: res.token,
          handle: res.handle,
          relayUrl,
        });
        client.setToken(res.token);
        return {
          text: `Signed up as "${res.handle}" on ${relayUrl}. Your token has been saved locally.`,
        };
      } catch (e) {
        return {
          text: `Signup failed: ${(e as Error).message}`,
          isError: true,
        };
      }
    },
  });

  api.registerCommand({
    name: "friends",
    description:
      "Manage friends. Usage: /friends | /friends add <handle> | /friends requests | /friends accept <handle> | /friends reject <handle> | /friends remove <handle>",
    acceptsArgs: true,
    requireAuth: true,
    handler: async (ctx) => {
      const stateDir = getStateDir();
      const saved = loadToken(stateDir);
      if (!saved) {
        return {
          text: "Not signed up yet. Run /signup <handle> first.",
          isError: true,
        };
      }

      const args = ctx.args?.trim() ?? "";
      const parts = args.split(/\s+/);
      const subcommand = parts[0]?.toLowerCase() ?? "";
      const arg = parts[1]?.toLowerCase();

      try {
        if (!subcommand || subcommand === "list") {
          const contacts = await client.getContacts();
          const requests = await client.getFriendRequests();
          const lines: string[] = [];

          lines.push(`Signed in as: ${saved.handle}`);
          lines.push("");

          if (contacts.contacts.length > 0) {
            lines.push(
              `Friends (${contacts.contacts.length}):`
            );
            for (const c of contacts.contacts) {
              lines.push(
                `  - ${c.handle}${c.displayName ? ` (${c.displayName})` : ""}`
              );
            }
          } else {
            lines.push("No friends yet.");
          }

          if (requests.incoming.length > 0) {
            lines.push("");
            lines.push(
              `Pending requests (${requests.incoming.length}):`
            );
            for (const r of requests.incoming) {
              lines.push(`  - from ${r.fromHandle}`);
            }
          }

          return { text: lines.join("\n") };
        }

        if (subcommand === "add") {
          if (!arg) {
            return {
              text: "Usage: /friends add <handle>",
              isError: true,
            };
          }
          const res = await client.sendFriendRequest(arg);
          return {
            text: `Friend request sent to "${res.to}". Waiting for them to accept.`,
          };
        }

        if (subcommand === "requests") {
          const requests = await client.getFriendRequests();
          const lines: string[] = [];

          if (requests.incoming.length > 0) {
            lines.push("Incoming:");
            for (const r of requests.incoming) {
              lines.push(`  - ${r.fromHandle} (use /friends accept ${r.fromHandle})`);
            }
          } else {
            lines.push("No incoming requests.");
          }

          if (requests.outgoing.length > 0) {
            lines.push("");
            lines.push("Outgoing:");
            for (const r of requests.outgoing) {
              lines.push(`  - ${r.toHandle} (pending)`);
            }
          }

          return { text: lines.join("\n") };
        }

        if (subcommand === "accept") {
          if (!arg) {
            return {
              text: "Usage: /friends accept <handle>",
              isError: true,
            };
          }
          await client.acceptFriend(arg);
          return {
            text: `Friend request from "${arg}" accepted! You are now contacts.`,
          };
        }

        if (subcommand === "reject") {
          if (!arg) {
            return {
              text: "Usage: /friends reject <handle>",
              isError: true,
            };
          }
          await client.rejectFriend(arg);
          return { text: `Friend request from "${arg}" rejected.` };
        }

        if (subcommand === "remove") {
          if (!arg) {
            return {
              text: "Usage: /friends remove <handle>",
              isError: true,
            };
          }
          await client.removeContact(arg);
          return { text: `"${arg}" removed from your contacts.` };
        }

        return {
          text: "Unknown subcommand. Usage: /friends [list|add|requests|accept|reject|remove]",
          isError: true,
        };
      } catch (e) {
        return {
          text: `Error: ${(e as Error).message}`,
          isError: true,
        };
      }
    },
  });
}
