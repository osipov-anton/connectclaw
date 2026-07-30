import assert from "node:assert/strict";
import test from "node:test";
import type { OpenClawPluginApi } from "openclaw/plugin-sdk/plugin-entry";
import { registerHooks } from "./hooks.js";
import type { RelayClient } from "./relay-client.js";

type PromptHookResult = { prependContext?: string } | void;
type PromptHookHandler = (...args: unknown[]) => Promise<PromptHookResult> | PromptHookResult;

function capturePromptHook() {
  let hookName: string | undefined;
  let hookHandler: PromptHookHandler | undefined;
  const api = {
    on(name: string, handler: PromptHookHandler) {
      hookName = name;
      hookHandler = handler;
    },
  } as unknown as OpenClawPluginApi;

  return {
    api,
    get registration() {
      return { hookName, hookHandler };
    },
  };
}

test("registers unread-message context on before_prompt_build", async () => {
  const captured = capturePromptHook();
  const client = {
    getInbox: async () => ({
      messages: [
        { id: "1", fromHandle: "alice", content: "one", createdAt: 1 },
        { id: "2", fromHandle: "alice", content: "two", createdAt: 2 },
        { id: "3", fromHandle: "bob", content: "three", createdAt: 3 },
      ],
    }),
  } as unknown as RelayClient;

  registerHooks(captured.api, client);

  assert.equal(captured.registration.hookName, "before_prompt_build");
  assert.ok(captured.registration.hookHandler);
  assert.deepEqual(await captured.registration.hookHandler(), {
    prependContext:
      "[ConnectClaw] You have 3 unread message(s): 2 from alice, 1 from bob. Use the get_messages tool to read them.",
  });
});

test("returns no prompt context when the inbox is empty", async () => {
  const captured = capturePromptHook();
  const client = {
    getInbox: async () => ({ messages: [] }),
  } as unknown as RelayClient;

  registerHooks(captured.api, client);

  assert.ok(captured.registration.hookHandler);
  assert.equal(await captured.registration.hookHandler(), undefined);
});
