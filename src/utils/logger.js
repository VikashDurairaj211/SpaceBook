/**
 * SpaceBook Enterprise Structured Logger & Observability Engine
 * Provides JSON-structured logging with Correlation IDs, timestamping, and context enrichment.
 */

// Simple UUID v4 generator for browser environments
export function generateCorrelationId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "req-" + "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

let activeCorrelationId = generateCorrelationId();

export function getCorrelationId() {
  return activeCorrelationId;
}

export function setCorrelationId(id) {
  activeCorrelationId = id || generateCorrelationId();
  return activeCorrelationId;
}

function getUserContext() {
  try {
    const raw = localStorage.getItem("spacebook_user");
    if (raw) {
      const u = JSON.parse(raw);
      return { userId: u.id, email: u.email, role: u.role };
    }
  } catch {
    // ignore
  }
  return { userId: "anonymous", role: "guest" };
}

function formatLog(level, message, context = {}) {
  return {
    timestamp: new Date().toISOString(),
    level: level.toUpperCase(),
    correlationId: context.correlationId || activeCorrelationId,
    message,
    user: getUserContext(),
    context,
  };
}

export const logger = {
  info(message, context = {}) {
    const entry = formatLog("INFO", message, context);
    if (process.env.NODE_ENV !== "test") {
      console.log(`[INFO] [${entry.correlationId}] ${message}`, context);
    }
    return entry;
  },

  warn(message, context = {}) {
    const entry = formatLog("WARN", message, context);
    console.warn(`[WARN] [${entry.correlationId}] ${message}`, context);
    return entry;
  },

  error(message, error = null, context = {}) {
    const entry = formatLog("ERROR", message, {
      ...context,
      errorMessage: error?.message || String(error),
      errorStack: error?.stack,
    });
    console.error(`[ERROR] [${entry.correlationId}] ${message}`, entry);
    return entry;
  },

  debug(message, context = {}) {
    if (process.env.NODE_ENV === "development") {
      const entry = formatLog("DEBUG", message, context);
      console.debug(`[DEBUG] [${entry.correlationId}] ${message}`, context);
      return entry;
    }
  },
};

export default logger;
