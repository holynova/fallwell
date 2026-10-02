# 已发布项目检查补齐 · 2026-10-02

## 已完成并验证

- GitHub：https://github.com/holynova/fallwell；公开仓库，唯一主分支 main。
- 应用源码提交：8a0d25bf537a12a171d1f69654cb5d3d90175e54；应用版本 v0.1.1。
- 复用既有 Cloudflare Worker：fallwell，账户 ef7863c4de93e71c3496f940c8ab4865。
- 已上线并验证：https://fallwell.holy-nova.workers.dev/。
- Cloudflare deployment：58945126-0572-4fe4-a293-63e594bfd9ca。
- Cloudflare version：eae7c91d-b0b2-46a1-8c8b-7a6687739e1c。
- 页面增加可见 v0.1.1、GitHub 源码入口和统一 Umami 脚本。
- README 双语正文通过校验；截图为 960×900 的生产预览实机画面。
- 二维码已独立解码确认指向 https://fallwell.xiaosang.cc/，该地址尚不可用。
- 33 项游戏测试、生产构建、Wrangler dry-run 与版本校验通过。
- 23 个线上产物均为 HTTP 200，哈希与本地 dist 一致。

## 阻塞与待完成

- fallwell.xiaosang.cc 未创建：Cloudflare 错误 100122，xiaosang.cc 已达到每个 zone 100 个 Workers Custom Domains 的上限；API 回读确认数量为 100。
- 同址 Worker Route 需要代理 DNS 记录；当前 OAuth 无法管理 DNS，DNS Records API 返回 403。
- 正式 Demo 地址等待选择：xiaosang.cc/fallwell/；等待子域名配额；或明确授权把现有 workers.dev 地址作为作品集例外。
- GitHub Homepage 尚未设置，README 中子域名标记为待验证。
- 作品集 master 的 FALLWELL 条目与截图已准备，但尚未提交、推送或重新部署；线上仍为 90 个条目。
- GitHub Profile main 的 FALLWELL 行与截图已准备，但尚未提交、推送。

准备工作区：
- 作品集：/Users/sym/Documents/Codex/2026-09-30/ga/work/publish-20261002/portfolio
- Profile：/Users/sym/Documents/Codex/2026-09-30/ga/work/publish-20261002/profile

## 继续发布

确认正式地址后，按所选地址调整 Wrangler/链接/二维码，验证项目 HTTPS 与核心功能；设置 GitHub Homepage；提交作品集 master，并单独手动部署 xiaosang-portfolio，再回读 repos.json 与卡片；提交 Profile main 并验证。

仅更新 README、截图或发布记录时不重新部署游戏。没有新增 Cloudflare 自动部署工作流或发布分支；原作品集及 Profile checkout 的修改均被保留。
