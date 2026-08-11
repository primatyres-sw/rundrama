"use client";

import { AnimatePresence, motion, useMotionValue } from "framer-motion";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Lock,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Wifi,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  EPISODES,
  SEASON_TWO_THRESHOLD_KM,
  getLockedDistance,
  isEpisodeUnlocked,
} from "@/lib/episodes";
import { useProgress } from "@/lib/progress";

const PATH_POINTS = [
  { x: 52, y: 8 },
  { x: 32, y: 24 },
  { x: 62, y: 41 },
  { x: 42, y: 58 },
] as const;
const UNLOCK_STAGGER_MS = 600;

type Screen = "home" | "player";
type ConnectionState = "idle" | "connecting" | "connected";

type SyncResponse = {
  activityCount?: number;
  athleteName?: string | null;
  distanceKm?: number;
  error?: string;
  latestActivityName?: string | null;
};

export default function Home() {
  const { distanceKm, isLoaded, reset, setDistanceKm } = useProgress();
  const [connectionState, setConnectionState] = useState<ConnectionState>("idle");
  const [screen, setScreen] = useState<Screen>("home");
  const [activeIndex, setActiveIndex] = useState(0);
  const [celebratingEpisodeIds, setCelebratingEpisodeIds] = useState<number[]>([]);
  const [gateMessage, setGateMessage] = useState("");
  const [syncInProgress, setSyncInProgress] = useState(false);
  const [stravaMessage, setStravaMessage] = useState("");
  const [stravaMessageIsError, setStravaMessageIsError] = useState(false);
  const scheduledTimeouts = useRef<number[]>([]);

  const unlockedCount = useMemo(
    () => EPISODES.filter((episode) => isEpisodeUnlocked(distanceKm, episode)).length,
    [distanceKm],
  );
  const clampedActiveIndex = Math.min(activeIndex, Math.max(0, unlockedCount - 1));

  const clearScheduledTimeouts = useCallback(() => {
    scheduledTimeouts.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    scheduledTimeouts.current = [];
  }, []);

  const scheduleTimeout = useCallback((callback: () => void, delayMs: number) => {
    const timeoutId = window.setTimeout(() => {
      scheduledTimeouts.current = scheduledTimeouts.current.filter((id) => id !== timeoutId);
      callback();
    }, delayMs);

    scheduledTimeouts.current.push(timeoutId);
  }, []);

  const celebrateEpisodeUnlock = useCallback(
    (episodeId: number) => {
      window.navigator.vibrate?.([35, 30, 35]);
      setCelebratingEpisodeIds((currentIds) =>
        currentIds.includes(episodeId) ? currentIds : [...currentIds, episodeId],
      );

      scheduleTimeout(() => {
        setCelebratingEpisodeIds((currentIds) => currentIds.filter((id) => id !== episodeId));
      }, 1000);
    },
    [scheduleTimeout],
  );

  const setDistanceWithUnlockFeedback = useCallback(
    (nextDistanceKm: number) => {
      const previousUnlockedCount = unlockedCount;
      const nextUnlockedCount = EPISODES.filter((episode) =>
        isEpisodeUnlocked(nextDistanceKm, episode),
      ).length;

      setDistanceKm(nextDistanceKm);
      EPISODES.slice(previousUnlockedCount, nextUnlockedCount).forEach((episode) => {
        celebrateEpisodeUnlock(episode.id);
      });
    },
    [celebrateEpisodeUnlock, setDistanceKm, unlockedCount],
  );

  const connectStrava = useCallback(() => {
    if (connectionState !== "idle") {
      return;
    }

    setConnectionState("connecting");
    // Full-page navigation, not fetch — Strava's consent screen has to render
    // in the top-level window for the athlete to approve it.
    window.location.href = "/api/strava/auth";
  }, [connectionState]);

  const addOneKm = useCallback(() => {
    setDistanceWithUnlockFeedback(distanceKm + 1);
  }, [distanceKm, setDistanceWithUnlockFeedback]);

  /** Walks the odometer up to `targetKm`, popping each episode open on the way. */
  const runUnlockSequence = useCallback(
    (targetKm: number) => {
      clearScheduledTimeouts();
      setCelebratingEpisodeIds([]);

      const unlockSteps = EPISODES.filter(
        (episode) => episode.thresholdKm > distanceKm && episode.thresholdKm <= targetKm,
      );

      if (unlockSteps.length === 0) {
        setDistanceKm(targetKm);
        return 0;
      }

      unlockSteps.forEach((episode, index) => {
        scheduleTimeout(() => {
          setDistanceKm(episode.thresholdKm);
          celebrateEpisodeUnlock(episode.id);
        }, (index + 1) * UNLOCK_STAGGER_MS);
      });

      const totalDurationMs = (unlockSteps.length + 1) * UNLOCK_STAGGER_MS;
      scheduleTimeout(() => setDistanceKm(targetKm), totalDurationMs);

      return totalDurationMs;
    },
    [celebrateEpisodeUnlock, clearScheduledTimeouts, distanceKm, scheduleTimeout, setDistanceKm],
  );

  const syncFromStrava = useCallback(async () => {
    if (syncInProgress) {
      return;
    }

    setSyncInProgress(true);
    setStravaMessage("");
    setStravaMessageIsError(false);

    try {
      const response = await fetch("/api/strava/sync", { cache: "no-store" });
      const data = (await response.json()) as SyncResponse;

      if (!response.ok) {
        if (response.status === 401) {
          setConnectionState("idle");
        }

        setStravaMessage(data.error ?? "Sync failed");
        setStravaMessageIsError(true);
        setSyncInProgress(false);
        return;
      }

      setConnectionState("connected");

      const distanceFromStrava = data.distanceKm ?? 0;
      const sequenceDurationMs = runUnlockSequence(distanceFromStrava);

      setStravaMessage(
        data.activityCount
          ? `${data.activityCount} activities · ${distanceFromStrava.toFixed(1)} km`
          : "No runs found in the last 30 days",
      );
      setStravaMessageIsError(false);
      scheduleTimeout(() => setSyncInProgress(false), sequenceDurationMs);
    } catch {
      setStravaMessage("Network error — is the dev server still running?");
      setStravaMessageIsError(true);
      setSyncInProgress(false);
    }
  }, [runUnlockSequence, scheduleTimeout, syncInProgress]);

  const resetProgress = useCallback(() => {
    clearScheduledTimeouts();
    setCelebratingEpisodeIds([]);
    setSyncInProgress(false);
    reset();
  }, [clearScheduledTimeouts, reset]);

  const openEpisode = useCallback(
    (index: number) => {
      const episode = EPISODES[index];
      if (!episode || !isEpisodeUnlocked(distanceKm, episode)) {
        return;
      }

      setActiveIndex(index);
      setScreen("player");
    },
    [distanceKm],
  );

  const showGate = useCallback((message: string) => {
    setGateMessage(message);
    window.setTimeout(() => setGateMessage(""), 1400);
  }, []);

  const movePlayer = useCallback(
    (direction: 1 | -1) => {
      const nextIndex = clampedActiveIndex + direction;

      if (nextIndex >= EPISODES.length) {
        showGate("Season 2 - 3.0 km to go");
        return;
      }

      if (nextIndex < 0) {
        return;
      }

      const nextEpisode = EPISODES[nextIndex];
      if (!isEpisodeUnlocked(distanceKm, nextEpisode)) {
        showGate(`Locked - ${getLockedDistance(distanceKm, nextEpisode.thresholdKm).toFixed(1)} km to go`);
        return;
      }

      setActiveIndex(nextIndex);
    },
    [clampedActiveIndex, distanceKm, showGate],
  );

  // On load: surface the result of the OAuth redirect, then ask the server
  // whether a Strava session cookie is already in place.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const outcome = params.get("strava");

    if (outcome === "connected") {
      setStravaMessage("Strava linked - press Sync");
      setStravaMessageIsError(false);
    }

    if (outcome === "error") {
      setStravaMessage(params.get("reason") ?? "Could not link Strava");
      setStravaMessageIsError(true);
    }

    if (outcome) {
      window.history.replaceState({}, "", window.location.pathname);
    }

    let cancelled = false;

    fetch("/api/strava/status", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { connected?: boolean }) => {
        if (!cancelled) {
          setConnectionState(data.connected ? "connected" : "idle");
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (screen !== "player") {
        return;
      }

      if (event.key === "ArrowUp") {
        movePlayer(1);
      }

      if (event.key === "ArrowDown") {
        movePlayer(-1);
      }

      if (event.key === "Escape") {
        setScreen("home");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [movePlayer, screen]);

  useEffect(() => () => clearScheduledTimeouts(), [clearScheduledTimeouts]);

  if (!isLoaded) {
    return <main className="pixel-shell min-h-screen" />;
  }

  return (
    <main className="pixel-shell pixel-font min-h-screen overflow-hidden text-[#171312]">
      <AnimatePresence mode="wait">
        {screen === "home" ? (
          <motion.section
            key="home"
            animate={{ opacity: 1 }}
            className="relative mx-auto flex min-h-screen w-full max-w-md flex-col px-4 py-4"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
          >
            <PixelClouds />

            <header className="pixel-panel relative z-10 bg-[#ffe96b] p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="bg-[#171312] px-2 py-1 text-[10px] font-black uppercase text-[#ffe96b]">
                    RunDrama Quest
                  </p>
                  <h1 className="mt-2 text-[28px] font-black leading-none text-[#171312]">
                    Fruit Mystery Run
                  </h1>
                </div>
                <div className="border-4 border-[#171312] bg-white px-3 py-2 text-right">
                  <p className="text-[10px] font-black uppercase text-[#3860d8]">KM</p>
                  <p className="text-2xl font-black">{distanceKm.toFixed(1)}</p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[10px] font-black uppercase">
                <span className="border-2 border-[#171312] bg-[#ff5a3d] px-2 py-1 text-white">World 1</span>
                <span className="border-2 border-[#171312] bg-[#4fc35b] px-2 py-1 text-white">
                  {unlockedCount}/3 Open
                </span>
                <span className="border-2 border-[#171312] bg-[#3860d8] px-2 py-1 text-white">Run Mode</span>
              </div>
            </header>

            <button
              className="pixel-button relative z-10 mt-5 flex h-16 w-full items-center justify-center gap-2 bg-[#ff5a3d] px-4 text-xl font-black uppercase text-white"
              onClick={addOneKm}
              type="button"
            >
              <Plus className="h-5 w-5" />
              Run +1 KM
            </button>

            <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
              <button
                className="pixel-button flex h-12 items-center justify-center gap-2 bg-[#3860d8] px-3 text-xs font-black uppercase text-white disabled:opacity-75"
                disabled={syncInProgress}
                onClick={syncFromStrava}
                type="button"
              >
                <RefreshCw className={`h-4 w-4 ${syncInProgress ? "animate-spin" : ""}`} />
                {syncInProgress ? "Syncing..." : "Sync Strava"}
              </button>
              <button
                aria-label="Reset progress"
                className="pixel-button flex h-12 w-12 items-center justify-center bg-white text-[#171312]"
                onClick={resetProgress}
                type="button"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>

            <button
              className="pixel-button mt-3 flex h-11 items-center justify-center gap-2 bg-[#4fc35b] px-3 text-xs font-black uppercase text-white disabled:opacity-80"
              disabled={connectionState !== "idle"}
              onClick={connectStrava}
              type="button"
            >
              {connectionState === "connecting" ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : connectionState === "connected" ? (
                <Check className="h-4 w-4" />
              ) : (
                <Wifi className="h-4 w-4" />
              )}
              {connectionState === "connecting"
                ? "Connecting..."
                : connectionState === "connected"
                  ? "Linked ✓"
                  : "Link Strava"}
            </button>

            {stravaMessage ? (
              <p
                className={`pixel-panel mt-2 px-3 py-2 text-[10px] font-black uppercase leading-snug ${
                  stravaMessageIsError ? "bg-[#ff5a3d] text-white" : "bg-white text-[#171312]"
                }`}
              >
                {stravaMessage}
              </p>
            ) : null}

            <section className="pixel-panel pixel-grid relative z-10 mt-5 min-h-[530px] flex-1 overflow-hidden bg-[#8ee7ff]">
              <TreasurePath celebratingEpisodeIds={celebratingEpisodeIds} distanceKm={distanceKm} />
              <div className="pixel-ground absolute inset-x-0 bottom-0 h-16 border-t-4 border-[#171312]" />
              <div className="absolute inset-x-4 bottom-5 h-[206px] snap-y snap-mandatory overflow-y-auto pr-1 [scrollbar-width:thin]">
                <div className="grid gap-2 pb-1">
                {EPISODES.map((episode, index) => {
                  const unlocked = isEpisodeUnlocked(distanceKm, episode);
                  const isCelebrating = celebratingEpisodeIds.includes(episode.id);
                  return (
                    <motion.button
                      animate={{
                        boxShadow: isCelebrating
                          ? "0 14px 32px rgba(31, 107, 85, 0.28)"
                          : "0 1px 2px rgba(33, 31, 26, 0.08)",
                        scale: isCelebrating ? 1.025 : 1,
                      }}
                      className={`grid min-h-[92px] snap-start grid-cols-[46px_1fr_auto] items-center gap-3 border-4 border-[#171312] p-3 text-left transition disabled:cursor-not-allowed ${
                        unlocked ? "bg-[#fff7c2]" : "bg-[#b7b0a3] opacity-90"
                      }`}
                      disabled={!unlocked}
                      key={episode.id}
                      onClick={() => openEpisode(index)}
                      transition={{ duration: 0.28 }}
                      type="button"
                    >
                      <span
                        className={`flex h-11 w-11 items-center justify-center border-4 border-[#171312] ${
                          unlocked ? "bg-[#4fc35b] text-white" : "bg-[#6a6259] text-white"
                        }`}
                      >
                        {unlocked ? <Play className="h-5 w-5 fill-current" /> : <Lock className="h-5 w-5" />}
                      </span>
                      <span>
                        <span className="block text-sm font-black uppercase">Stage {episode.id}</span>
                        <span className="block text-xs font-black text-[#171312]">Ep.{episode.id} {episode.title}</span>
                        <span className="mt-1 block text-[10px] font-bold text-[#60452f]">
                          {unlocked
                            ? episode.subtitle
                            : `${getLockedDistance(distanceKm, episode.thresholdKm).toFixed(1)} km to go`}
                        </span>
                      </span>
                      <span className="border-2 border-[#171312] bg-white px-2 py-1 text-[10px] font-black text-[#3860d8]">
                        {episode.thresholdKm.toFixed(1)}
                      </span>
                    </motion.button>
                  );
                })}

                <div className="grid min-h-[92px] snap-start grid-cols-[46px_1fr_auto] items-center gap-3 border-4 border-dashed border-[#171312] bg-[#ffd1dc] p-3">
                  <span className="flex h-11 w-11 items-center justify-center border-4 border-[#171312] bg-[#6a6259] text-white">
                    <Lock className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block text-sm font-black uppercase">Boss Gate</span>
                    <span className="block text-xs font-black">Ep.4 Season 2</span>
                    <span className="mt-1 block text-[10px] font-bold text-[#60452f]">Season 2 · 3.0 km to go</span>
                  </span>
                  <span className="border-2 border-[#171312] bg-white px-2 py-1 text-[10px] font-black text-[#3860d8]">
                    {SEASON_TWO_THRESHOLD_KM.toFixed(1)} km
                  </span>
                </div>
                </div>
              </div>
            </section>
          </motion.section>
        ) : (
          <Player
            activeIndex={clampedActiveIndex}
            distanceKm={distanceKm}
            gateMessage={gateMessage}
            movePlayer={movePlayer}
            onClose={() => setScreen("home")}
          />
        )}
      </AnimatePresence>
    </main>
  );
}

function PixelClouds() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute left-5 top-24 h-6 w-20 bg-white shadow-[12px_0_0_#fff,24px_0_0_#fff,12px_-12px_0_#fff]" />
      <div className="absolute right-8 top-36 h-5 w-16 bg-white/95 shadow-[10px_0_0_rgba(255,255,255,0.95),20px_0_0_rgba(255,255,255,0.95),10px_-10px_0_rgba(255,255,255,0.95)]" />
      <div className="absolute bottom-32 left-0 h-16 w-24 bg-[#5cbf49] shadow-[24px_-16px_0_#4aa73f,64px_0_0_#3f9337]" />
      <div className="absolute bottom-32 right-[-20px] h-20 w-28 bg-[#53b946] shadow-[-36px_16px_0_#3f9337]" />
    </div>
  );
}

function TreasurePath({
  celebratingEpisodeIds,
  distanceKm,
}: {
  celebratingEpisodeIds: number[];
  distanceKm: number;
}) {
  const progress = Math.min(distanceKm / SEASON_TWO_THRESHOLD_KM, 1);
  const marker = getPathPosition(progress);

  return (
    <div className="absolute inset-0">
      <div aria-hidden="true" className="absolute left-8 top-10 h-12 w-12 border-4 border-[#171312] bg-[#ffe96b]" />
      <div aria-hidden="true" className="absolute right-9 top-16 h-20 w-12 border-4 border-[#171312] bg-[#58c65b] shadow-[0_12px_0_#338f3d]" />
      <div aria-hidden="true" className="absolute left-6 top-[178px] h-16 w-16 border-4 border-[#171312] bg-[#f47a35] shadow-[20px_20px_0_#b8562f]" />
      <div aria-hidden="true" className="absolute right-8 top-[246px] h-24 w-20 border-4 border-[#171312] bg-[#3860d8] shadow-[-18px_18px_0_#273d99]" />
      <svg aria-hidden="true" className="h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 100">
        <path
          d="M52 8 H34 V24 H63 V41 H42 V58"
          fill="none"
          stroke="#171312"
          strokeLinecap="square"
          strokeWidth="5"
        />
        <path
          d="M52 8 H34 V24 H63 V41 H42 V58"
          fill="none"
          pathLength="1"
          stroke="#ff5a3d"
          strokeDasharray={`${progress} ${1 - progress}`}
          strokeLinecap="square"
          strokeWidth="3"
        />
        {PATH_POINTS.slice(0, 3).map((point, index) => {
          const episodeId = index + 1;
          const isCelebrating = celebratingEpisodeIds.includes(episodeId);
          const isUnlocked = distanceKm >= index;

          return (
            <motion.circle
              animate={{
                fill: isUnlocked ? "#ffe96b" : "#b7b0a3",
                r: isCelebrating ? 5.5 : 3.8,
              }}
              cx={point.x}
              cy={point.y}
              initial={{ r: 3.8 }}
              key={`${point.x}-${point.y}`}
              r="3.8"
              stroke="#211f1a"
              strokeWidth="1.4"
              transition={{ duration: 0.28 }}
            />
          );
        })}
      </svg>
      <motion.div
        animate={{ left: `${marker.x}%`, top: `${marker.y}%` }}
        className="absolute h-12 w-10 -translate-x-1/2 -translate-y-1/2"
        transition={{ type: "spring", stiffness: 210, damping: 22 }}
      >
        <div className="absolute left-2 top-0 h-3 w-6 bg-[#ff5a3d]" />
        <div className="absolute left-1 top-3 h-6 w-8 border-4 border-[#171312] bg-[#3860d8]" />
        <div className="absolute left-0 top-9 h-3 w-4 bg-[#171312]" />
        <div className="absolute right-0 top-9 h-3 w-4 bg-[#171312]" />
        <div className="absolute left-3 top-4 h-2 w-2 bg-white" />
      </motion.div>
    </div>
  );
}

function getPathPosition(progress: number) {
  if (progress <= 1 / 3) {
    return interpolate(PATH_POINTS[0], PATH_POINTS[1], progress * 3);
  }

  if (progress <= 2 / 3) {
    return interpolate(PATH_POINTS[1], PATH_POINTS[2], (progress - 1 / 3) * 3);
  }

  return interpolate(PATH_POINTS[2], PATH_POINTS[3], (progress - 2 / 3) * 3);
}

function interpolate(
  start: (typeof PATH_POINTS)[number],
  end: (typeof PATH_POINTS)[number],
  amount: number,
) {
  return {
    x: start.x + (end.x - start.x) * amount,
    y: start.y + (end.y - start.y) * amount,
  };
}

function Player({
  activeIndex,
  distanceKm,
  gateMessage,
  movePlayer,
  onClose,
}: {
  activeIndex: number;
  distanceKm: number;
  gateMessage: string;
  movePlayer: (direction: 1 | -1) => void;
  onClose: () => void;
}) {
  const dragY = useMotionValue(0);
  const activeEpisode = EPISODES[activeIndex];

  return (
    <motion.section
      key="player"
      animate={{ opacity: 1 }}
      className="pixel-font flex min-h-screen items-center justify-center bg-[#1a1f38] px-4 py-5 text-white"
      exit={{ opacity: 0 }}
      initial={{ opacity: 0 }}
    >
      <div className="pixel-panel crt-scanlines relative aspect-[9/16] h-[min(100dvh-40px,760px)] max-h-[760px] w-full max-w-[430px] overflow-hidden bg-black">
        <AnimatePresence mode="popLayout">
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="absolute inset-0"
            drag="y"
            dragConstraints={{ bottom: 0, top: 0 }}
            dragElastic={0.2}
            exit={{ opacity: 0, y: -40 }}
            initial={{ opacity: 0, y: 40 }}
            key={activeEpisode.id}
            onDragEnd={(_, info) => {
              if (info.offset.y < -70) {
                movePlayer(1);
              }

              if (info.offset.y > 70) {
                movePlayer(-1);
              }
            }}
            style={{ y: dragY }}
            transition={{ duration: 0.22 }}
          >
            <video
              autoPlay
              className="h-full w-full object-cover"
              controls
              loop
              muted
              playsInline
              preload="none"
              src={activeEpisode.videoSrc}
            />
          </motion.div>
        </AnimatePresence>

        <div className="pointer-events-none absolute inset-x-0 top-0 bg-[#171312]/90 p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="inline-block border-2 border-white bg-[#3860d8] px-2 py-1 text-[10px] font-black uppercase text-white">
                {distanceKm.toFixed(1)} KM
              </p>
              <h2 className="mt-2 text-lg font-black uppercase leading-tight">
                Stage {activeEpisode.id}: {activeEpisode.title}
              </h2>
            </div>
            <button
              className="pixel-button pointer-events-auto bg-[#ffe96b] px-3 py-2 text-xs font-black uppercase text-[#171312]"
              onClick={onClose}
              type="button"
            >
              Close
            </button>
          </div>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-[#171312]/90 p-3">
          <div className="flex items-center justify-between text-[10px] font-black uppercase text-white">
            <span className="flex items-center gap-1 border-2 border-white px-2 py-1">
              <ChevronDown className="h-4 w-4" /> Prev
            </span>
            <span className="flex items-center gap-1 border-2 border-white bg-[#ff5a3d] px-2 py-1">
              Swipe <ChevronUp className="h-4 w-4" />
            </span>
          </div>
        </div>

        <AnimatePresence>
          {gateMessage ? (
            <motion.div
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="pixel-panel absolute left-1/2 top-1/2 w-[78%] -translate-x-1/2 -translate-y-1/2 bg-[#ffe96b] px-4 py-4 text-center text-sm font-black uppercase text-[#171312]"
              exit={{ opacity: 0, scale: 0.96, y: 14 }}
              initial={{ opacity: 0, scale: 0.96, y: 14 }}
            >
              <Lock className="mx-auto mb-2 h-5 w-5 text-[#ff5a3d]" />
              {gateMessage}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </motion.section>
  );
}
