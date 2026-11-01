/**
 * Review the six confirmed CNY -> USD prices; pass --apply to price, activate,
 * and publish those exact imported products to the verified Online Store.
 *
 * node scripts/set-product-prices.mjs [--apply]
 * All Admin API calls use Shopify CLI's stored store authentication.
 * No inventory, compare-at price, product content, or other-channel writes.
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, writeFile, mkdir, mkdtemp, rm, rename } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const apply = args.includes('--apply');
const allowedArgs = new Set(['--apply']);
if (args.some(arg => !allowedArgs.has(arg))) throw new Error('Supported option: --apply. This operation is bound to the verified store and six products.');
const store = '0wcfy0-iw.myshopify.com';
const publicationId = 'gid://shopify/Publication/155558969518';
const apiVersion = '2026-10';
const cli = path.join(process.env.APPDATA ?? '', 'npm/node_modules/@shopify/cli/bin/run.js');
const execFileAsync = promisify(execFile);
const work = await mkdtemp(path.join(tmpdir(), 'veymenz-pricing-'));
const reportPath = path.join(root, 'reports/product-pricing.json');
const importReport = JSON.parse(await readFile(path.join(root, 'reports/product-image-import.json'), 'utf8'));
if (importReport.store !== store) throw new Error('Import report store identity mismatch.');
const now = () => new Date().toISOString();
const exchange = {
  source: 'Central Bank of Malta reference exchange rates',
  sourceUrl: 'https://www.centralbankmalta.org/exchange-rates',
  date: '2026-10-30',
  eurUsd: 1.1172,
  eurCny: 7.4326,
  cnyUsd: 1.1172 / 7.4326,
  formula: 'USD = CNY × (1.1172 / 7.4326)',
  rounding: 'Nearest USD cent; no markup added',
};
const plans = [
  ['hand-cream', '15446581379246', 168, '25.25'],
  ['bacteriostatic-gel', '15446581412014', 1280, '192.40'],
  ['mens-serum', '15446581182638', 880, '132.27'],
  ['moisturizing-lotion', '15446580691118', 880, '132.27'],
  ['nourishing-essence', '15446580822190', 880, '132.27'],
  ['rejuvenating-toner', '15446580756654', 480, '72.15'],
].map(([key, numericId, cny, usd]) => ({ key, id: `gid://shopify/Product/${numericId}`, handle: `veymenz-${key}`, cny, usd }));
for (const plan of plans) {
  if ((plan.cny * exchange.cnyUsd).toFixed(2) !== plan.usd) throw new Error(`Conversion mismatch for ${plan.key}.`);
}
const excluded = ['age-defying-essence', 'anti-aging-serum'];
const originalIds = ['8789650702510', '8790424191150', '8790574727342'].map(id => `gid://shopify/Product/${id}`);
const importedIds = importReport.products.map(p => p.id);
const allIds = [...importedIds, ...originalIds];

let report;
try { report = JSON.parse(await readFile(reportPath, 'utf8')); } catch (error) {
  if (error.code !== 'ENOENT') throw error;
  report = { store, apiVersion, exchange, runs: [] };
}
if (report.store !== store) throw new Error('Pricing report belongs to another store.');
const run = { startedAt: now(), mode: apply ? 'apply' : 'dry-run', stage: 'preflight', domesticPriceSource: 'User-provided domestic product price screenshot', plans, excluded: excluded.map(key => ({ key, reason: key === 'age-defying-essence' ? 'No confirmed price in the provided screenshot' : 'Box quantity / selling unit requires confirmation' })), actions: [] };
report.runs.push(run);
async function checkpoint() {
  report.updatedAt = now();
  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(`${reportPath}.tmp`, `${JSON.stringify(report, null, 2)}\n`);
  await rename(`${reportPath}.tmp`, reportPath);
}

let operation = 0;
async function graphql(query, variables = {}, mutation = false) {
  if (mutation && !apply) throw new Error('Dry-run refuses mutations.');
  const dir = path.join(work, String(++operation));
  await mkdir(dir);
  const queryFile = path.join(dir, 'operation.graphql');
  const variableFile = path.join(dir, 'variables.json');
  const outputFile = path.join(dir, 'result.json');
  await writeFile(queryFile, query);
  await writeFile(variableFile, JSON.stringify(variables));
  const cliArgs = [cli, 'store', 'execute', '--store', store, '--query-file', queryFile,
    '--variable-file', variableFile, '--json', '--no-input', '--version', apiVersion, '--output-file', outputFile];
  if (mutation) cliArgs.push('--allow-mutations');
  try {
    await execFileAsync(process.execPath, cliArgs, { windowsHide: true, timeout: 120_000, maxBuffer: 2 * 1024 * 1024 });
    const result = JSON.parse(await readFile(outputFile, 'utf8'));
    if (result.errors?.length) throw new Error(result.errors.map(error => error.message).join('; '));
    if (!result.data) throw new Error('CLI returned no GraphQL data.');
    return result.data;
  } catch (error) {
    throw new Error(error.cmd || error.stderr ? `Shopify CLI operation ${operation} failed (exit ${error.code ?? 'unknown'}). Check stored store scopes.` : error.message);
  } finally { await rm(dir, { recursive: true, force: true }); }
}
const fields = `id title handle vendor status descriptionHtml productType tags onlineStoreUrl
  publishedOnPublication(publicationId: $publicationId)
  resourcePublicationsV2(first: 100) { nodes { isPublished publication { id name } } }
  variants(first: 100) { nodes { id title price compareAtPrice inventoryQuantity inventoryPolicy inventoryItem { id tracked } } }
  media(first: 100) { nodes { id alt status mediaContentType ... on MediaImage { image { url width height } } } }
  metafields(first: 100) { nodes { namespace key type value } }`;
async function snapshot(ids = allIds) {
  const result = await graphql(`query PricingSnapshot($ids: [ID!]!, $publicationId: ID!) {
    shop { name currencyCode primaryDomain { url } }
    publications(first: 100) { nodes { id name app { title } } }
    nodes(ids: $ids) { ... on Product { ${fields} } }
  }`, { ids, publicationId });
  return { shop: result.shop, publications: result.publications.nodes, products: result.nodes };
}
function assertProduct(plan, product) {
  const imported = importReport.products.find(p => p.key === plan.key);
  if (!imported || imported.id !== plan.id || !product || product.id !== plan.id || product.handle !== plan.handle || product.vendor !== 'VEYMENZ') throw new Error(`Product identity check failed for ${plan.handle}.`);
  if (!['DRAFT', 'ACTIVE'].includes(product.status)) throw new Error(`Unexpected product status for ${plan.handle}: ${product.status}.`);
  if (product.variants.nodes.length !== 1 || imported.variants.length !== 1 || product.variants.nodes[0].id !== imported.variants[0].id) throw new Error(`Expected the single imported variant for ${plan.handle}.`);
  const actualPrice = Number(product.variants.nodes[0].price).toFixed(2);
  if (actualPrice !== '0.00' && actualPrice !== plan.usd) throw new Error(`Current price for ${plan.handle} is ${actualPrice}; refusing to overwrite an unexpected price.`);
  const expectedIds = imported.media.map(m => m.id).sort();
  const actualIds = product.media.nodes.map(m => m.id).sort();
  if (JSON.stringify(expectedIds) !== JSON.stringify(actualIds) || product.media.nodes.some(m => m.status !== 'READY' || !m.image?.url)) throw new Error(`Imported media check failed for ${plan.handle}.`);
  return product.variants.nodes[0];
}
function protectedContent(product) {
  const { status, onlineStoreUrl, publishedOnPublication, resourcePublicationsV2, variants, ...content } = product;
  return { ...content, variants: variants.nodes.map(({ price, ...variant }) => variant) };
}
function errorCheck(payload) {
  if (payload.userErrors?.length) throw new Error(JSON.stringify(payload.userErrors));
}

try {
  const before = await snapshot();
  if (before.shop.currencyCode !== 'USD') throw new Error(`Store currency must be USD; found ${before.shop.currencyCode}.`);
  const publication = before.publications.find(p => p.id === publicationId && [p.name, p.app?.title].some(name => ['Online Store', '在线商店'].includes(name)));
  if (!publication) throw new Error('Verified Online Store publication is unavailable; refusing other channels.');
  if (before.products.some(p => !p)) throw new Error('An imported or original product is missing.');
  const byId = new Map(before.products.map(p => [p.id, p]));
  for (const plan of plans) assertProduct(plan, byId.get(plan.id));
  for (const key of excluded) {
    const item = importReport.products.find(p => p.key === key);
    const product = byId.get(item.id);
    if (product.status !== 'DRAFT' || Number(product.variants.nodes[0].price) !== 0 || product.publishedOnPublication) throw new Error(`Expected untouched unresolved draft: ${key}.`);
  }
  run.shop = before.shop;
  run.publication = publication;
  run.before = before.products;
  run.stage = apply ? 'applying' : 'ready-for-apply';
  await checkpoint();
  console.log(`${apply ? 'Apply' : 'Dry-run'}: USD store, verified Online Store publication, six identities and all media checked.`);
  for (const plan of plans) {
    console.log(`${plan.handle}: CNY ${plan.cny} -> USD ${plan.usd}`);
    if (!apply) continue;
    let product = (await snapshot([plan.id])).products[0];
    const variant = assertProduct(plan, product);
    if (Number(variant.price).toFixed(2) !== plan.usd) {
      const result = await graphql(`mutation SetConfirmedVariantPrice($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
        productVariantsBulkUpdate(productId: $productId, variants: $variants) { productVariants { id price } userErrors { field message } }
      }`, { productId: plan.id, variants: [{ id: variant.id, price: plan.usd }] }, true);
      errorCheck(result.productVariantsBulkUpdate);
      if (Number(result.productVariantsBulkUpdate.productVariants?.[0]?.price).toFixed(2) !== plan.usd) throw new Error(`Price mutation verification failed for ${plan.handle}.`);
      run.actions.push({ at: now(), key: plan.key, operation: 'price-only', variantId: variant.id, usd: plan.usd });
      await checkpoint();
    }
    if (product.status !== 'ACTIVE') {
      const result = await graphql(`mutation ActivatePricedProduct($product: ProductUpdateInput!) {
        productUpdate(product: $product) { product { id status } userErrors { field message } }
      }`, { product: { id: plan.id, status: 'ACTIVE' } }, true);
      errorCheck(result.productUpdate);
      if (result.productUpdate.product?.status !== 'ACTIVE') throw new Error(`Activation failed for ${plan.handle}.`);
      run.actions.push({ at: now(), key: plan.key, operation: 'activate' });
      await checkpoint();
    }
    if (!product.publishedOnPublication) {
      const result = await graphql(`mutation PublishToOnlineStore($id: ID!, $publicationId: ID!) {
        publishablePublish(id: $id, input: [{ publicationId: $publicationId }]) {
          publishable { publishedOnPublication(publicationId: $publicationId) } userErrors { field message }
        }
      }`, { id: plan.id, publicationId }, true);
      errorCheck(result.publishablePublish);
      if (!result.publishablePublish.publishable?.publishedOnPublication) throw new Error(`Online Store publication failed for ${plan.handle}.`);
      run.actions.push({ at: now(), key: plan.key, operation: 'publish', publicationId });
      await checkpoint();
    }
    product = (await snapshot([plan.id])).products[0];
    if (Number(product.variants.nodes[0].price).toFixed(2) !== plan.usd || product.status !== 'ACTIVE' || !product.publishedOnPublication) throw new Error(`Final live verification failed for ${plan.handle}.`);
    if (JSON.stringify(protectedContent(byId.get(plan.id))) !== JSON.stringify(protectedContent(product))) throw new Error(`Protected content or inventory changed for ${plan.handle}.`);
    const beforeOther = byId.get(plan.id).resourcePublicationsV2.nodes.filter(p => p.publication.id !== publicationId);
    const afterOther = product.resourcePublicationsV2.nodes.filter(p => p.publication.id !== publicationId);
    if (JSON.stringify(beforeOther) !== JSON.stringify(afterOther)) throw new Error(`Another channel publication changed for ${plan.handle}.`);
    run.actions.push({ at: now(), key: plan.key, operation: 'verified', price: product.variants.nodes[0].price, status: product.status, onlineStoreUrl: product.onlineStoreUrl });
    await checkpoint();
  }
  if (apply) {
    const after = await snapshot();
    const afterById = new Map(after.products.map(p => [p.id, p]));
    const untouchedIds = [...originalIds, ...excluded.map(key => importReport.products.find(p => p.key === key).id)];
    for (const id of untouchedIds) {
      if (JSON.stringify(byId.get(id)) !== JSON.stringify(afterById.get(id))) throw new Error(`Untouched product changed: ${id}.`);
    }
    run.after = after.products;
    run.verification = { pricedAndPublished: plans.length, unresolvedDraftsUntouched: excluded.length, originalProductsUntouched: originalIds.length, currency: 'USD', inventoryAndCompareAtPricesPreserved: true, productContentAndMediaPreserved: true, otherPublicationsPreserved: true };
    run.stage = 'complete';
    console.log('Complete: six prices verified, six ACTIVE and published to Online Store; five other products unchanged.');
  }
  run.completedAt = now();
  report.exchange = exchange;
  await checkpoint();
} catch (error) {
  run.stage = 'failed';
  run.error = { at: now(), message: error.message };
  await checkpoint();
  console.error(error.message);
  process.exitCode = 1;
} finally { await rm(work, { recursive: true, force: true }); }
