# 一键出发 Design Tokens

`tokens.json` 是 Web 与微信小程序共享的品牌色契约。语义名称保持稳定，运行时映射分别位于：

- Web：`src/app/globals.css`
- 微信小程序：`apps/miniprogram/src/app.scss`

修改颜色时先更新 `tokens.json`，再同步两个运行时映射，并运行 `pnpm test:brand-theme`。当前品牌 Icon 尚未定稿；Web 统一入口为 `BrandIcon`，小程序统一入口为 `Brand`，不得在页面中新增独立品牌图路径。

字体只使用设备上的现代系统无衬线字体，不提交或远程加载中文字体文件。
