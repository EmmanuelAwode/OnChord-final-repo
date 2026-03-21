import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import App from "./App.tsx";
import "./index.css";
import { captureException, initMonitoring } from "./lib/monitoring";

initMonitoring();

window.addEventListener("error", (event) => {
	captureException(event.error || event.message, "window-error");
});

window.addEventListener("unhandledrejection", (event) => {
	captureException(event.reason, "unhandled-rejection");
});

createRoot(document.getElementById("root")!).render(
	<Sentry.ErrorBoundary fallback={<div>Something went wrong. Please refresh.</div>}>
		<App />
	</Sentry.ErrorBoundary>
);
