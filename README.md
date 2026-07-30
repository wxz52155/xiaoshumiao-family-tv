# 小树苗 · 家庭儿童视频中心

家长可控的儿童视频 CMS。支持分类管理、B站视频与 UP 主同步、夸克/百度网盘分享链接，并向 OK影视提供 TVBox 配置接口。

## 本地开发

要求 Node.js 22.13 或更高版本。

```bash
npm install
npm run dev
```

本地后台：`http://localhost:3000`

## Cloudflare Workers 部署

项目使用 Cloudflare Workers、Workers Static Assets 和 D1。

### GitHub 自动部署设置

在 Cloudflare Workers & Pages 中导入仓库：

- Repository：`wxz52155/xiaoshumiao-family-tv`
- Production branch：`main`
- Root directory：留空
- Build command：`npm run build`
- Deploy command：`npx wrangler deploy`
- Node.js version：22

`wrangler.jsonc` 已绑定以下 D1 数据库：

- Binding：`DB`
- Database：`xiaoshumiao-family-tv-db`

首次部署后应用数据库迁移：

```bash
npx wrangler d1 migrations apply xiaoshumiao-family-tv-db --remote
```

在 Worker 的 Settings → Variables and Secrets 中添加：

- `ADMIN_TOKEN`：必填，家长管理口令，类型选 Secret
- `BILI_COOKIE`：选填，B站同步受限时配置

不要对整个 Worker 开启 Cloudflare Access，否则 OK影视无法读取公开接口。

## 接口

- OK影视 / TVBox 配置：`/api/ok`
- MacCMS 数据接口：`/api/vod`
- 分类管理：`/api/categories`
- 内容管理：`/api/videos`

## 常用命令

```bash
npm run build
npm run db:generate
npm run deploy
```
