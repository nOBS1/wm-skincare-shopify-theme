# GEO 博客落地清单（数据轨）

> 和产品页一样的双轨制：**代码轨已完成**（`sections/article-template.liquid` +
> `sections/blog-template.liquid` + `snippets/article-card.liquid` + `snippets/seo-meta.liquid`）——
> 文章页已内建 BlogPosting/FAQPage Schema、Key Takeaways、目录（TOC）、参考来源、
> 相关文章、上一篇/下一篇、作者简介、评论区；列表页内建 Blog Schema、标签筛选、分页。
>
> 这些区块同样 **metafield 驱动、空值自动隐藏**。不建/不填 metafield，文章照常显示，
> 只是少了 GEO 增强区块。命名空间沿用 `custom`，FAQ 的 JSON 格式和产品页**完全一致**。

---

## Step 1 — 创建 Blog post metafield 定义（全店一次性）

后台路径：**Settings → Custom data → Blog posts → Add definition**。
直达：`https://admin.shopify.com/store/0wcfy0-iw/settings/custom_data/article`

| 名称 | Namespace and key | 类型 (Type) | 说明 |
|---|---|---|---|
| FAQs | `custom.faqs` | **JSON** | 文章问答，同时生成 FAQPage Schema（格式同产品页） |
| Key takeaways | `custom.key_takeaways` | Multi-line text | 文章开头的「要点速览」，**一行一条** |
| Sources | `custom.sources` | **JSON** | 参考来源/引用文献，提升 AI 引擎信任分 |

> ⚠️ 和产品页同样的坑：`faqs`、`sources` 必须选 **JSON** 类型；
> Namespace and key 一个字符都不能差；Storefronts access 保持可见。

---

## Step 2 — 每篇文章填值（示例直接改）

进入 **Online Store → Blog posts → 某篇文章**，底部 Metafields 区填写。

### `custom.key_takeaways`（Multi-line text，一行一条）
```
Exosomes are nanometer-sized messengers that signal skin cells to repair and renew
Consistency matters more than quantity — twice daily application shows results in 2–4 weeks
Always patch test first; not recommended during pregnancy or nursing
```
> 这个区块是 GEO 的核心抓手：AI 引擎（ChatGPT / Perplexity / Google AI Overview）
> 优先引用**开头即答案**的内容。写成完整的、可独立成立的陈述句。

### `custom.faqs`（JSON——格式与产品页完全一致）
```json
[
  {
    "question": "How often should I use an exosome serum?",
    "answer": "Twice daily — morning and evening after cleansing. Visible improvements typically appear within 2 to 4 weeks of consistent use."
  },
  {
    "question": "Can I combine exosomes with retinol?",
    "answer": "Yes, but introduce them gradually: use retinol in the evening and the exosome serum in the morning for the first two weeks."
  }
]
```

### `custom.sources`（JSON，可选但强烈建议）
```json
[
  { "label": "Journal of Cosmetic Dermatology — Exosomes in skincare (2024)", "url": "https://onlinelibrary.wiley.com/journal/14732165" },
  { "label": "NIH — Extracellular vesicles overview", "url": "https://www.ncbi.nlm.nih.gov/pmc/" }
]
```
> 外泌体属于「医学化」品类，AI 对可验证来源审得严——有真实文献引用的文章，
> 被引用概率显著高于纯营销文。**只引用真实存在、真的支撑论点的链接**。

---

## Step 3 — GEO 写作 SOP（每篇都照做）

1. **标题即问题或答案**：AI 搜索的入口是用户的自然语言提问。
   ✅ "How Do Exosomes Repair Your Skin Barrier?"　❌ "Our Amazing New Technology"
2. **首段直接给答案**（答案先行）：前 2–3 句话要能被 AI 完整摘走当引用。
3. **H2/H3 用问题句式**：代码会自动给每个 H2/H3 生成锚点和目录（TOC），
   问题式小标题 = AI 引擎的精准命中点。
4. **实体一致性**：品牌统一写 `Weiman Poetics`，产品用全名并**内链到产品页**
   （文章 → 产品的内链是转化闭环，也是实体图谱信号）。
5. **保持新鲜度**：更新旧文章后，页面会自动显示 "Updated" 日期并写入
   `dateModified` Schema——AI 引擎偏好近期维护过的内容。
6. **摘要（Excerpt）必填**：后台文章编辑页的 Excerpt 会成为 Schema description
   和列表页卡片摘要，不填则自动截取正文前 300 字符。
7. **作者简介**：Settings → Users 里给作者账号填 Bio，文章页会自动出现
   "About the author"（E-E-A-T 信任信号）。

---

## Step 4 — 主题编辑器可调项

- **Blog page**（列表页）：眉标文案（默认 The Journal）、博客简介、每页篇数（默认 9）、标签筛选开关。
- **Article page**（文章页）：眉标文案（默认取博客名）、TOC / 作者简介 / 上一篇下一篇 / 相关文章开关（默认全开）。

---

## Step 5 — 预览 → 发布 → 验证

```powershell
cd H:\xz\wm-skincare-shopify-theme
shopify theme dev --store 0wcfy0-iw.myshopify.com     # 本地预览
shopify theme push --unpublished --theme "GEO blog"   # 推未发布副本，后台确认再 Publish
shopify theme check                                    # 体检
```

发布后验证：
- **Google Rich Results Test** → https://search.google.com/test/rich-results
  文章 URL 应识别出 **Article + FAQPage（填了 faqs 时）+ BreadcrumbList** 三种。
- **Schema.org Validator** → https://validator.schema.org/
- Atom feed 可访问：`https://verepoetry.com/blogs/<博客handle>.atom`（已自动暴露给爬虫）。

---

## 验收清单

- [ ] 3 个 Blog post metafield 定义已创建（`custom.faqs` / `custom.key_takeaways` / `custom.sources`）
- [ ] `faqs`、`sources` 选的是 **JSON** 类型
- [ ] 至少一篇文章按 Step 3 SOP 写作并填好 metafield
- [ ] 文章 Excerpt 已填、作者 Bio 已填
- [ ] Rich Results Test 识别出 Article + FAQPage + BreadcrumbList
