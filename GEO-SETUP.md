# GEO / SEO 落地清单（产品页）

> 这份文档是「数据轨」。**代码轨已经完成**（`sections/product-template.liquid` + `assets/theme.css`）——
> Schema bug 已修、升级为 brand/manufacturer 实体图谱、新增 Benefits / Specifications / INCI /
> Precautions / Brand&maker / FAQ 结构化区块。
>
> 但这些区块全部 **metafield 驱动，空值自动隐藏**。所以现在线上还是半成品的**真因**是：
> 后台 metafield 没定义、没填。把下面的值填进去，页面才会真正「长出」GEO 内容。
>
> 命名空间统一用 `custom`。所有样例值都取自你 description 里**已有的真实事实**（80 mL / Star Actives /
> Skin Types / Use / 储存），不是编造的——只是把它们从一坨 HTML 搬进结构化字段。

---

## Step 1 — 创建 metafield 定义

后台路径：**Settings → Custom data → Products → Add definition**。逐个建以下定义（Namespace and key 必须**完全一致**）：

| 名称 | Namespace and key | 类型 (Type) | 说明 |
|---|---|---|---|
| Brand name | `custom.brand_name` | Single line text | 消费者品牌名（Weiman Poetics）。不填则自动从标题 `:` 前取 |
| Short pitch | `custom.short_pitch` | Single line text | 标题下方一句话卖点 |
| Benefits | `custom.benefits` | Rich text | 核心卖点列表 |
| Who is it for | `custom.who_is_it_for` | Rich text | 适合谁 |
| How to use | `custom.how_to_use` | Rich text | 怎么用 |
| Key ingredients | `custom.key_ingredients` | Rich text | 明星成分 + 作用 |
| Full INCI | `custom.inci` | Multi-line text | **完整成分表**（见 Step 3） |
| Precautions | `custom.precautions` | Rich text | 禁忌 / 注意事项 |
| Specifications | `custom.specs` | **JSON** | 规格表，同时喂给 Schema 的 additionalProperty |
| Brand story | `custom.brand_story` | Rich text | 品牌故事（可选） |
| FAQs | `custom.faqs` | **JSON** | 问答，同时生成 FAQPage Schema |
| Restock note | `custom.restock_note` | Single line text | 售罄时显示的补货提示（可选） |

> ⚠️ `specs` 和 `faqs` 一定要选 **JSON** 类型，否则 `.value` 取不到数组、区块不渲染。

---

## Step 2 — 填值（直接抄）

进入产品 **Weiman Poetics : Morning Dew Age-Defying Mist** 的编辑页，下拉到 Metafields 区填写。

### `custom.specs`（JSON，规格表）
最后一行 `Country of origin` 我留空了——填上产地后会自动显示，留空则自动跳过。

```json
[
  { "label": "Net volume", "value": "80 mL" },
  { "label": "Texture", "value": "Ultra-fine refreshing mist" },
  { "label": "Key actives", "value": "Exosomes, Palmitoyl Tetrapeptide-7, Centella Asiatica" },
  { "label": "Skin type", "value": "All skin types" },
  { "label": "How to use", "value": "AM & PM after cleansing, or anytime as a primer" },
  { "label": "Storage", "value": "Room temperature; no refrigeration required" },
  { "label": "Country of origin", "value": "" }
]
```

### `custom.faqs`（JSON，问答 + FAQPage Schema）
> 🔴 **发布前务必复核**带 ⚠️ 的答案——孕期/敏感肌属于**安全声明**，措辞要和你的实际合规口径一致。

```json
[
  {
    "question": "What is the Morning Dew Age-Defying Mist?",
    "answer": "A lightweight facial mist powered by high-purity exosome technology. A fine spray of nanometer-sized actives helps hydrate skin, reinforce the skin barrier, and visibly firm the complexion. Key actives include exosomes, Palmitoyl Tetrapeptide-7, and Centella Asiatica."
  },
  {
    "question": "Who is it for?",
    "answer": "Designed for all skin types looking for lightweight hydration and barrier support. ⚠️ Not recommended during pregnancy or nursing."
  },
  {
    "question": "How do I use it?",
    "answer": "Use morning and evening after cleansing: hold about 20 cm from your face and mist evenly. It can also be used any time of day as a revitalizing primer before makeup."
  },
  {
    "question": "Is it suitable for sensitive skin?",
    "answer": "⚠️ The mist is formulated to be soothing and hydrating on contact. As with any new skincare product, do a patch test on the inner forearm before first use. If you have a known skin condition, consult a dermatologist first."
  },
  {
    "question": "Can I use it during pregnancy or while breastfeeding?",
    "answer": "⚠️ It is not recommended during pregnancy or nursing. Please consult your doctor before use."
  },
  {
    "question": "How should I store it?",
    "answer": "Store at room temperature, away from direct sunlight. No refrigeration or sub-zero storage is required, so it's travel-friendly."
  },
  {
    "question": "What are the key ingredients?",
    "answer": "The star actives are exosomes, Palmitoyl Tetrapeptide-7, and Centella Asiatica. See the full INCI list on this page for all ingredients."
  }
]
```

### `custom.benefits`（Rich text — 你原 description 的 4 个卖点）
```
• Nanometer Penetration — micro-droplets carry exosomes into deeper layers
• Barrier Recharge — strengthens the skin's core shields for a balanced, healthy glow
• Hydrate & Soothe — high-moisture mist calms sensitivity and dryness on contact
• Travel-Friendly Biotech — no sub-zero storage; science that goes wherever you do
```

