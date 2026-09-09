const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export function apiUrl(path: string) {
  return `${API}${path}`;
}

async function readError(res: Response) {
  try {
    const data = await res.json();
    if (typeof data?.message === "string") return data.message;
    if (Array.isArray(data?.message)) return data.message.join(" ");
    return res.statusText;
  } catch {
    return res.statusText;
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(apiUrl(path), {
    ...init,
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(await readError(res));
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export async function apiForm<T>(path: string, form: FormData): Promise<T> {
  return api<T>(path, { method: "POST", body: form });
}

export async function apiFile(
  path: string,
  filename: string,
  type?: string,
): Promise<File> {
  const res = await fetch(apiUrl(path), { credentials: "include" });
  if (!res.ok) {
    throw new Error(await readError(res));
  }
  const blob = await res.blob();
  return new File([blob], filename, {
    type: type || blob.type || "application/octet-stream",
  });
}
