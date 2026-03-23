const defaultHeaders = {
  Accept: "application/json",
};

export const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");
const authTokenStorageKey = "staps_auth_token";
const requestTimeoutMs = 30000;

const apiUnavailableMessage = apiBaseUrl
  ? "STAPS is temporarily unavailable right now. Please refresh and try again in a moment."
  : "Cannot reach the STAPS API. Start the backend on http://localhost:5000 and make sure MongoDB is running on 127.0.0.1:27017.";

export const getStoredAuthToken = () => {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(authTokenStorageKey) || "";
};

export const setStoredAuthToken = (token) => {
  if (typeof window === "undefined") {
    return;
  }

  if (token) {
    window.localStorage.setItem(authTokenStorageKey, token);
    return;
  }

  window.localStorage.removeItem(authTokenStorageKey);
};

export const buildApiUrl = (path) => {
  if (!path) {
    return path;
  }

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return apiBaseUrl ? `${apiBaseUrl}${path}` : path;
};

export const resolveAssetUrl = (path) => {
  if (!path) {
    return "";
  }

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return apiBaseUrl ? `${apiBaseUrl}${path}` : path;
};

export const apiRequest = async (path, options = {}) => {
  let response;
  const storedToken = getStoredAuthToken();
  const controller = new AbortController();
  const timeoutId =
    typeof window !== "undefined"
      ? window.setTimeout(() => controller.abort(), requestTimeoutMs)
      : setTimeout(() => controller.abort(), requestTimeoutMs);

  try {
    response = await fetch(buildApiUrl(path), {
      credentials: "include",
      signal: controller.signal,
      headers: {
        ...defaultHeaders,
        ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
        ...(storedToken && !options.headers?.Authorization
          ? { Authorization: `Bearer ${storedToken}` }
          : {}),
        ...(options.headers || {}),
      },
      ...options,
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("STAPS took too long to respond. Please try again in a moment.");
    }

    throw new Error(apiUnavailableMessage);
  } finally {
    clearTimeout(timeoutId);
  }

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json().catch(() => ({}))
    : await response.text().catch(() => "");

  if (!response.ok) {
    if ([502, 503, 504].includes(response.status)) {
      throw new Error(apiUnavailableMessage);
    }

    if (
      response.status === 500 &&
      ((typeof payload === "string" && !payload.trim()) ||
        (typeof payload === "object" && payload && !payload.message))
    ) {
      throw new Error(apiUnavailableMessage);
    }

    if (typeof payload === "string" && payload.trim()) {
      throw new Error(payload.trim());
    }

    throw new Error(payload.message || `Request failed with status ${response.status}`);
  }

  return payload;
};

export { apiUnavailableMessage };