### `custom.who_is_it_for`（Rich text）
```
All skin types — especially anyone wanting lightweight hydration, barrier support, and a fresh, dewy finish. Not recommended during pregnancy or nursing.
```

### `custom.how_to_use`（Rich text）
```
Morning and evening, after cleansing: hold ~20 cm from the face and mist evenly. Can also be used anytime as a revitalizing primer.
```

### `custom.key_ingredients`（Rich text）
```
• Exosomes — signal skin cells to support regeneration and barrier repair
• Palmitoyl Tetrapeptide-7 — peptide that supports firmness and a smoother look
• Centella Asiatica — soothes and helps calm visible redness
```

### `custom.precautions`（Rich text）
```
For external use only. Avoid direct contact with eyes. ⚠️ Not recommended during pregnancy or nursing. Patch test before first use. Discontinue if irritation occurs. Store away from direct sunlight.
```

### `custom.brand_name`
```
Weiman Poetics
```

### `custom.restock_note`（可选，售罄时显示）
```
Currently sold out — contact us or check back soon for restock.
```

---

## Step 3 — 完整成分表 INCI（必须你来填，🔴 GEO 关键）

`custom.inci` 现在是**占位空白**。外泌体这种「医学化」品类，AI（ChatGPT / Perplexity / Google AI Overview）对**可验证成分**审得最严——
有完整 INCI 才有信任分，光有 "high-purity exosome" 这种营销词反而会被判为不可靠。

请从**产品包装 / 实验室报告**抄全成分表，按含量降序，逗号分隔，例如：
```
Water/Aqua, Glycerin, Butylene Glycol, Centella Asiatica Extract, sh-Oligopeptide-1 (Exosome), Palmitoyl Tetrapeptide-7, Sodium Hyaluronate, Panthenol, ...（此处替换为你的真实全表）
```
> 上面是**格式示例**，不是你的真实配方——别直接发布，务必替换成你包装上的实际 INCI。

---

## Step 4 — 品牌实体映射（你的第 5 优先级，已自动处理 + 待你确认）

线上现状：`vendor = Lanyuan Elimei Biotech`，于是旧 Schema 把它当成了 `brand`。

新代码的处理（无需改动即生效）：
- **Brand** = `Weiman Poetics`（自动从标题 `Weiman Poetics : ...` 取，或用 `custom.brand_name` 覆盖）
- **Manufacturer** = `Lanyuan Elimei Biotech`（= vendor）
- 页面新增「Brand & maker」区块会明确写出：**Weiman Poetics is a skincare brand manufactured by Lanyuan Elimei Biotech.**

✅ **请确认这个关系是否正确**。如果品牌/生产方对应反了，告诉我，或直接改 `custom.brand_name`。

---

## Step 5 — 评分（aggregateRating，可选但强烈建议）

代码已支持：当存在 `reviews.rating` + `reviews.rating_count` 且数量 > 0 时，自动输出 `aggregateRating`（星级富片段）。
现在没有评论 → **故意不输出**（不能伪造评分，Google 会处罚）。

要拿到星级：装一个会写入标准 `reviews` 命名空间的评价 App（Judge.me / Loox / Shopify 官方 Product Reviews）。装完有真实评论后，星级会自动出现在搜索结果里。

---

## Step 6 — 售罄状态决策（请拍板）

页面现在显示 `Sold Out`，Schema 诚实标 `OutOfStock`。长期售罄会让搜索/AI 判定为「不可购买页」，降权。三个选项：

1. **补货继续卖** —— 最优，库存>0 后 Schema 自动变 `InStock`，按钮恢复 Add to Cart。
2. **暂时缺货** —— 填 `custom.restock_note`，页面会显示补货提示，保留转化意图。
3. **已停售** —— 考虑 301 重定向到同类在售产品，避免死页扣权重。

> 我不会把 `OutOfStock` 伪造成 `InStock`——那是诚信红线，且 Google 会处罚。

---

## Step 7 — 预览 → 发布 → 验证

```powershell
cd H:\xz\wm-skincare-shopify-theme

# 1) 本地实时预览（你的店铺域名已知）
shopify theme dev --store 0wcfy0-iw.myshopify.com

# 2) 先推到一个「未发布」副本，确认没问题再在后台 Publish（安全，不动线上）
shopify theme push --unpublished --theme "GEO update"

#    确认无误后，在 Online Store → Themes 里点 Publish；
#    或直接覆盖当前线上主题（谨慎）：
# shopify theme push

# 3) 体检
shopify theme check
```

发布后验证结构化数据：
- **Google Rich Results Test** → https://search.google.com/test/rich-results 输入产品 URL，应识别出 **Product / FAQPage / BreadcrumbList**。
- **Schema.org Validator** → https://validator.schema.org/

---

## 验收清单（填完应全部 ✅）

- [ ] 12 个 metafield 定义已创建（namespace/key 完全一致）
- [ ] `specs`、`faqs` 选的是 **JSON** 类型
- [ ] 产品页填入 specs / faqs / benefits / who / how / key_ingredients / precautions / brand_name
- [ ] **完整 INCI** 已填真实值（非示例）
- [ ] FAQ 里孕期/敏感肌答案已按合规口径复核
- [ ] 品牌实体关系已确认
- [ ] 售罄策略已决定
- [ ] 已发布并通过 Rich Results Test（Product + FAQPage + Breadcrumb 三个都识别）
