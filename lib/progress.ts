"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

const STORAGE_KEY = "rundrama:progress";

type StoredProgress = {
  distanceKm: number;
};

function readStoredDistance() {
  if (typeof window === "undefined") {
    return 0;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return 0;
    }

    const parsed = JSON.parse(raw) as Partial<StoredProgress>;
    return typeof parsed.distanceKm === "number" && Number.isFinite(parsed.distanceKm)
      ? Math.max(0, parsed.distanceKm)
      : 0;
  } catch {
    return 0;
  }
}

function writeStoredDistance(distanceKm: number) {
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ distanceKm: Math.max(0, distanceKm) } satisfies StoredProgress),
  );
  window.dispatchEvent(new Event("rundrama-progress"));
}

export function useProgress() {
  const distanceKm = useSyncExternalStore(
    (onStoreChange) => {
      window.addEventListener("storage", onStoreChange);
      window.addEventListener("rundrama-progress", onStoreChange);

      return () => {
        window.removeEventListener("storage", onStoreChange);
        window.removeEventListener("rundrama-progress", onStoreChange);
      };
    },
    readStoredDistance,
    () => 0,
  );

  const setDistanceKm = useCallback((nextDistanceKm: number) => {
    const normalized = Math.max(0, Number(nextDistanceKm.toFixed(1)));
    writeStoredDistance(normalized);
  }, []);

  const addDistanceKm = useCallback(
    (amountKm: number) => {
      setDistanceKm(distanceKm + amountKm);
    },
    [distanceKm, setDistanceKm],
  );

  const reset = useCallback(() => {
    setDistanceKm(0);
  }, [setDistanceKm]);

  return useMemo(
    () => ({
      addDistanceKm,
      distanceKm,
      isLoaded: true,
      reset,
      setDistanceKm,
    }),
    [addDistanceKm, distanceKm, reset, setDistanceKm],
  );
}
