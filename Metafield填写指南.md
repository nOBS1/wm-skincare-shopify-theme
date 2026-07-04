# 产品页 Metafield 填写保姆级指南（团队 SOP）

> **这份文档解决一个问题**：产品页的 FAQ / 规格 / 成分 / 卖点这些区块，代码已经写好了，但内容要从 Shopify 后台的 **Metafield** 喂进去。本文把"在哪点、填什么、怎么验、踩什么坑"全部写死，**任何同事照着做都能完成，不需要懂代码**。
>
> **核心概念（先读这 30 秒）**：
> - 产品页代码里写了一堆"占位插槽"（比如 FAQ 区、规格表），它们去读后台一个叫 **Metafield（元字段）** 的东西。
> - Metafield 没填 = 插槽是空的 = 页面那块**不显示**。填了 = 自动出现。
> - 要做两步，**顺序不能反**：
>   1. **建定义**（告诉 Shopify "产品有这些字段"）——全店做一次。
>   2. **填值**（给某个具体产品的这些字段赋值）——每个产品做一次。

---

## 准备工作

- 登录后台：`https://admin.shopify.com/store/0wcfy0-iw`
- 需要的权限：店主，或有"设置/产品"编辑权限的员工账号。

---

## 第一步：建 12 个 Metafield 定义（全店一次性）

### 1.1 进入入口
后台左下角 **Settings（设置）** → **Custom data（自定义数据）** → 点 **Products（产品）**。
直达：`https://admin.shopify.com/store/0wcfy0-iw/settings/custom_data/product`

### 1.2 完整走一遍「第一个字段」（其余照搬）
以建 **FAQs** 为例：

1. 点右上角 **Add definition（添加定义）**。
2. **Name（名称）** 填：`FAQs`（这个随便写，给人看的）。
3. 找到 **Namespace and key（命名空间和键）**——⚠️**最关键的一步**：必须改成 👉 `custom.faqs`
   - 前半段命名空间 = `custom`，后半段键 = `faqs`。
   - 系统可能自动填成 `custom.f_a_qs` 之类，**手动改成 `custom.faqs`，一个字符都不能差**（代码就靠这个 key 找数据）。
4. 点 **Select type（选择类型）** → 选 **JSON**。
5. （如果看到 **Access / Storefronts** 选项）确认 **Storefronts 是可见/勾选**状态——这样主题才能读到。通常默认就是可见。
6. 点 **Save（保存）**。

✅ 第一个就建好了。剩下 11 个**重复 1.2 的流程**，只是换 Name / key / 类型。

### 1.3 全部 12 个字段对照表（照着建）

| # | Name（随意） | **Namespace and key（必须一字不差）** | **Type（类型）** |
|---|---|---|---|
| 1 | Brand name | `custom.brand_name` | Single line text |
| 2 | Short pitch | `custom.short_pitch` | Single line text |
| 3 | Net volume | `custom.net_volume` | Single line text |
| 4 | Benefits | `custom.benefits` | Rich text |
| 5 | Who is it for | `custom.who_is_it_for` | Rich text |
| 6 | How to use | `custom.how_to_use` | Rich text |
| 7 | Key ingredients | `custom.key_ingredients` | Rich text |
| 8 | Full INCI | `custom.inci` | Multi-line text |
| 9 | Precautions | `custom.precautions` | Rich text |
| 10 | Specifications | `custom.specs` | **JSON** |
| 11 | Brand story | `custom.brand_story` | Rich text |
| 12 | FAQs | `custom.faqs` | **JSON** |
| 13 | Restock note | `custom.restock_note` | Single line text |

> ⚠️ **`specs` 和 `faqs` 一定选 JSON 类型**，选错类型代码读不到、页面不显示。
> （表里 13 行——第 13 个 Restock note 是可选的，售罄时才用。）

---

## 第二步：给产品填值（每个产品一次）

### 2.1 进入产品的 Metafield 区
后台 **Products（产品）** → 点开 **「Weiman Poetics : Morning Dew Age-Defying Mist」** → **滚到页面最底部**，会看到 **Metafields** 区，里面列着第一步建好的所有字段。

### 2.2 逐个把下面的值粘进去
（下面的值我已经按你产品的真实信息预填好，**直接复制粘贴**。带 ⚠️ 的请发布前再确认一遍措辞。）

**`Brand name`**
```
Weiman Poetics
```

**`Short pitch`**
```
A weightless exosome mist that hydrates on contact, reinforces the skin barrier, and leaves a luminous, dew-fresh finish.
```

**`Net volume`**
```
80 mL
```

**`Specifications`**（JSON——整段粘贴，包括最外层的 `[` `]`）
```json
[
  { "label": "Net volume", "value": "80 mL" },
  { "label": "Texture", "value": "Ultra-fine refreshing mist" },
  { "label": "Key actives", "value": "Exosomes, Palmitoyl Tetrapeptide-7, Centella Asiatica" },
  { "label": "Skin type", "value": "All skin types" },
  { "label": "Use", "value": "AM & PM after cleansing, or anytime as a primer" },
  { "label": "Storage", "value": "Room temperature; no refrigeration required" },
  { "label": "Country of origin", "value": "" }
]
```
> `Country of origin` 留空会自动跳过；填上产地（如 `"South Korea"`）就会显示。

