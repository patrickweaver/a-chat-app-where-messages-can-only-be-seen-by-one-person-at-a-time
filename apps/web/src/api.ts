export interface User {
  id: string;
  username: string;
  email: string;
}

export interface MessageSummary {
  id: string;
  /** Who sent or last forwarded the message to you. */
  fromUsername: string;
  receivedAt: string;
}

export interface Message extends MessageSummary {
  body: string;
  /** Reaction from the most recent forward, if the message has been forwarded. */
  latestReaction: string | null;
  /** Reactions from earlier forwards, oldest first. */
  earlierReactions: string[];
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error ?? `Request failed (${res.status})`, res.status);
  return data as T;
}

export const api = {
  me: () => request<{ user: User }>("GET", "/auth/me").then((r) => r.user),
  signup: (input: { username: string; email: string; password: string }) =>
    request<{ user: User }>("POST", "/auth/signup", input).then((r) => r.user),
  login: (input: { username: string; password: string }) =>
    request<{ user: User }>("POST", "/auth/login", input).then((r) => r.user),
  logout: () => request<void>("POST", "/auth/logout"),
  sendMessage: (input: { to: string; body: string }) => request<void>("POST", "/messages", input),
  listMessages: () =>
    request<{ messages: MessageSummary[] }>("GET", "/messages").then((r) => r.messages),
  getMessage: (id: string) =>
    request<{ message: Message }>("GET", `/messages/${encodeURIComponent(id)}`).then(
      (r) => r.message,
    ),
  forwardMessage: (id: string, input: { to: string; reaction: string }) =>
    request<void>("POST", `/messages/${encodeURIComponent(id)}/forward`, input),
};
