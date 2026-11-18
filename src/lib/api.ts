let memoryToken: string | null = null;

export function setAuthToken(token: string | null): void {
  memoryToken = token;
}

export function getAuthToken(): string | null {
  return memoryToken;
}

export async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (memoryToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${memoryToken}`);
  }
  if (!(options.body instanceof FormData) && !headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  const contentType = res.headers.get('content-type') || '';
  const rawText = await res.text();

  let parsed: unknown = null;
  if (rawText) {
    try {
      parsed = JSON.parse(rawText);
    } catch {
      parsed = null;
    }
  }

  if (!res.ok) {
    const errObj = parsed as { error?: string } | null;
    const message =
      errObj?.error ||
      (contentType.includes('text/html') || rawText.trimStart().startsWith('<')
        ? `Server returned an HTML error page (${res.status}) instead of JSON.`
        : `Request failed (${res.status})`);
    throw new Error(message);
  }

  if (parsed === null && rawText.trim().length > 0) {
    throw new Error(
      'Received a non-JSON response from the API server. Verify the Node.js backend and database configuration.'
    );
  }

  return parsed as T;
}
