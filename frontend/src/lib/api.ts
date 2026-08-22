// All requests go to backend services or API gateway.
export const AUTH_URL =
  import.meta.env.VITE_AUTH_SERVICE_URL ||
  "https://auth-service-hl52.onrender.com";
export const DASHBOARD_URL =
  import.meta.env.VITE_DASHBOARD_SERVICE_URL ||
  "https://dashboard-service-bpc5.onrender.com";
export const PROJECT_URL =
  import.meta.env.VITE_PROJECT_SERVICE_URL ||
  "https://project-service-96ml.onrender.com";
export const PROFILE_URL =
  import.meta.env.VITE_PROFILE_SERVICE_URL ||
  "https://profile-service-0zk7.onrender.com";

const RETRY_DELAYS = [2000, 3000, 5000, 7000, 10000, 12000];
const MAX_RETRIES = RETRY_DELAYS.length;

export async function request<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  if (!url || url.startsWith("undefined")) {
    throw new Error(
      `Invalid API URL: "${url}". Please ensure backend service URLs are configured.`
    );
  }

  const { supabase } = await import("./supabase");
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token || "";

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
          ...options?.headers,
        },
      });

      // If backend service is cold-starting on Render free tier, status is 502/503/504
      if ([502, 503, 504].includes(res.status)) {
        if (attempt < MAX_RETRIES) {
          const delay = RETRY_DELAYS[attempt];
          console.warn(
            `[API] Render service is waking up (status ${res.status}). Retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})...`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        } else {
          throw new Error(
            "Service is waking up from idle on Render. Please wait a few moments and try again."
          );
        }
      }

      if (!res.ok) {
        const body = await res.text();
        // If the error response is raw HTML (e.g. 502/504 from Render proxy), return a clean message
        if (body.includes("<!DOCTYPE") || body.includes("<html")) {
          throw new Error(
            `Service temporarily unavailable (${res.status}). It may be waking up. Please retry shortly.`
          );
        }
        let parsedMessage = body;
        try {
          const json = JSON.parse(body);
          parsedMessage = json.message || json.error || body;
        } catch {
          // keep body as string
        }
        throw new Error(parsedMessage);
      }

      return (await res.json()) as T;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      // Retry on network errors / connection drops during cold-start
      if (attempt < MAX_RETRIES && !lastError.message.includes("401") && !lastError.message.includes("400") && !lastError.message.includes("403")) {
        const delay = RETRY_DELAYS[attempt];
        console.warn(
          `[API] Request to ${url} failed (${lastError.message}). Retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})...`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        break;
      }
    }
  }

  throw (
    lastError ||
    new Error(`Failed to communicate with service at ${url}`)
  );
}

export const api = {
  auth: {
    health: () => request<{ service: string; status: string }>(`${AUTH_URL}`),
  },
  dashboard: {
    health: () =>
      request<{ service: string; status: string }>(`${DASHBOARD_URL}`),
  },
  projects: {
    health: () =>
      request<{ service: string; status: string }>(`${PROJECT_URL}`),
  },
};
