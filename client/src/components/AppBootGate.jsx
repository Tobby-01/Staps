import { useEffect, useMemo, useState } from "react";

import { buildApiUrl } from "../lib/api.js";

const HEALTHCHECK_PATH = "/api/health";
const HEALTHCHECK_TIMEOUT_MS = 8000;
const RETRY_DELAY_MS = 2600;

const getBootDelayByConnection = () => {
  if (typeof navigator === "undefined") {
    return 900;
  }

  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const effectiveType = connection?.effectiveType || "";

  let delay = 900;
  if (effectiveType === "slow-2g") {
    delay = 2600;
  } else if (effectiveType === "2g") {
    delay = 2200;
  } else if (effectiveType === "3g") {
    delay = 1400;
  } else if (effectiveType === "4g") {
    delay = 700;
  }

  if (connection?.saveData) {
    delay += 400;
  }

  return delay;
};

const wait = (durationMs) => new Promise((resolve) => setTimeout(resolve, durationMs));

const getInitialMode = () => {
  if (typeof navigator === "undefined") {
    return "loading";
  }

  return navigator.onLine ? "loading" : "offline";
};

export const AppBootGate = ({ children }) => {
  const [mode, setMode] = useState(getInitialMode);
  const [statusText, setStatusText] = useState(
    typeof navigator !== "undefined" && navigator.onLine
      ? "Warming up STAPS..."
      : "No internet connection. Connect to continue.",
  );

  const healthcheckUrl = useMemo(() => buildApiUrl(HEALTHCHECK_PATH), []);

  useEffect(() => {
    let active = true;
    let currentController = null;

    const runBootChecks = async () => {
      while (active) {
        if (typeof navigator !== "undefined" && !navigator.onLine) {
          setMode("offline");
          setStatusText("No internet connection. Connect to continue.");
          await wait(1000);
          continue;
        }

        setMode("loading");
        setStatusText("Checking connection to STAPS...");

        const minimumBootDelayMs = getBootDelayByConnection();
        const startedAt = Date.now();
        currentController = new AbortController();
        const timeoutId = window.setTimeout(() => currentController?.abort(), HEALTHCHECK_TIMEOUT_MS);

        try {
          const response = await fetch(healthcheckUrl, {
            method: "GET",
            cache: "no-store",
            signal: currentController.signal,
          });

          const elapsed = Date.now() - startedAt;
          const remainingDelay = Math.max(0, minimumBootDelayMs - elapsed);
          await wait(remainingDelay);

          if (!active) {
            return;
          }

          if (response.ok) {
            setMode("ready");
            setStatusText("");
            return;
          }

          setMode("loading");
          setStatusText("Connecting to STAPS services...");
          await wait(RETRY_DELAY_MS);
        } catch (_error) {
          if (!active) {
            return;
          }

          if (typeof navigator !== "undefined" && !navigator.onLine) {
            setMode("offline");
            setStatusText("No internet connection. Connect to continue.");
            await wait(1000);
            continue;
          }

          setMode("loading");
          setStatusText("Connecting to STAPS services...");
          await wait(RETRY_DELAY_MS);
        } finally {
          window.clearTimeout(timeoutId);
        }
      }
    };

    runBootChecks().catch(() => {});

    const handleOffline = () => {
      setMode("offline");
      setStatusText("No internet connection. Connect to continue.");
    };

    window.addEventListener("offline", handleOffline);

    return () => {
      active = false;
      currentController?.abort();
      window.removeEventListener("offline", handleOffline);
    };
  }, [healthcheckUrl]);

  if (mode === "ready") {
    return children;
  }

  return (
    <div className="staps-boot-screen">
      <div className="staps-boot-card">
        <img src="/favicon.svg" alt="STAPS logo" className="staps-boot-logo" />
        <p className="staps-boot-title">STAPS</p>
        <p className="staps-boot-copy">{statusText}</p>
        {mode === "loading" ? (
          <div className="staps-boot-progress" aria-hidden="true">
            <span />
          </div>
        ) : null}
      </div>
    </div>
  );
};
