/**
 * Import the supplied VEYMENZ image collection using Shopify CLI's stored auth.
 *
 * Usage: node scripts/import-product-images.mjs --store <shop.myshopify.com>
 *   [--source <image-directory>] [--audit <product-audit.json>]
 *
 * New products are DRAFT and unpublished. This script never sets prices,
 * inventory or publication. Existing product content is preserved on reruns;
 * only missing importer-owned media is attached. No credentials are read here.
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, writeFile, mkdir, mkdtemp, rm, rename, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
function arg(name, fallback) {
  const i = args.indexOf(name);
  if (i < 0) return fallback;
  if (!args[i + 1] || args[i + 1].startsWith('--')) throw new Error(`Missing value for ${name}`);
  return args[i + 1];
}
const store = arg('--store');
if (!store || !/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(store)) {
  throw new Error('Provide the intended store as --store <name.myshopify.com>.');
}
const source = path.resolve(arg('--source', 'C:/Users/MS/Desktop/英文版详情'));
const cli = arg('--cli', path.join(process.env.APPDATA ?? '', 'npm/node_modules/@shopify/cli/bin/run.js'));
const reportPath = path.join(root, 'reports/product-image-import.json');
const work = await mkdtemp(path.join(tmpdir(), 'veymenz-import-'));
const apiVersion = '2026-10';

const manifest = JSON.parse(await readFile(path.resolve(arg('--audit', path.join(root, 'reports/product-content.json'))), 'utf8'));
const now = () => new Date().toISOString();
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const escapeHtml = s => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
let report;
try { report = JSON.parse(await readFile(reportPath, 'utf8')); } catch (e) {
  if (e.code !== 'ENOENT') throw e;
  report = { store, apiVersion, createdAt: now(), products: [], notes: ['Created products remain draft and unpublished until pricing is provided. Existing prices, stock and publications are preserved.'] };
}
if (report.store !== store) throw new Error('Existing report belongs to another store; use a separate report/check-out.');

async function checkpoint() {
  report.updatedAt = now();
  await mkdir(path.dirname(reportPath), { recursive: true });
  const temp = `${reportPath}.tmp`;
  await writeFile(temp, `${JSON.stringify(report, null, 2)}\n`);
  await rename(temp, reportPath);
}

let operation = 0;
async function graphql(query, variables = {}, mutation = false) {
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
    if (result.errors?.length) throw new Error(result.errors.map(e => e.message).join('; '));
    if (!result.data) throw new Error('CLI did not return GraphQL data.');
    return result.data;
  } catch (e) {
    // Never print raw CLI output: staged-upload responses contain signed data.
    const safe = typeof e.message === 'string' && !e.cmd && !e.stderr ? e.message : `Shopify CLI operation ${operation} failed (exit ${e.code ?? 'unknown'}).`;
    throw new Error(safe);
  } finally { await rm(dir, { recursive: true, force: true }); }
}

const productFields = `id title handle status vendor onlineStoreUrl onlineStorePreviewUrl
  variants(first: 10) { nodes { id title price inventoryQuantity } }
  media(first: 100) { nodes { id alt mediaContentType status ... on MediaImage { image { url width height } } } }
  metafields(first: 100) { nodes { namespace key type value } }`;
async function lookup(handle) {
  const data = await graphql(`query FindImportedProduct($query: String!) { products(first: 10, query: $query) { nodes { ${productFields} } } }`, { query: `handle:${handle}` });
  const exact = data.products.nodes.filter(p => p.handle === handle);
  if (exact.length > 1) throw new Error(`Multiple products use handle ${handle}; refusing to guess.`);
  return exact[0] ?? null;
}
const typeFor = key => ({ 'moisturizing-lotion': 'Face Moisturizer', 'rejuvenating-toner': 'Facial Toner', 'nourishing-essence': 'Facial Essence', 'age-defying-essence': 'Facial Essence', 'anti-aging-serum': 'Facial Serum', 'mens-serum': 'Facial Serum', 'hand-cream': 'Hand Cream', 'bacteriostatic-gel': 'Intimate Care' }[key] ?? 'Skin Care');
function createInput(p, handle) {
  const field = (key, value, type = 'multi_line_text_field') => ({ namespace: 'custom', key, type, value });
  const metafields = [field('brand_name', 'VEYMENZ', 'single_line_text_field'), field('short_pitch', p.description, 'single_line_text_field')];
  if (p.size) metafields.push(field('net_volume', p.size, 'single_line_text_field'));
  if (p.directions) metafields.push(field('how_to_use', p.directions));
  if (p.ingredients_highlighted?.length) metafields.push(field('key_ingredients', `Highlighted ingredients. Refer to the product packaging for the full ingredient list:\n${p.ingredients_highlighted.join('\n')}`));
  if (p.source_precautions) metafields.push(field('precautions', p.source_precautions));
  const descriptionHtml = `<p>${escapeHtml(p.description)}</p>${p.size ? `<p><strong>Net content:</strong> ${escapeHtml(p.size)}</p>` : ''}${p.source_precautions ? `<h3>Precautions</h3><p>${escapeHtml(p.source_precautions)}</p>` : ''}`;
  return { title: p.title, handle, status: 'DRAFT', vendor: 'VEYMENZ', productType: typeFor(p.key), descriptionHtml,
    tags: ['VEYMENZ', 'VEYMENZ image collection'], metafields,
    seo: { title: `${p.title} | VEYMENZ`, description: p.description.slice(0, 160) } };
}
async function localAssets(p) {
  const names = [...p.images, ...(p.detail ? [p.detail] : [])];
  return Promise.all(names.map(async (name, i) => {
    const file = path.join(source, name);
    if (path.dirname(file) !== source) throw new Error('Asset filename must stay in source directory.');
    const bytes = await readFile(file);
    const ext = path.extname(name).toLowerCase();
    const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';
    const role = i < p.images.length ? `hero-${i + 1}` : 'details';
    return { name, file, bytes, mimeType, role, sha256: hash(bytes), uploadName: `veymenz-${p.key}-${role}${ext}`,
      alt: i === 0 ? `VEYMENZ ${p.title} — product presentation` : i < p.images.length ? `VEYMENZ ${p.title} — texture and packaging` : `VEYMENZ ${p.title} — English product information and care guide` };
  }));
}
async function upload(assets) {
  const data = await graphql(`mutation StageProductImages($input: [StagedUploadInput!]!) {
    stagedUploadsCreate(input: $input) { stagedTargets { url resourceUrl parameters { name value } } userErrors { field message } }
  }`, { input: assets.map(a => ({ filename: a.uploadName, mimeType: a.mimeType, resource: 'PRODUCT_IMAGE', httpMethod: 'POST', fileSize: String(a.bytes.length) })) }, true);
  const staged = data.stagedUploadsCreate;
  if (staged.userErrors.length) throw new Error(JSON.stringify(staged.userErrors));
  if (staged.stagedTargets.length !== assets.length) throw new Error('Unexpected staged target count.');
  // Each form only sends the exact local bytes to Shopify's returned target.
  const uploaded = await Promise.all(assets.map(async (a, i) => {
    const target = staged.stagedTargets[i];
    const url = new URL(target.url);
    if (url.protocol !== 'https:') throw new Error('Refusing an insecure upload target.');
    const form = new FormData();
    for (const parameter of target.parameters) form.append(parameter.name, parameter.value);
    form.append('file', new Blob([a.bytes], { type: a.mimeType }), a.uploadName);
    const response = await fetch(target.url, { method: 'POST', body: form, signal: AbortSignal.timeout(120_000) });
    if (!response.ok) throw new Error(`Upload failed for ${a.uploadName}: HTTP ${response.status}`);
    return { originalSource: target.resourceUrl, alt: a.alt, mediaContentType: 'IMAGE' };
  }));
  return uploaded;
}
function recordProduct(entry, product) {
  entry.id = product.id;
  entry.title = product.title;
  entry.status = product.status;
  entry.adminUrl = `https://admin.shopify.com/store/${store.replace('.myshopify.com', '')}/products/${product.id.split('/').at(-1)}`;
  entry.storefrontUrl = product.onlineStoreUrl;
  entry.previewUrl = product.onlineStorePreviewUrl;
  entry.media = product.media.nodes;
  entry.variants = product.variants.nodes;
  entry.metafields = product.metafields.nodes;
  entry.verifiedAt = now();
}
async function importProduct(p) {
  const handle = `veymenz-${p.key}`;
  const assets = await localAssets(p);
  let entry = report.products.find(e => e.handle === handle);
  if (!entry) { entry = { key: p.key, handle, expectedImages: assets.length, assets: [] }; report.products.push(entry); }
  let existing = await lookup(handle);
  if (existing && existing.vendor !== 'VEYMENZ') throw new Error(`Handle ${handle} belongs to another vendor; refusing edits.`);
  if (entry.id && existing?.id !== entry.id) throw new Error(`Product identity changed for ${handle}; refusing edits.`);
  const missing = assets.filter(a => !existing?.media.nodes.some(m => m.alt === a.alt));
  // A changed original must be reviewed rather than silently duplicating media.
  for (const a of assets) {
    const prior = entry.assets.find(b => b.sourceFile === a.name);
    if (prior && prior.sha256 !== a.sha256) throw new Error(`Source changed: ${a.name}. Review before importing again.`);
  }
  entry.assets = assets.map(a => ({ sourceFile: a.name, uploadName: a.uploadName, sha256: a.sha256, bytes: a.bytes.length, role: a.role, alt: a.alt }));
  entry.stage = existing ? 'found-existing-product' : 'preparing-new-draft';
  await checkpoint();
  if (!existing || missing.length) {
    console.log(`${handle}: uploading ${missing.length} original images`);
    const media = await upload(missing);
    entry.stage = existing ? 'attaching-missing-media' : 'creating-draft';
    await checkpoint();
    if (!existing) {
      // Look up immediately before creation in case another run completed.
      existing = await lookup(handle);
      if (existing) throw new Error(`Product appeared during upload for ${handle}; rerun to reconcile safely.`);
      const data = await graphql(`mutation CreateImportedDraft($product: ProductCreateInput!, $media: [CreateMediaInput!]) {
        productCreate(product: $product, media: $media) { product { ${productFields} } userErrors { field message } }
      }`, { product: createInput(p, handle), media }, true);
      if (data.productCreate.product) { existing = data.productCreate.product; recordProduct(entry, existing); await checkpoint(); }
      if (data.productCreate.userErrors.length) throw new Error(JSON.stringify(data.productCreate.userErrors));
    } else {
      const data = await graphql(`mutation AttachImportedMedia($product: ProductUpdateInput!, $media: [CreateMediaInput!]) {
        productUpdate(product: $product, media: $media) { product { ${productFields} } userErrors { field message } }
      }`, { product: { id: existing.id }, media }, true);
      if (data.productUpdate.product) { existing = data.productUpdate.product; recordProduct(entry, existing); await checkpoint(); }
      if (data.productUpdate.userErrors.length) throw new Error(JSON.stringify(data.productUpdate.userErrors));
    }
  }
  for (let attempt = 0; attempt < 8; attempt++) {
    existing = await lookup(handle);
    if (!existing) throw new Error(`Product not found after import: ${handle}`);
    recordProduct(entry, existing);
    const owned = existing.media.nodes.filter(m => assets.some(a => a.alt === m.alt));
    if (owned.some(m => m.status === 'FAILED')) throw new Error(`Shopify media processing failed for ${handle}`);
    if (owned.length === assets.length && owned.every(m => m.status === 'READY' && m.image?.url)) {
      entry.stage = 'complete';
      entry.importedImageCount = owned.length;
      await checkpoint();
      console.log(`${handle}: ${existing.status}, ${owned.length} images READY`);
      return;
    }
    entry.stage = 'processing-media';
    await checkpoint();
    await new Promise(resolve => setTimeout(resolve, 4000));
  }
  throw new Error(`Media processing still pending for ${handle}; rerun to verify without duplicating products.`);
}

try {
  if ((await stat(cli)).isFile() !== true) throw new Error('Shopify CLI executable not found.');
  if (manifest.length !== 8) throw new Error('Expected the audited collection of eight products.');
  for (const product of manifest) await importProduct(product);
  report.completedAt = now();
  report.totalProducts = report.products.filter(p => p.stage === 'complete').length;
  report.totalImages = report.products.reduce((n, p) => n + (p.importedImageCount ?? 0), 0);
  await checkpoint();
  console.log(`Complete: ${report.totalProducts} products, ${report.totalImages} original images. Report: ${reportPath}`);
} catch (e) {
  report.lastError = { at: now(), message: e.message };
  await checkpoint();
  console.error(e.message);
  process.exitCode = 1;
} finally { await rm(work, { recursive: true, force: true }); }
