/**
 * Finalize the user's confirmed box of ten 2.2 g serum applicators at CNY 880.
 * Default: read-only review. Pass --apply for the bounded product-only writes.
 * All Admin operations use Shopify CLI stored auth; no credentials are handled.
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, writeFile, mkdir, mkdtemp, rm, rename } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
if (args.some(a => a !== '--apply')) throw new Error('Only --apply is supported.');
const apply = args.includes('--apply');
const store = '0wcfy0-iw.myshopify.com';
const id = 'gid://shopify/Product/15446580920494';
const variantId = 'gid://shopify/ProductVariant/67918411169966';
const publicationId = 'gid://shopify/Publication/155558969518';
const usd = '132.27';
const cli = path.join(process.env.APPDATA ?? '', 'npm/node_modules/@shopify/cli/bin/run.js');
const exec = promisify(execFile);
const temp = await mkdtemp(path.join(tmpdir(), 'veymenz-serum-'));
const reportPath = path.join(root, 'reports/anti-aging-serum-pricing.json');
const imported = JSON.parse(await readFile(path.join(root, 'reports/product-image-import.json'), 'utf8'));
const content = JSON.parse(await readFile(path.join(root, 'reports/product-content.json'), 'utf8')).find(p => p.key === 'anti-aging-serum');
const exchange = JSON.parse(await readFile(path.join(root, 'reports/product-pricing.json'), 'utf8')).exchange;
if (imported.store !== store || (880 * exchange.cnyUsd).toFixed(2) !== usd) throw new Error('Store identity or confirmed conversion mismatch.');
const oldTitle = 'Luxury Anti-Aging Serum';
const oldDescription = 'A lightweight facial serum in an individually sealed applicator. Designed for evening moisture care and a supple, smooth skin feel.';
const expectedDescription = `${oldDescription} Sold as one box of 10 individually sealed applicators, 2.2 g each.`;
if (content.title !== 'Luxury Anti-Aging Serum — 10 × 2.2 g' || content.size !== '10 × 2.2 g' || content.description !== expectedDescription) throw new Error('Manifest does not match the user-confirmed selling unit.');
const html = (description, size) => `<p>${description}</p><p><strong>Net content:</strong> ${size}</p>`;
const newHtml = html(content.description, content.size);
const originalIds = ['8789650702510', '8790424191150', '8790574727342'].map(n => `gid://shopify/Product/${n}`);
const ids = [...imported.products.map(p => p.id), ...originalIds];
const now = () => new Date().toISOString();
let report;
try { report = JSON.parse(await readFile(reportPath, 'utf8')); } catch (e) {
  if (e.code !== 'ENOENT') throw e;
  report = { store, apiVersion: '2026-10', exchange, runs: [] };
}
if (report.store !== store) throw new Error('Report store identity mismatch.');
const run = { startedAt: now(), mode: apply ? 'apply' : 'dry-run', stage: 'preflight', userConfirmedSellingUnit: { cnyPerBox: 880, applicatorsPerBox: 10, gramsPerApplicator: 2.2, usdPerBox: usd }, actions: [] };
report.runs.push(run);
async function save() {
  await mkdir(path.dirname(reportPath), { recursive: true });
  report.updatedAt = now();
  await writeFile(`${reportPath}.tmp`, JSON.stringify(report, null, 2) + '\n');
  await rename(`${reportPath}.tmp`, reportPath);
}
let sequence = 0;
async function gql(query, variables = {}, mutation = false) {
  if (mutation && !apply) throw new Error('Dry-run refuses mutations.');
  const dir = path.join(temp, String(++sequence)); await mkdir(dir);
  const q = path.join(dir, 'query.graphql'); const v = path.join(dir, 'vars.json'); const o = path.join(dir, 'result.json');
  await writeFile(q, query); await writeFile(v, JSON.stringify(variables));
  const cliArgs = [cli, 'store', 'execute', '--store', store, '--query-file', q, '--variable-file', v, '--json', '--no-input', '--version', '2026-10', '--output-file', o];
  if (mutation) cliArgs.push('--allow-mutations');
  try {
    await exec(process.execPath, cliArgs, { windowsHide: true, timeout: 120000, maxBuffer: 2000000 });
    const r = JSON.parse(await readFile(o, 'utf8'));
    if (r.errors?.length) throw new Error(JSON.stringify(r.errors));
    if (!r.data) throw new Error('CLI returned no data.');
    return r.data;
  } catch (e) { throw new Error(e.cmd || e.stderr ? `Shopify CLI operation ${sequence} failed (exit ${e.code ?? 'unknown'}).` : e.message); }
  finally { await rm(dir, { recursive: true, force: true }); }
}
const query = `query FinalSerumSnapshot($ids:[ID!]!, $publicationId:ID!) {
  shop { currencyCode primaryDomain { url } }
  publications(first:100) { nodes { id name } }
  nodes(ids:$ids) { ... on Product {
    id title handle vendor status descriptionHtml productType tags onlineStoreUrl
    publishedOnPublication(publicationId:$publicationId)
    resourcePublicationsV2(first:100) { nodes { isPublished publication { id name } } }
    variants(first:100) { nodes { id title price compareAtPrice inventoryQuantity inventoryPolicy inventoryItem { id tracked } } }
    media(first:100) { nodes { id alt status mediaContentType ... on MediaImage { image { url width height } } } }
    metafields(first:100) { nodes { id namespace key type value compareDigest } }
  } }
}`;
async function snapshot() { return gql(query, { ids, publicationId }); }
const checkErrors = payload => { if (payload.userErrors.length) throw new Error(JSON.stringify(payload.userErrors)); };
const netVolume = p => p.metafields.nodes.find(m => m.namespace === 'custom' && m.key === 'net_volume');

try {
  const before = await snapshot();
  if (before.shop.currencyCode !== 'USD') throw new Error('Store currency must remain USD.');
  if (!before.publications.nodes.some(p => p.id === publicationId && ['Online Store', '在线商店'].includes(p.name))) throw new Error('Online Store publication identity mismatch.');
  run.before = before.nodes;
  const product = before.nodes.find(p => p?.id === id);
  const original = imported.products.find(p => p.key === 'anti-aging-serum');
  if (!product || !original || original.id !== id || product.vendor !== 'VEYMENZ' || product.handle !== 'veymenz-anti-aging-serum' || !['DRAFT', 'ACTIVE'].includes(product.status)) throw new Error('Serum identity/status mismatch.');
  if (product.variants.nodes.length !== 1 || product.variants.nodes[0].id !== variantId) throw new Error('Serum variant identity mismatch.');
  if (!['0.00', usd].includes(Number(product.variants.nodes[0].price).toFixed(2))) throw new Error('Unexpected current serum price; refusing overwrite.');
  if (![oldTitle, content.title].includes(product.title) || ![html(oldDescription, '2.2 g'), newHtml].includes(product.descriptionHtml)) throw new Error('Unexpected current title/description; refusing overwrite.');
  const net = netVolume(product);
  if (!net || !['2.2 g', content.size].includes(net.value)) throw new Error('Unexpected current net volume.');
  if (JSON.stringify(product.media.nodes.map(m => m.id).sort()) !== JSON.stringify(original.media.map(m => m.id).sort()) || product.media.nodes.some(m => m.status !== 'READY' || !m.image?.url)) throw new Error('Serum image identity/readiness check failed.');
  const essenceId = imported.products.find(p => p.key === 'age-defying-essence').id;
  const essence = before.nodes.find(p => p.id === essenceId);
  if (essence.status !== 'DRAFT' || essence.publishedOnPublication || Number(essence.variants.nodes[0].price) !== 0) throw new Error('Image-only essence must remain an unpublished unpriced draft.');
  run.stage = apply ? 'applying' : 'ready-for-apply'; await save();
  console.log(`${apply ? 'Apply' : 'Dry-run'}: serum box 10 × 2.2 g, CNY880 -> USD${usd}; source image IDs and USD store verified.`);
  if (apply) {
    if (Number(product.variants.nodes[0].price).toFixed(2) !== usd) {
      const result = (await gql(`mutation ($productId:ID!, $variants:[ProductVariantsBulkInput!]!) { productVariantsBulkUpdate(productId:$productId, variants:$variants) { productVariants { id price } userErrors { field message } } }`, { productId: id, variants: [{ id: variantId, price: usd }] }, true)).productVariantsBulkUpdate;
      checkErrors(result);
      if (Number(result.productVariants?.[0]?.price).toFixed(2) !== usd) throw new Error('Price verification failed.');
      run.actions.push({ at: now(), operation: 'price-only', usd }); await save();
    }
    if (net.value !== content.size) {
      const result = (await gql(`mutation ($metafields:[MetafieldsSetInput!]!) { metafieldsSet(metafields:$metafields) { metafields { key value } userErrors { field message } } }`, { metafields: [{ ownerId: id, namespace: 'custom', key: 'net_volume', type: net.type, value: content.size, compareDigest: net.compareDigest }] }, true)).metafieldsSet;
      checkErrors(result);
      if (result.metafields[0]?.value !== content.size) throw new Error('Net volume verification failed.');
      run.actions.push({ at: now(), operation: 'set-box-net-volume', value: content.size }); await save();
    }
    if (product.title !== content.title || product.descriptionHtml !== newHtml || product.status !== 'ACTIVE') {
      const result = (await gql(`mutation ($product:ProductUpdateInput!) { productUpdate(product:$product) { product { id title status descriptionHtml } userErrors { field message } } }`, { product: { id, title: content.title, descriptionHtml: newHtml, status: 'ACTIVE' } }, true)).productUpdate;
      checkErrors(result);
      if (result.product?.title !== content.title || result.product?.status !== 'ACTIVE') throw new Error('Title/activation verification failed.');
      run.actions.push({ at: now(), operation: 'set-box-title-description-and-activate', title: content.title }); await save();
    }
    if (!product.publishedOnPublication) {
      const result = (await gql(`mutation ($id:ID!, $publicationId:ID!) { publishablePublish(id:$id, input:[{publicationId:$publicationId}]) { publishable { publishedOnPublication(publicationId:$publicationId) } userErrors { field message } } }`, { id, publicationId }, true)).publishablePublish;
      checkErrors(result);
      if (!result.publishable?.publishedOnPublication) throw new Error('Online Store publication verification failed.');
      run.actions.push({ at: now(), operation: 'publish-online-store', publicationId }); await save();
    }
    const after = await snapshot(); run.after = after.nodes;
    const current = after.nodes.find(p => p.id === id);
    if (current.title !== content.title || current.descriptionHtml !== newHtml || netVolume(current)?.value !== content.size || Number(current.variants.nodes[0].price).toFixed(2) !== usd || current.status !== 'ACTIVE' || !current.publishedOnPublication) throw new Error('Final serum content/price/publication verification failed.');
    function protect(p) {
      const { title, descriptionHtml, status, onlineStoreUrl, publishedOnPublication, resourcePublicationsV2, variants, metafields, ...rest } = p;
      return { ...rest, variants: variants.nodes.map(({ price, ...v }) => v), metafields: metafields.nodes.filter(m => !(m.namespace === 'custom' && m.key === 'net_volume')), otherPublications: resourcePublicationsV2.nodes.filter(p => p.publication.id !== publicationId) };
    }
    if (JSON.stringify(protect(product)) !== JSON.stringify(protect(current))) throw new Error('Protected serum fields changed.');
    for (const previous of before.nodes.filter(p => p.id !== id)) {
      if (JSON.stringify(previous) !== JSON.stringify(after.nodes.find(p => p.id === previous.id))) throw new Error(`Another product changed: ${previous.handle}.`);
    }
    const newProducts = after.nodes.filter(p => imported.products.some(i => i.id === p.id));
    if (newProducts.filter(p => p.status === 'ACTIVE' && p.publishedOnPublication).length !== 7) throw new Error('Expected exactly seven published VEYMENZ products.');
    const remainingEssence = newProducts.find(p => p.id === essenceId);
    if (remainingEssence.status !== 'DRAFT' || remainingEssence.publishedOnPublication || Number(remainingEssence.variants.nodes[0].price) !== 0) throw new Error('Image-only essence changed unexpectedly.');
    run.verification = { newProductsActiveAndPublished: 7, ageDefyingEssenceDraftImagesRetained: true, priorSixUnchanged: true, originalThreeUnchanged: true, inventoryAndCompareAtPricesPreserved: true, ingredientAndUsageFieldsPreserved: true, otherPublicationsPreserved: true };
    run.storefrontUrl = current.onlineStoreUrl;
    run.stage = 'complete'; console.log('Complete: serum box USD132.27 ACTIVE/Online Store; seven VEYMENZ products published, essence remains draft; other ten products unchanged.');
  }
  run.completedAt = now(); await save();
} catch (e) { run.stage = 'failed'; run.error = { at: now(), message: e.message }; await save(); console.error(e.message); process.exitCode = 1; }
finally { await rm(temp, { recursive: true, force: true }); }
