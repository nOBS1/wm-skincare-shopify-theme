# VEYMENZ · 葳蔓诗集 — Shopify Theme

**English** | [简体中文](README.zh-CN.md)

A custom, SEO/GEO-focused Shopify Online Store 2.0 theme for the **VEYMENZ (葳蔓诗集)** skincare brand. It combines a quiet, editorial "luxe" look with structured data that search engines and AI answer engines can read.

- **Store:** `0wcfy0-iw.myshopify.com`
- **Live theme:** `wm-skincare-shopify-theme/main`, connected to this repository's `main` branch through Shopify's GitHub integration
- **Theme version:** 1.2.0 (`config/settings_schema.json`)

---

## Features

- **Luxe storefront**: hero banner, brand story, featured products, ritual steps, testimonials, an oversized footer wordmark and scroll-reveal motion (`assets/luxe.css`, `assets/luxe.js`)
- **Product page**: image gallery (`assets/product-gallery.*`) plus benefits, specifications, full INCI, precautions, brand/maker and FAQ blocks, all driven by metafields. Blocks with empty values hide themselves.
- **Structured data**: Product, Organization, BreadcrumbList, FAQPage, BlogPosting and Blog schema (`snippets/schema-*.liquid`, `snippets/seo-meta.liquid`)
- **GEO blog**: key takeaways, table of contents, references, related posts, author bio and tag filtering
- **Performance**: preloaded hero image (LCP), non-blocking fonts, and the hero excluded from animations

## Repository layout

```
assets/      CSS, JS and theme images
config/      settings_schema.json (theme settings) · settings_data.json (store values, auto-generated)
layout/      theme.liquid, password.liquid
locales/     translation strings
sections/    page sections (header, footer, hero-banner, product-template, …)
snippets/    shared partials (SEO meta, schema, overlays, cards)
templates/   OS 2.0 JSON templates
scripts/     Node scripts for product import, pricing and collections (use Shopify CLI auth)
reports/     output of those scripts and QA screenshots
```

Non-theme folders (`scripts/`, `reports/`, `*.md`) are ignored by Shopify and do not affect the storefront.

## Development

Requires [Shopify CLI](https://shopify.dev/docs/api/shopify-cli) 3.x or later.

```bash
# Local preview with hot reload
shopify theme dev --store 0wcfy0-iw.myshopify.com

# Lint
shopify theme check

# Push to an unpublished theme for review first
shopify theme push --store 0wcfy0-iw.myshopify.com --unpublished --theme "Review copy"
```

### Deployment workflow

1. Edit locally and preview with `shopify theme dev`.
2. Push to an **unpublished** theme and check it on the preview link.
3. Commit and push to `main`. Shopify syncs `main` to the live theme automatically.
4. **Pull before you edit.** Changes made in the theme editor are committed back to `main` as "Update from Shopify" commits, so run `git pull` first.

> `config/settings_data.json` and `templates/*.json` are rewritten by the theme editor. Change content there in the editor, not by hand.

## Content setup guides

| Document | Purpose |
|---|---|
| [GEO-SETUP.md](GEO-SETUP.md) | Product page metafield definitions and sample values |
| [GEO-BLOG.md](GEO-BLOG.md) | Blog post metafields for GEO blocks |
| [Metafield填写指南.md](Metafield填写指南.md) | Step-by-step metafield SOP for the team (Chinese) |

## Logo

The header and footer both use **Theme settings → Logo** (`settings.logo`), and its width comes from **Logo width**. For a sharp result on high-DPI screens, upload an SVG or a PNG at least 1000 px wide.
