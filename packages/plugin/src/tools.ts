import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { jsonResult } from "openclaw/plugin-sdk";
import { RelayClient } from "./relay-client.js";

export function registerTools(api: OpenClawPluginApi, client: RelayClient) {
  api.registerTool(
    () => [
      {
        name: "get_contacts",
        label: "Get ConnectClaw contacts",
        description:
          "Get a list of all your friends/contacts on ConnectClaw. Returns their id, handle, and display name.",
        parameters: { type: "object", properties: {} },
        async execute() {
          const res = await client.getContacts();
          if (res.contacts.length === 0) {
            return jsonResult("You have no contacts yet. Use add_friend to send a friend request.");
          }
          return jsonResult(res.contacts);
        },
      },
      {
        name: "send_message",
        label: "Send ConnectClaw message",
        description:
          "Send a text message to one of your contacts. Requires the contact's id (from get_contacts) and the message content.",
        parameters: {
          type: "object",
          properties: {
            contactId: {
              type: "string",
              description: "The contact ID to send the message to",
            },
            content: {
              type: "string",
              description: "The message text to send",
            },
          },
          required: ["contactId", "content"],
        },
        async execute(_toolCallId: string, params: Record<string, unknown>) {
          const contactId = params.contactId as string;
          const content = params.content as string;
          const res = await client.sendMessage(contactId, content);
          return jsonResult({ status: "sent", id: res.id });
        },
      },
      {
        name: "get_messages",
        label: "Get ConnectClaw messages",
        description:
          "Fetch unread messages from your contacts. Returns message id, sender handle, content, and timestamp. Messages are automatically acknowledged after reading.",
        parameters: { type: "object", properties: {} },
        async execute() {
          const res = await client.getInbox();
          if (res.messages.length === 0) {
            return jsonResult("No unread messages.");
          }
          const ack = res.messages.map((m) => m.id);
          await client.ackMessages(ack);
          return jsonResult(res.messages);
        },
      },
      {
        name: "find_user",
        label: "Find ConnectClaw user",
        description:
          "Search for a user by their handle on the ConnectClaw relay. Returns whether the user exists and if they are your contact.",
        parameters: {
          type: "object",
          properties: {
            handle: {
              type: "string",
              description: "The handle to search for",
            },
          },
          required: ["handle"],
        },
        async execute(_toolCallId: string, params: Record<string, unknown>) {
          const handle = params.handle as string;
          try {
            const res = await client.findUser(handle);
            if (res.isContact) {
              return jsonResult({ found: true, isContact: true, handle: res.handle, displayName: res.displayName });
            }
            return jsonResult({ found: true, isContact: false, handle: res.handle, note: "User exists but is not your contact. Use add_friend to connect." });
          } catch (e) {
            const msg = (e as Error).message;
            if (msg.includes("not found") || msg.includes("404")) {
              // Fallback for relay <0.2.0 that doesn't have GET /users/:handle
              try {
                const contacts = await client.getContacts();
                const found = contacts.contacts.find((c) => c.handle === handle);
                if (found) {
                  return jsonResult({ found: true, isContact: true, handle });
                }
              } catch { /* ignore fallback errors */ }
              return jsonResult({ found: false, handle });
            }
            return jsonResult({ found: false, handle, error: msg });
          }
        },
      },
      {
        name: "add_friend",
        label: "Add ConnectClaw friend",
        description: "Send a friend request to a user by their handle.",
        parameters: {
          type: "object",
          properties: {
            handle: {
              type: "string",
              description: "The handle of the user to add",
            },
          },
          required: ["handle"],
        },
        async execute(_toolCallId: string, params: Record<string, unknown>) {
          const handle = params.handle as string;
          try {
            const res = await client.sendFriendRequest(handle);
            return jsonResult({ status: "pending", to: res.to });
          } catch (e) {
            return jsonResult({ error: (e as Error).message });
          }
        },
      },
      {
        name: "list_friend_requests",
        label: "List ConnectClaw friend requests",
        description:
          "List pending friend requests — both incoming (waiting for you to accept) and outgoing (waiting for others to accept).",
        parameters: { type: "object", properties: {} },
        async execute() {
          const res = await client.getFriendRequests();
          return jsonResult(res);
        },
      },
      {
        name: "accept_friend",
        label: "Accept ConnectClaw friend request",
        description:
          "Accept a pending friend request by the sender's handle.",
        parameters: {
          type: "object",
          properties: {
            handle: {
              type: "string",
              description: "Handle of the user whose request to accept",
            },
          },
          required: ["handle"],
        },
        async execute(_toolCallId: string, params: Record<string, unknown>) {
          const handle = params.handle as string;
          try {
            await client.acceptFriend(handle);
            return jsonResult({ status: "accepted", handle });
          } catch (e) {
            return jsonResult({ error: (e as Error).message });
          }
        },
      },
      {
        name: "remove_friend",
        label: "Remove ConnectClaw friend",
        description:
          "Remove a user from your contacts (unfriend). This is mutual — both sides lose the contact.",
        parameters: {
          type: "object",
          properties: {
            handle: {
              type: "string",
              description: "Handle of the contact to remove",
            },
          },
          required: ["handle"],
        },
        async execute(_toolCallId: string, params: Record<string, unknown>) {
          const handle = params.handle as string;
          try {
            await client.removeContact(handle);
            return jsonResult({ status: "removed", handle });
          } catch (e) {
            return jsonResult({ error: (e as Error).message });
          }
        },
      },
    ],
    { names: ["get_contacts", "send_message", "get_messages", "find_user", "add_friend", "list_friend_requests", "accept_friend", "remove_friend"] }
  );
}
