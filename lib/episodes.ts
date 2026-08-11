export type Episode = {
  id: number;
  title: string;
  subtitle: string;
  thresholdKm: number;
  videoSrc: string;
};

export const EPISODE_THRESHOLDS_KM = [0, 1, 2] as const;

export const EPISODES: Episode[] = [
  {
    id: 1,
    title: "The Morning After",
    subtitle: "Mango sends Durian to work, unaware.",
    thresholdKm: EPISODE_THRESHOLDS_KM[0],
    videoSrc: "/videos/ep1.mp4",
  },
  {
    id: 2,
    title: "Waiting Past Midnight",
    subtitle: "One more kilometer unlocks the long night.",
    thresholdKm: EPISODE_THRESHOLDS_KM[1],
    videoSrc: "/videos/ep2.mp4",
  },
  {
    id: 3,
    title: "Start Now",
    subtitle: "The final clue hides behind a phone call.",
    thresholdKm: EPISODE_THRESHOLDS_KM[2],
    videoSrc: "/videos/ep3.mp4",
  },
];

export const SEASON_TWO_THRESHOLD_KM = 3;

export function getLockedDistance(distanceKm: number, thresholdKm: number) {
  return Math.max(0, thresholdKm - distanceKm);
}

export function isEpisodeUnlocked(distanceKm: number, episode: Episode) {
  return distanceKm >= episode.thresholdKm;
}
