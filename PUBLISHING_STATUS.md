# 已发布项目检查补齐 · 2026-10-02

## 正式地址已完成

https://fallwell.xiaosang.cc/ 已上线，HTTPS、页面 v0.1.3 与核心操作验证通过。
通过 cf v1.0.0-beta.12 创建唯一目标子域名的代理 A 记录，并用既有 Worker fallwell 的精确 Route 绑定；地址保持子域名根路径 /。
不新增 Workers Custom Domain，100 个绑定配额维持原数，其他项目域名未改动。
旧 xiaosang.cc/fallwell 与 xiaosang.cc/fallwell/* 路由已撤销。

## 项目与材料

- GitHub：https://github.com/holynova/fallwell；唯一源码分支 main；路由配置提交 bc06bc1。
- GitHub Homepage、README、二维码、作品集和 Profile Demo 统一为正式子域名。
- 应用 v0.1.3 的既有截图、二维码、Umami 和可见 GitHub 入口已检查复用；本次不修改游戏代码或递增应用版本。
- 既有 33 项游戏逻辑测试通过；路由配置 Wrangler dry-run 通过。
- README 双语正文校验通过；二维码独立解码为 https://fallwell.xiaosang.cc/。
- 23 个正式域名资源返回 HTTP 200，JS/CSS/图片 SHA-256 与 dist 相同；HTML 剔除平台注入的既有 Cloudflare 统计脚本后主体相同。
- 浏览器角色选择、移动、开火、Esc 暂停/继续、音量与五种窗口尺寸通过，页面错误为 0。
- Worker deployment：6d96c7b2-1cbb-4cc9-9e86-874f39ca0aec；version：6f1b4ba2-ead3-4b08-84e7-6fc26ea6a057。
- 详细 DNS、Route 编号与后续部署方式见 DEPLOYMENT.md。

## 作品集与 Profile

- 作品集沿用最新 master，从 detached checkout 只新增 FALLWELL 条目与截图。
- master 提交 b7b11278fdc78142e8a39db0b81f46167f82e2c8 已推送并手动部署至 xiaosang-portfolio。
- 作品集 version：6ad58ef4-5676-4446-87d7-59185b8a5fe0；deployment：181b3972-2354-415f-9c30-2bca72d85aad。
- 线上 https://xiaosang.cc/data/repos.json 与该提交完整结构一致，共 103 个条目，FALLWELL 仅一条；线上截图哈希一致。
- Profile main 提交 298bb1a 已推送；公开 README 与发布内容一致，FALLWELL 仅一行。
- 浏览器作品卡片与截图正常；点击卡片预览打开正式游戏 v0.1.3；Profile 项目行、Demo 链接与预览图均验证通过。

发布工作区：/Users/sym/Documents/Codex/2026-09-30/ga/work/publish-dns-20261002。
没有新增发布分支、Cloudflare 自动部署 workflow 或 Workers Builds 集成。
