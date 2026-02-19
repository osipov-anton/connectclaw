export type SignupResponse = { token: string; handle: string };
export type MeResponse = {
  id: string;
  handle: string;
  displayName: string | null;
  createdAt: number;
};
export type Contact = {
  id: string;
  handle: string;
  displayName: string | null;
  createdAt: number;
};
export type ContactsResponse = { contacts: Contact[] };
export type FriendRequest = {
  id: string;
  fromHandle?: string;
  fromDisplayName?: string | null;
  toHandle?: string;
  toDisplayName?: string | null;
  status: string;
  createdAt: number;
};
export type FriendRequestsResponse = {
  incoming: FriendRequest[];
  outgoing: FriendRequest[];
};
export type InboxMessage = {
  id: string;
  fromHandle: string;
  content: string;
  createdAt: number;
};
export type InboxResponse = { messages: InboxMessage[] };

export class RelayClient {
  constructor(
    private baseUrl: string,
    private token?: string
  ) {}

  setToken(token: string) {
    this.token = token;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    skipAuth = false,
    signal?: AbortSignal
  ): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (!skipAuth) {
      if (!this.token) throw new Error("Not authenticated. Run /signup first.");
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal,
    });

    const json = await res.json();

    if (!res.ok) {
      const msg =
        (json as { error?: string }).error ?? `HTTP ${res.status}`;
      throw new Error(msg);
    }

    return json as T;
  }

  signup(
    handle: string,
    accessToken?: string
  ): Promise<SignupResponse> {
    return this.request<SignupResponse>(
      "POST",
      "/signup",
      { handle, accessToken },
      true
    );
  }

  me(): Promise<MeResponse> {
    return this.request<MeResponse>("GET", "/me");
  }

  getContacts(): Promise<ContactsResponse> {
    return this.request<ContactsResponse>("GET", "/contacts");
  }

  sendFriendRequest(handle: string) {
    return this.request<{ id: string; to: string; status: string }>(
      "POST",
      "/friends/request",
      { handle }
    );
  }

  getFriendRequests(): Promise<FriendRequestsResponse> {
    return this.request<FriendRequestsResponse>("GET", "/friends/requests");
  }

  acceptFriend(handle: string) {
    return this.request<{ status: string; handle: string }>(
      "POST",
      "/friends/accept",
      { handle }
    );
  }

  rejectFriend(handle: string) {
    return this.request<{ status: string; handle: string }>(
      "POST",
      "/friends/reject",
      { handle }
    );
  }

  findUser(handle: string) {
    return this.request<{ handle: string; displayName: string | null; isContact: boolean }>(
      "GET",
      `/users/${encodeURIComponent(handle)}`
    );
  }

  removeContact(handle: string) {
    return this.request<{ status: string; handle: string }>(
      "DELETE",
      `/contacts/${encodeURIComponent(handle)}`
    );
  }

  sendMessage(contactId: string, content: string) {
    return this.request<{ id: string; status: string }>(
      "POST",
      "/messages/send",
      { contactId, content }
    );
  }

  getInbox(): Promise<InboxResponse> {
    return this.request<InboxResponse>("GET", "/messages/inbox");
  }

  pollInbox(
    timeoutSeconds = 30,
    signal?: AbortSignal
  ): Promise<InboxResponse> {
    return this.request<InboxResponse>(
      "GET",
      `/messages/poll?timeout=${timeoutSeconds}`,
      undefined,
      false,
      signal
    );
  }

  ackMessages(messageIds: string[]) {
    return this.request<{ acknowledged: number }>("POST", "/messages/ack", {
      messageIds,
    });
  }
}
