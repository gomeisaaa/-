# V3 验证

无构建步骤。先在项目根目录启动：`python -m http.server 4173`。

逻辑检查：

- `node tests/support.mjs`（旧版支持回归）
- `node tests/v3-foundation.mjs`（PHQ计分/安全/旧数据保护）
- `node tests/v3-cycles.mjs`（周期与日期）

浏览器检查依赖Playwright和Chromium。已在当前环境运行，命令示例：

```sh
PLAYWRIGHT_MODULE=/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright node tests/browser-phq.cjs
PLAYWRIGHT_MODULE=/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright node tests/browser-events.cjs
PLAYWRIGHT_MODULE=/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright node tests/browser-photos.cjs
PLAYWRIGHT_MODULE=/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright node tests/browser-integration.cjs
PLAYWRIGHT_MODULE=/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright node tests/browser-legacy.cjs
```

浏览器路径默认`/usr/bin/chromium`；其他环境需要按其安装位置调整。默认服务地址为127.0.0.1:4173，仅用于内部测试，不是用户预览链接。每个脚本使用全新浏览器上下文，不读取真实用户数据，截图只包含合成测试记录。必须从项目根目录运行；截图输出到docs/screenshots。

集成脚本检测WebKit二进制，缺失报告UNRUN；这不是iPhone或Android实机验收。照片输入初版支持JPEG/PNG/WebP，不支持HEIC。用户主动生成的文字导出不含照片。自动化覆盖不等于临床验证。

生理周期横轴新增验收：`PLAYWRIGHT_MODULE=/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright node tests/browser-cycle-axis.cjs`。检查三阶段参考、实际出血独立带、进行中完整参考周期、未知回退、比较、手机独立滚动及真实日期回看。截图使用合成记录。
