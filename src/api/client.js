import axios from "axios";
import { generateCorrelationId, logger } from "../utils/logger";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://spacebook-505h.onrender.com/api";

const client = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000, // 15-second timeout for enterprise resilience
});

// Request Interceptor: Attach JWT Token, Correlation ID, and Timestamp
client.interceptors.request.use(
  (config) => {
    // 1. Correlation ID for End-to-End Observability
    const correlationId = generateCorrelationId();
    config.headers["X-Correlation-ID"] = correlationId;
    config.headers["X-Request-ID"] = correlationId;
    config.metadata = { startTime: Date.now(), correlationId };

    // 2. JWT Authentication Header
    const token = localStorage.getItem("spacebook_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    logger.error("API Request setup failed", error);
    return Promise.reject(error);
  }
);

let isSessionExpiredDispatched = false;

// Response Interceptor: Logging, Metrics & Resilient Error Handling
client.interceptors.response.use(
  (response) => {
    const duration = Date.now() - (response.config.metadata?.startTime || Date.now());
    const correlationId = response.config.headers?.["X-Correlation-ID"];

    logger.debug(`API Success: ${response.config.method?.toUpperCase()} ${response.config.url} (${duration}ms)`, {
      correlationId,
      status: response.status,
      durationMs: duration,
    });

    return response;
  },
  async (error) => {
    const config = error.config || {};
    const correlationId = config.headers?.["X-Correlation-ID"];
    const status = error.response?.status;
    const url = config.url || "";

    // 1. Log structured error for observability
    logger.error(`API Error: ${config.method?.toUpperCase()} ${url} [${status || "NETWORK_ERROR"}]`, error, {
      correlationId,
      status,
      url,
      method: config.method,
      data: error.response?.data,
    });

    // 2. Auto-Retry Logic with Exponential Backoff (for GET requests on 502/503/504 or network timeout)
    if (
      config.method?.toLowerCase() === "get" &&
      (!status || status >= 500) &&
      (!config._retryCount || config._retryCount < 2)
    ) {
      config._retryCount = (config._retryCount || 0) + 1;
      const delay = Math.pow(2, config._retryCount) * 1000; // 2s, 4s

      logger.warn(`Retrying request (${config._retryCount}/2) in ${delay}ms: ${url}`, { correlationId });
      await new Promise((resolve) => setTimeout(resolve, delay));
      return client(config);
    }

    // 3. Handle 401 Session Expiration
    const isAuthEndpoint =
      url.toLowerCase().includes("/auth/login") ||
      url.toLowerCase().includes("/auth/register");

    if (status === 401 && !isAuthEndpoint) {
      if (
        typeof window !== "undefined" &&
        window.location.pathname !== "/login" &&
        !isSessionExpiredDispatched
      ) {
        isSessionExpiredDispatched = true;
        logger.warn("User session expired or unauthorized. Dispatching logout event.", { correlationId });
        window.dispatchEvent(new Event("spacebook_session_expired"));

        setTimeout(() => {
          isSessionExpiredDispatched = false;
        }, 30000);
      }
    }

    return Promise.reject(error);
  }
);

export default client;
