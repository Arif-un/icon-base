import config from "@config/config";

// Types
export type ApiResponseType = Record<string, number | string>;

export type MethodType = "GET" | "POST";

export type QueryParam = Record<string, number | string>;

export interface Response<T> {
  code: "ERROR" | "SUCCESS" | "VALIDATION" | "WARNING";
  data: T;
  status: "error" | "success";
}

export interface EndpointType {
  bodyParams?: Record<string, MaybeArrayEndPointValueType>;
  headers?: Record<string, MaybeArrayEndPointValueType>;
  method: MethodType;
  queryParams?: Record<string, MaybeArrayEndPointValueType>;
  url: string;
}

export interface EncryptionValueType {
  encryption:
    | "base64_decode"
    | "base64_encode"
    | "base64_urlencode"
    | "hmac_decrypt"
    | "hmac_encrypt"
    | "sha256";
  value: MaybeArrayEndPointValueType;
}

type EndPointValueType = EncryptionValueType | number | Record<string, unknown> | string;
type MaybeArrayEndPointValueType = EndPointValueType | EndPointValueType[];

interface RequestOptions {
  body?: FormData | string;
  headers?: Record<string, string>;
  method?: MethodType;
  signal?: AbortSignal;
}

// Helpers

const replaceUndefined = (_: string, value: unknown) => (value === undefined ? null : value);

const createUrl = (action: string, queryParams?: QueryParam): URL => {
  const { AJAX_URL, NONCE, ROUTE_PREFIX } = config;
  const uri = new URL(AJAX_URL);

  uri.searchParams.append("action", `${ROUTE_PREFIX}${action}`);
  uri.searchParams.append("_ajax_nonce", NONCE);

  if (queryParams) {
    Object.entries(queryParams).forEach(([key, value]) => {
      uri.searchParams.append(key, value.toString());
    });
  }

  return uri;
};

const createRequestOptions = (
  method: MethodType,
  data?: unknown,
  options?: RequestOptions,
): RequestOptions => {
  const fetchOptions: RequestOptions = {
    method,
    ...options,
  };

  if (method.toLowerCase() === "post" && data) {
    fetchOptions.body = data instanceof FormData ? data : JSON.stringify(data, replaceUndefined);
  }

  return fetchOptions;
};

// Main request functions
export default async function queryRequest<T>(
  action: string,
  data?: unknown,
  queryParam?: QueryParam,
  method: MethodType = "POST",
  options?: RequestOptions,
): WPStarterKitPromise<Response<T>> {
  const uri = createUrl(action, queryParam);
  const fetchOptions = createRequestOptions(method, data, options);

  try {
    const response = await fetch(uri, fetchOptions);
    const responseData = await response.json();

    if (!response.ok) {
      throw responseData;
    }

    return responseData as Response<T>;
  } catch (error) {
    if (error instanceof Error) {
      throw { code: "ERROR", data: error.message, status: "error" } as Response<T>;
    }
    throw error;
  }
}

export async function request<T>(
  action: string,
  data?: unknown,
  queryParam?: QueryParam,
  method: MethodType = "POST",
  options?: RequestOptions,
): WPStarterKitPromise<Response<T>> {
  return queryRequest<T>(action, data, queryParam, method, options).catch(
    (error) => error as Response<T>,
  );
}

export async function proxyRequest<T>(data: EndpointType): WPStarterKitPromise<Response<T>> {
  return queryRequest<T>("proxy/route", data).catch((error) => error as Response<T>);
}
