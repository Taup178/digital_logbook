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

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1500;

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

      // If backend service is cold-starting, Render might return 502/503/504
      if ([502, 503, 504].includes(res.status) && attempt < MAX_RETRIES) {
        console.warn(
          `[API] Received status ${res.status} from ${url}. Retrying in ${RETRY_DELAY_MS * (attempt + 1)}ms (service may be waking up)...`
        );
        await new Promise((resolve) =>
          setTimeout(resolve, RETRY_DELAY_MS * (attempt + 1))
        );
        continue;
      }

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`API error ${res.status}: ${body}`);
      }

      return (await res.json()) as T;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < MAX_RETRIES) {
        console.warn(
          `[API] Request to ${url} failed (${lastError.message}). Retrying in ${RETRY_DELAY_MS * (attempt + 1)}ms...`
        );
        await new Promise((resolve) =>
          setTimeout(resolve, RETRY_DELAY_MS * (attempt + 1))
        );
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
