# 已发布项目检查补齐 · 2026-10-02

## 正式地址

唯一正式目标为 https://fallwell.xiaosang.cc/，游戏运行在根路径 /。
2026-10-02 已撤销误配的 xiaosang.cc/fallwell 与 xiaosang.cc/fallwell/* 两条路由，API 回读确认删除；其他项目绑定未改动。
Wrangler 配置、README、二维码、待发布作品集及 Profile 材料统一使用正式子域名，不再采用主域名子路径。

## 当前阻碍

- Cloudflare API 回读：xiaosang.cc 的 Workers Custom Domains 数量为 100，fallwell 无绑定；新增绑定被错误 100122 拒绝。
- 公共 DNS over HTTPS 查询正式子域名返回 NXDOMAIN；系统 DNS 的代理 fake IP 不作为上线证据。
- 同一子域名的 Worker Route 方案需要代理 DNS 记录；当前 Wrangler OAuth 的 DNS Records API 返回 403，无 DNS 写入权限。
- Cloudflare 浏览器控制台未登录，正在等待用户完成登录，以继续配置同一正式子域名。
- 正式地址尚未验证，GitHub Homepage 与作品集/Profile 发布保持待完成；不发布故障 Demo。

## 已准备与独立完成项

- GitHub：https://github.com/holynova/fallwell；公开仓库，唯一主分支 main。
- 根路径修复版本 v0.1.3；保留可见版本、GitHub 源码入口与统一 Umami。
- 33 项游戏逻辑测试、生产构建、Wrangler dry-run 和版本校验通过。
- README 双语说明及截图文件检查通过，二维码独立解码确认为 https://fallwell.xiaosang.cc/。
- 正式发布技能已增加强制子域名与根路径约束；额度、权限或 TLS 阻碍不得擅自改变正式地址，“继续”不代表同意换地址。
- 既有 workers.dev 仅作为临时访问与修复验证地址，不替代正式 Demo：https://fallwell.holy-nova.workers.dev/。

## 待发布材料

- 作品集：/Users/sym/Documents/Codex/2026-09-30/ga/work/publish-20261002/portfolio，唯一数据源 master。
- Profile：/Users/sym/Documents/Codex/2026-09-30/ga/work/publish-20261002/profile，main。

正式子域名 HTTPS 与核心功能验证通过后，再设置 GitHub Homepage、提交推送作品集并独立手动部署 xiaosang-portfolio、回读 JSON 与卡片，然后发布 Profile。
最终部署编号与线上验证结果记录在 DEPLOYMENT.md。
