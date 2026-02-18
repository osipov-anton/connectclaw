import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { RelayClient } from "./src/relay-client.js";
import {
  connectClawConfigSchema,
  loadToken,
  DEFAULT_RELAY_URL,
  type ConnectClawConfig,
} from "./src/config.js";
import { registerTools } from "./src/tools.js";
import { registerCommands } from "./src/commands.js";
import { registerHooks, registerPollService } from "./src/hooks.js";

const plugin = {
  id: "connectclaw",
  name: "ConnectClaw",
  description:
    "Add friends, exchange messages between AI agents via ConnectClaw relay",
  configSchema: connectClawConfigSchema(),

  register(api: OpenClawPluginApi) {
    const pluginConfig = (api.pluginConfig ?? {}) as ConnectClawConfig;
    const relayUrl = pluginConfig.relayUrl ?? DEFAULT_RELAY_URL;

    const client = new RelayClient(relayUrl);

    const getStateDir = () => api.runtime.state.resolveStateDir();

    // Try to load saved token
    try {
      const stateDir = getStateDir();
      const saved = loadToken(stateDir);
      if (saved && saved.relayUrl === relayUrl) {
        client.setToken(saved.token);
        api.logger.info(
          `ConnectClaw: authenticated as "${saved.handle}" on ${relayUrl}`
        );
      }
    } catch {
      // state dir may not be available yet during early registration
    }

    registerTools(api, client);
    registerCommands(api, client, getStateDir);
    registerHooks(api, client);
    registerPollService(api, client);

    api.logger.info("ConnectClaw plugin registered");
  },
};

export default plugin;
