export default defineAppConfig({
  pages: ["pages/start/index", "pages/trips/index", "pages/account/index"],
  subPackages: [
    { root: "packageTrip", pages: ["detail/index", "shared/index", "generating/index", "edit/index"] },
    { root: "packagePoster", pages: ["examples/index", "confirm/index", "progress/index", "viewer/index"] },
    { root: "packageAccount", pages: ["points/index", "settings/index", "bind-email/index", "legal/index"] },
  ],
  window: { navigationStyle: "custom", backgroundColor: "#f8f6ef", backgroundTextStyle: "light" },
  tabBar: {
    color: "#718078", selectedColor: "#1f6248", backgroundColor: "#fffdf7", borderStyle: "white",
    list: [
      { pagePath: "pages/start/index", text: "出发" },
      { pagePath: "pages/trips/index", text: "行程" },
      { pagePath: "pages/account/index", text: "我的" },
    ],
  },
  lazyCodeLoading: "requiredComponents",
});