**`FAQs`**（JSON——整段粘贴）
```json
[
  { "question": "What is the Morning Dew Age-Defying Mist?", "answer": "A lightweight facial mist powered by high-purity exosome technology. A fine spray of nanometer-sized actives helps hydrate skin, reinforce the skin barrier, and visibly firm the complexion. Key actives include exosomes, Palmitoyl Tetrapeptide-7, and Centella Asiatica." },
  { "question": "Who is it for?", "answer": "Designed for all skin types looking for lightweight hydration and barrier support. Not recommended during pregnancy or nursing." },
  { "question": "How do I use it?", "answer": "Use morning and evening after cleansing: hold about 20 cm from your face and mist evenly. It can also be used any time of day as a revitalizing primer before makeup." },
  { "question": "Is it suitable for sensitive skin?", "answer": "The mist is formulated to be soothing and hydrating on contact. As with any new skincare product, do a patch test on the inner forearm before first use. If you have a known skin condition, consult a dermatologist first." },
  { "question": "Can I use it during pregnancy or while breastfeeding?", "answer": "It is not recommended during pregnancy or nursing. Please consult your doctor before use." },
  { "question": "How should I store it?", "answer": "Store at room temperature, away from direct sunlight. No refrigeration or sub-zero storage is required, so it's travel-friendly." }
]
```
> ⚠️ 上面"敏感肌 / 孕期"两条是**安全声明**，发布前请让懂合规的同事确认措辞符合实际口径。

**`Benefits`**（Rich text——直接把这几行粘进富文本框，做成项目符号列表更好看）
```
• Nanometer Penetration — micro-droplets carry exosomes into deeper layers of the skin
• Barrier Recharge — strengthens the skin's core shields for a balanced, healthy glow
• Hydrate & Soothe — high-moisture mist calms sensitivity and dryness on contact
• Travel-Friendly Biotech — no sub-zero storage; science that goes wherever you do
```

**`Who is it for`**
```
All skin types — especially anyone wanting lightweight hydration, barrier support, and a fresh, dewy finish. Not recommended during pregnancy or nursing.
```

**`How to use`**
```
Morning and evening, after cleansing: hold ~20 cm from the face and mist evenly. Can also be used anytime as a revitalizing primer.
```

**`Key ingredients`**
```
• Exosomes — signal skin cells to support regeneration and barrier repair
• Palmitoyl Tetrapeptide-7 — peptide that supports firmness and a smoother look
• Centella Asiatica — soothes and helps calm visible redness
```

**`Precautions`**
```
For external use only. Avoid direct contact with eyes. Not recommended during pregnancy or nursing. Patch test before first use. Discontinue if irritation occurs. Store away from direct sunlight.
```

**`Full INCI`** — 🔴 **必须你来填真值**
```
（把产品包装/质检报告上的完整成分表，按含量降序、逗号分隔，粘到这里。
示例格式：Water/Aqua, Glycerin, Butylene Glycol, ... ——别用示例，换成真实全表。）
```

**`Brand story`**（可选）
```
Where cutting-edge exosome science meets timeless beauty rituals — formulated for skin that stays luminous, resilient, and fearless of time.
```

**`Restock note`**（可选，售罄时显示；你已决定补货继续卖，可不填）
```
Currently sold out — contact us or check back soon for restock.
```

### 2.3 保存
填完点产品页右上角 **Save（保存）**。

---

## 第三步：验证（填完一定要看一眼）

1. **预览**：打开预览主题链接看产品页，FAQ / 规格 Dossier / 成分等区块应该都出现了：
   `https://verepoetry.com/products/weiman-poetics-morning-dew-age-defying-mist?preview_theme_id=153068929198`
2. **结构化数据**：把产品正式 URL 贴到 **Google Rich Results Test** → `https://search.google.com/test/rich-results`，应识别出 **Product / FAQPage / BreadcrumbList** 三种。
3. 库存：在产品的 **Inventory** 区把库存设为 >0，按钮会从 Sold Out 变回 Add to Cart、Schema 自动转 InStock。

---

## 常见坑（同事最容易卡这里）

| 现象 | 原因 / 解法 |
|---|---|
| 填了值但预览页那块**不显示** | ① key 拼错了（不是 `custom.faqs` 一字不差）；② JSON 字段类型没选 JSON；③ 定义的 **Storefronts access 没勾**——回 Settings→Custom data→该字段→检查 Access |
| JSON 字段**保存报错** | JSON 格式错了：检查逗号、引号是否成对、最外层是不是 `[ ]`。可先贴到 `https://jsonlint.com` 校验 |
| FAQ 只显示一部分 | 某条缺 `question` 或多/少了逗号——逐条对齐上面的模板 |
| 改了值预览没变 | 浏览器强刷（Ctrl+F5）；预览是缓存的 |

---

## 给同事的话

- 这是一次性体力活，第一步建 13 个定义约 15 分钟，第二步填值约 10 分钟。
- **建定义全店只做一次**；以后上新产品，只需做第二步（填值）。
- 值的"标准答案"就在这份文档里，照抄即可；唯独 **INCI 成分表必须用该产品的真实数据**。
- 填完务必走"第三步验证"，确认三种结构化数据都被识别——这是 GEO/SEO 收录的关键。
