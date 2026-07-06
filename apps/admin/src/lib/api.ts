import { env } from "./env";

export class ApiError extends Error {}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${env.NEXT_PUBLIC_API_URL}/api/v1${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    ...init,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(body.error ?? `Request to ${path} failed (${res.status})`);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export function createResourceClient<TItem>(basePath: string) {
  return {
    basePath,
    list: () => request<{ items: TItem[] }>(`${basePath}`).then((r) => r.items),
    listAdmin: () => request<{ items: TItem[] }>(`${basePath}/admin`).then((r) => r.items),
    get: (id: string) => request<{ item: TItem }>(`${basePath}/${id}`).then((r) => r.item),
    create: (data: Partial<TItem>) =>
      request<{ item: TItem }>(`${basePath}`, { method: "POST", body: JSON.stringify(data) }).then((r) => r.item),
    update: (id: string, data: Partial<TItem>) =>
      request<{ item: TItem }>(`${basePath}/${id}`, { method: "PATCH", body: JSON.stringify(data) }).then(
        (r) => r.item,
      ),
    remove: (id: string) => request<void>(`${basePath}/${id}`, { method: "DELETE" }),
  };
}

export { request };
