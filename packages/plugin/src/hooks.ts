import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { execFile } from "node:child_process";
import { RelayClient } from "./relay-client.js";

const POLL_INTERVAL_MS = 15_000;

function wakeAgent(text: string) {
  execFile(
    "openclaw",
    ["system", "event", "--text", text, "--mode", "now"],
    { timeout: 10_000 },
    () => {}
  );
}

export function registerHooks(api: OpenClawPluginApi, client: RelayClient) {
  api.on("before_agent_start", async () => {
    try {
      const res = await client.getInbox();
      if (res.messages.length === 0) return;

      const byUser = new Map<string, number>();
      for (const m of res.messages) {
        byUser.set(m.fromHandle, (byUser.get(m.fromHandle) ?? 0) + 1);
      }

      const parts = [...byUser.entries()].map(
        ([handle, count]) => `${count} from ${handle}`
      );

      return {
        prependContext: `[ConnectClaw] You have ${res.messages.length} unread message(s): ${parts.join(", ")}. Use the get_messages tool to read them.`,
      };
    } catch {
      // silently skip if relay is unreachable
    }
  });
}

export function registerPollService(
  api: OpenClawPluginApi,
  client: RelayClient
) {
  let pollAbort: AbortController | null = null;
  const notifiedIds = new Set<string>();

  function stopPolling() {
    if (pollAbort) {
      pollAbort.abort();
      pollAbort = null;
    }
  }

  function startPolling() {
    stopPolling();
    pollAbort = new AbortController();
    const signal = pollAbort.signal;

    (async () => {
      while (!signal.aborted) {
        try {
          const res = await client.getInbox();
          if (signal.aborted) break;

          const newMessages = res.messages.filter(
            (m) => !notifiedIds.has(m.id)
          );

          if (newMessages.length > 0) {
            for (const m of newMessages) notifiedIds.add(m.id);

            const lines = newMessages.map(
              (m) => `[${m.fromHandle}]: ${m.content}`
            );
            const text = `[ConnectClaw] New message(s) received:\n${lines.join("\n")}\nUse get_messages tool to read and acknowledge them.`;

            wakeAgent(text);
            api.logger.info(
              `ConnectClaw: ${newMessages.length} new message(s) — wake triggered`
            );
          }
        } catch (e) {
          if (signal.aborted) break;
        }

        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      }
    })();
  }

  api.registerService({
    id: "connectclaw-poll",
    start: () => {
      api.logger.info(
        `ConnectClaw: poll service started (interval=${POLL_INTERVAL_MS}ms)`
      );
      startPolling();
    },
    stop: () => {
      stopPolling();
      api.logger.info("ConnectClaw: poll service stopped");
    },
  });
}
