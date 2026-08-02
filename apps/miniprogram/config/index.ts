import { defineConfig } from "@tarojs/cli";

export default defineConfig({
  projectName: "一键出发",
  date: "2026-08-02",
  designWidth: 750,
  deviceRatio: { 750: 1 },
  sourceRoot: "src",
  outputRoot: "dist",
  framework: "react",
  compiler: "webpack5",
  mini: { postcss: { pxtransform: { enable: true }, cssModules: { enable: false } } },
});
