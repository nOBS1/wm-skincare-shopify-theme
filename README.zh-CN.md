# VEYMENZ · 葳蔓诗集 — Shopify 主题

[English](README.md) | **简体中文**

为护肤品牌 **VEYMENZ（葳蔓诗集）** 定制的 Shopify Online Store 2.0 主题，重点做 SEO / GEO。视觉上是安静、偏杂志感的「轻奢」风格，同时输出搜索引擎和 AI 问答引擎都能读懂的结构化数据。

- **店铺：** `0wcfy0-iw.myshopify.com`
- **线上主题：** `wm-skincare-shopify-theme/main`，通过 Shopify GitHub 集成与本仓库 `main` 分支同步
- **主题版本：** 1.2.0（见 `config/settings_schema.json`）

---

## 功能

- **轻奢店面**：首屏大图、品牌故事、精选产品、护肤步骤、用户评价、页脚大号品牌标识、滚动渐显动效（`assets/luxe.css`、`assets/luxe.js`）
- **产品页**：图片画廊（`assets/product-gallery.*`），以及卖点、规格、完整成分表（INCI）、注意事项、品牌/生产商、FAQ 等区块。这些区块都由 metafield 驱动，没填值的区块会自动隐藏。
- **结构化数据**：Product、Organization、BreadcrumbList、FAQPage、BlogPosting、Blog Schema（`snippets/schema-*.liquid`、`snippets/seo-meta.liquid`）
- **GEO 博客**：要点摘要、目录、参考来源、相关文章、作者简介、标签筛选
- **性能**：预加载首屏图（LCP）、字体不阻塞渲染、首屏不参与动画

## 目录结构

```
assets/      CSS、JS 和主题图片
config/      settings_schema.json（主题设置）· settings_data.json（店铺取值，自动生成）
layout/      theme.liquid、password.liquid
locales/     多语言文案
sections/    页面区块（header、footer、hero-banner、product-template 等）
snippets/    公共片段（SEO meta、Schema、浮层、卡片）
templates/   OS 2.0 JSON 模板
scripts/     产品导入、定价、分类的 Node 脚本（使用 Shopify CLI 登录凭据）
reports/     上述脚本的输出和验收截图
```

非主题目录（`scripts/`、`reports/`、`*.md`）会被 Shopify 忽略，不影响店面。

## 本地开发

需要安装 [Shopify CLI](https://shopify.dev/docs/api/shopify-cli) 3.x 或更高版本。

```bash
# 本地预览（热更新）
shopify theme dev --store 0wcfy0-iw.myshopify.com

# 代码检查
shopify theme check

# 先推到未发布主题审核
shopify theme push --store 0wcfy0-iw.myshopify.com --unpublished --theme "Review copy"
```

### 发布流程

1. 本地修改，用 `shopify theme dev` 预览。
2. 推到**未发布**主题，用预览链接检查。
3. 提交并推送到 `main`，Shopify 会自动把 `main` 同步到线上主题。
4. **修改前先拉取。** 在主题编辑器里做的修改会以 "Update from Shopify" 提交回写到 `main`，所以先执行 `git pull`。

> `config/settings_data.json` 和 `templates/*.json` 会被主题编辑器改写。这些内容请在编辑器里改，不要手动编辑。

## 内容配置文档

| 文档 | 用途 |
|---|---|
| [GEO-SETUP.md](GEO-SETUP.md) | 产品页 metafield 定义和示例取值 |
| [GEO-BLOG.md](GEO-BLOG.md) | 博客文章的 GEO 区块 metafield |
| [Metafield填写指南.md](Metafield填写指南.md) | 团队用的 metafield 操作 SOP |

## Logo

页头和页脚都读取 **主题设置 → Logo**（`settings.logo`），宽度由 **Logo width** 控制。想在高清屏上显示清晰，请上传 SVG，或宽度至少 1000 px 的 PNG。
