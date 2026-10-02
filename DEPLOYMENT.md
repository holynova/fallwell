# 发布 · 2026-10-02

- 正式地址：https://fallwell.xiaosang.cc/，HTTPS 与游戏操作已验证。
- 应用版本：v0.1.3；唯一源码分支 main；路由配置提交 bc06bc1。
- Worker：fallwell；Route：fallwell.xiaosang.cc/*。
- DNS：通过 cf 创建代理 A 记录，id 79930fd693f3525ae11ccc20221d6459，192.0.2.1 为占位地址；请求直接由 Worker 静态资产处理。
- Route id：5aedbaca194f4fd9b5aa686cbf5cfd30，失败时关闭回源。
- Cloudflare version：6f1b4ba2-ead3-4b08-84e7-6fc26ea6a057。
- Cloudflare deployment：6d96c7b2-1cbb-4cc9-9e86-874f39ca0aec。
- 本次只更新域名路由，复用已验证的 v0.1.3 静态产物，游戏代码未改动。
- DNS 与路由分别使用已授权 cf 和锁定版本 Wrangler；后续运行 npm run deploy 保留此精确子域名路由。
- 不新增 Workers Custom Domain，配额数量仍为 100，其他项目绑定未改变。
- 错误的主域名 /fallwell 路由已撤销。
- 23 个正式域名资源返回 200；JS/CSS/图片哈希匹配，HTML 去除 Cloudflare 既有统计脚本后主体匹配。
- 角色选择、移动、开火、暂停/继续、音量和五种窗口尺寸测试通过，页面错误为 0。

## 2026-10-01 窗口适配与开局界面

- 整个游戏舞台按浏览器窗口宽高等比例缩放，调整窗口后实时更新，包含 HUD 和所有弹窗。
- 开局移除两侧说明、装备列表和版本信息；保留角色选择、开始、音量及一行操作提示。
- 装备详情与个人纪录移入暂停菜单。
- 验证：33 项游戏逻辑测试通过；10 种窗口尺寸下共 100 次界面边界检查通过，覆盖开局、游戏、暂停、核心、遗物、替换、商店、进化和结算。
- 线上全部 23 个构建文件返回 HTTP 200，内容哈希与本地 dist 一致。检查记录见 work/layout/report.json 和 work/layout/release-check.json。
- 线上浏览器验证：角色选择、移动、开火、ESC 暂停、继续、音量开关及窗口调整均通过，页面错误为 0；记录见 work/layout/live-report.json。
