import * as Sentry from "@sentry/react";

let monitoringEnabled = false;

export function initMonitoring() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) {
    monitoringEnabled = false;
    return;
  }

  Sentry.init({
    dsn,
    environment: import.meta.env.VITE_APP_ENV || import.meta.env.MODE,
    tracesSampleRate: Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE || "0"),
  });

  monitoringEnabled = true;
}

export function captureException(error: unknown, context?: string) {
  if (monitoringEnabled) {
    Sentry.captureException(error, {
      tags: context ? { context } : undefined,
    });
  }

  if (import.meta.env.DEV) {
    console.error(context ? `[${context}]` : "[error]", error);
  }
}

export function captureMessage(message: string, level: "info" | "warning" | "error" = "info") {
  if (monitoringEnabled) {
    Sentry.captureMessage(message, level);
  }

  if (import.meta.env.DEV) {
    const method = level === "error" ? "error" : level === "warning" ? "warn" : "log";
    console[method](message);
  }
}

export function isMonitoringEnabled() {
  return monitoringEnabled;
}
