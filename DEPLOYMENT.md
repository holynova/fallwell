# 最新发布状态 · 2026-10-02

- 应用 v0.1.1 已从 main 提交 8a0d25bf537a12a171d1f69654cb5d3d90175e54 手动发布到既有 Worker fallwell。
- 可用地址：https://fallwell.holy-nova.workers.dev/。
- Version ID：eae7c91d-b0b2-46a1-8c8b-7a6687739e1c。
- Deployment ID：58945126-0572-4fe4-a293-63e594bfd9ca。
- 自定义域名绑定因 xiaosang.cc 达到 100 个配额上限失败（100122）；当前 route 配置保留为待完成目标，重跑部署仍会在域名绑定步骤报错。
- 正式地址及作品集发布待确定，完整状态见 PUBLISHING_STATUS.md。

---

# 发布

- 公网地址：https://fallwell.holy-nova.workers.dev
- Cloudflare Worker：fallwell
- 版本：eb26b0dd-6c48-4a67-a90e-7a08973f9b2d
- 发布日期：2026-10-01
- 发布内容：Vite 生产构建目录 dist，静态资源托管，无后端服务。

后续更新：运行 `npm test`，然后 `npm run deploy`。发布配置在 wrangler.jsonc，Wrangler 使用本机已有登录。

## 2026-10-01 窗口适配与开局界面

- 整个游戏舞台按浏览器窗口宽高等比例缩放，调整窗口后实时更新，包含 HUD 和所有弹窗。
- 开局移除两侧说明、装备列表和版本信息；保留角色选择、开始、音量及一行操作提示。
- 装备详情与个人纪录移入暂停菜单。
- 验证：33 项游戏逻辑测试通过；10 种窗口尺寸下共 100 次界面边界检查通过，覆盖开局、游戏、暂停、核心、遗物、替换、商店、进化和结算。
- 线上全部 23 个构建文件返回 HTTP 200，内容哈希与本地 dist 一致。检查记录见 work/layout/report.json 和 work/layout/release-check.json。
- 线上浏览器验证：角色选择、移动、开火、ESC 暂停、继续、音量开关及窗口调整均通过，页面错误为 0；记录见 work/layout/live-report.json。
