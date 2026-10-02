# 发布 · 2026-10-02

- 正式地址：https://fallwell.xiaosang.cc/，绑定待完成，不能作为已上线地址。
- 临时访问：https://fallwell.holy-nova.workers.dev/。
- Worker：fallwell；项目唯一源码分支 main。
- v0.1.3 已恢复根路径构建，移除 /fallwell/ 路径适配 Worker。
- 误配的主域名两条路由已删除并回读验证。
- Custom Domains 达到 100 个配额上限；同址 Worker Route 需要 DNS 写入权限，当前控制台待登录。
- 发布配置 wrangler.jsonc 保留正式子域名目标；独立修复既有 Worker 时使用从此配置生成的临时无域名绑定配置，不改变正式地址。
- 根路径修复已从 main 应用提交 e7069f64fc1f5a7a299fa220de65658f1842fb11 手动部署，线上 v0.1.3。
- Cloudflare version：ccafd3fa-d878-46a5-baab-f0f81030f4ec。
- Cloudflare deployment：015e36e4-c2d6-445a-bd98-774fb65a54a7。
- 临时地址的 23 个生产文件均返回 HTTP 200，SHA-256 与本地 dist 完全一致。
- 线上角色选择、移动、开火、Esc 暂停/继续、音量及五种窗口尺寸通过；页面错误为 0。
- 错误主域名路由再次回读确认为空，正式子域名仍没有绑定；完整检查状态见 PUBLISHING_STATUS.md。

## 2026-10-01 窗口适配与开局界面

- 整个游戏舞台按浏览器窗口宽高等比例缩放，调整窗口后实时更新，包含 HUD 和所有弹窗。
- 开局移除两侧说明、装备列表和版本信息；保留角色选择、开始、音量及一行操作提示。
- 装备详情与个人纪录移入暂停菜单。
- 验证：33 项游戏逻辑测试通过；10 种窗口尺寸下共 100 次界面边界检查通过，覆盖开局、游戏、暂停、核心、遗物、替换、商店、进化和结算。
- 线上全部 23 个构建文件返回 HTTP 200，内容哈希与本地 dist 一致。检查记录见 work/layout/report.json 和 work/layout/release-check.json。
- 线上浏览器验证：角色选择、移动、开火、ESC 暂停、继续、音量开关及窗口调整均通过，页面错误为 0；记录见 work/layout/live-report.json。
