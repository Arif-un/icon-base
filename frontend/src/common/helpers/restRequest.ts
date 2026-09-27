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

  // An endpoint may carry its own query string (e.g. "icons?page=1&per_page=100"). On sites with
  // plain permalinks API_URL.base is already a query URL ("…/?rest_route=/IconIndexa/v1"), so the
  // extra params must join with "&" - the backend hands us the right joiner in API_URL.separator
  // ("?" for pretty permalinks, "&" for plain). A hard-coded "?" would produce a second "?" that WP
  // reads as rest_route="/IconIndexa/v1/icons?page=1" -> rest_no_route (404), breaking the grid.
  const qIndex = endpoint.indexOf("?");
  const path = qIndex === -1 ? endpoint : endpoint.slice(0, qIndex);
  const query = qIndex === -1 ? "" : endpoint.slice(qIndex + 1);
  const target = `${API_URL.base}/${path}`;
  const url = new URL(
    query ? `${target}${API_URL.separator}${query}` : target,
    window.location.origin,
  );

  const method = options.method ?? "GET";

  const fetchOptions: RequestInit = {
    method,
    credentials: "same-origin",
    headers: {
      "X-WP-Nonce": REST_NONCE,
      "X-Icon-Indexa-Nonce": NONCE,
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
