export type PosterExample = {
  id: string;
  title: string;
  subtitle: string;
  days: number;
  destination: string;
  thumbnailAsset: string;
  fullAsset: string;
  sortOrder: number;
  enabled: boolean;
  createdAt: string;
};

/** Only manually reviewed, non-user assets may be listed here. */
export const posterExamples: PosterExample[] = [
  {
    id: "shaoxing-two-day",
    title: "绍兴两天慢游",
    subtitle: "2天双栏",
    days: 2,
    destination: "绍兴",
    thumbnailAsset: "/examples/shaoxing-travel-poster-example.jpg",
    fullAsset: "/examples/shaoxing-travel-poster-example.jpg",
    sortOrder: 10,
    enabled: true,
    createdAt: "2026-07-18",
  },
].filter((item) => item.enabled).sort((a, b) => a.sortOrder - b.sortOrder);
