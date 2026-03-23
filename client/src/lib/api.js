const defaultHeaders = {
  Accept: "application/json",
};

const apiUnavailableMessage =
  "Cannot reach the STAPS API. Start the backend on http://localhost:5000 and make sure MongoDB is running on 127.0.0.1:27017.";

export const apiRequest = async (path, options = {}) => {
  let response;

  try {
    response = await fetch(path, {
      credentials: "include",
      headers: {
        ...defaultHeaders,
        ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
        ...(options.headers || {}),
      },
      ...options,
    });
  } catch (_error) {
    throw new Error(apiUnavailableMessage);
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
