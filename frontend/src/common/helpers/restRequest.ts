import config from "@/config/config";

interface RestRequestOptions {
  method?: "DELETE" | "GET" | "POST" | "PUT";
  body?: Record<string, unknown>;
  signal?: AbortSignal;
}

export class RestRequestError extends Error {
  status: number;
  data: unknown;

  constructor(status: number, data: unknown) {
    super(`Request failed with status ${status}`);
    this.status = status;
    this.data = data;
  }
}

export async function restRequest<T>(
  endpoint: string,
  options: RestRequestOptions = {},
): Promise<T> {
  const { API_URL, NONCE, REST_NONCE } = config;
  const url = new URL(`${API_URL.base}/${endpoint}`, window.location.origin);

  const method = options.method ?? "GET";

  const fetchOptions: RequestInit = {
    method,
    credentials: "same-origin",
    headers: {
      "X-WP-Nonce": REST_NONCE,
      "X-Icon-Base-Nonce": NONCE,
    },
    signal: options.signal,
  };

  if (options.body && method !== "GET") {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(options.body)) {
      if (value != null) {
        params.append(key, typeof value === "string" ? value : JSON.stringify(value));
      }
    }
    fetchOptions.body = params;
  }

  const response = await fetch(url, fetchOptions);

  let data: T;
  try {
    data = (await response.json()) as T;
  } catch {
    throw new RestRequestError(response.status, "Invalid JSON response");
  }

  if (!response.ok) {
    throw new RestRequestError(response.status, data);
  }

  return data;
}
