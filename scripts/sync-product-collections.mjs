/**
 * Add VEYMENZ to the existing ALL automated collection and create its own
 * automated Online Store collection. No product or price mutations.
 *
 * node scripts/sync-product-collections.mjs [--apply]
 * Uses Shopify CLI's stored store authentication; no access tokens are read.
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, writeFile, mkdir, mkdtemp, rename, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
if (args.some(arg => arg !== '--apply')) throw new Error('Supported option: --apply. Store and collection identities are fixed.');
const apply = args.includes('--apply');
const store = '0wcfy0-iw.myshopify.com';
const apiVersion = '2026-10';
const allId = 'gid://shopify/Collection/333901004974';
const publicationId = 'gid://shopify/Publication/155558969518';
const cli = path.join(process.env.APPDATA ?? '', 'npm/node_modules/@shopify/cli/bin/run.js');
const reportPath = path.join(root, 'reports/product-collections.json');
const execFileAsync = promisify(execFile);
const work = await mkdtemp(path.join(tmpdir(), 'veymenz-collections-'));
const now = () => new Date().toISOString();
const originalRule = { column: 'VENDOR', relation: 'EQUALS', condition: 'Lanyuan Elimei Biotech' };
const vendorRule = { column: 'VENDOR', relation: 'EQUALS', condition: 'VEYMENZ' };
const desiredAllRules = { appliedDisjunctively: true, rules: [originalRule, vendorRule] };
const desiredVendorRules = { appliedDisjunctively: false, rules: [vendorRule] };
const newCollection = {
  title: 'VEYMENZ Collection',
  handle: 'veymenz',
  descriptionHtml: '<p>Explore VEYMENZ facial care, hand care and everyday essentials. Find product details and directions on each page.</p>',
  ruleSet: desiredVendorRules,
};

let report;
try { report = JSON.parse(await readFile(reportPath, 'utf8')); } catch (error) {
  if (error.code !== 'ENOENT') throw error;
  report = { store, apiVersion, runs: [] };
}
if (report.store !== store) throw new Error('Collection report belongs to another store.');
const run = { startedAt: now(), mode: apply ? 'apply' : 'dry-run', stage: 'preflight', plan: { allId, desiredAllRules, newCollection, publicationId }, actions: [] };
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
  const prefix = path.join(work, String(++operation));
  const queryFile = `${prefix}.graphql`;
  const variableFile = `${prefix}.variables.json`;
  const outputFile = `${prefix}.result.json`;
  await writeFile(queryFile, query);
  await writeFile(variableFile, JSON.stringify(variables));
  const cliArgs = [cli, 'store', 'execute', '--store', store, '--query-file', queryFile,
    '--variable-file', variableFile, '--json', '--no-input', '--version', apiVersion, '--output-file', outputFile];
  if (mutation) cliArgs.push('--allow-mutations');
  try {
    await execFileAsync(process.execPath, cliArgs, { windowsHide: true, timeout: 120_000, maxBuffer: 2 * 1024 * 1024 });
  } catch (error) {
    throw new Error(`Shopify CLI collection operation ${operation} failed (exit ${error.code ?? 'unknown'}). Check CLI store auth and access scopes.`);
  }
  const result = JSON.parse(await readFile(outputFile, 'utf8'));
  if (result.errors?.length) throw new Error(result.errors.map(error => error.message).join('; '));
  if (!result.data) throw new Error('CLI returned no GraphQL data.');
  return result.data;
}
const fields = `id title handle descriptionHtml sortOrder templateSuffix
  seo { title description } image { id url altText width height }
  ruleSet { appliedDisjunctively rules { column relation condition } }
  productsCount { count precision }
  products(first: 100) { nodes { id title handle vendor status publishedOnPublication(publicationId: $publicationId) } }
  publishedOnPublication(publicationId: $publicationId)
  resourcePublicationsV2(first: 100) { nodes { isPublished publication { id name } } }`;
async function snapshot() {
  const data = await graphql(`query CollectionSnapshot($allId: ID!, $publicationId: ID!) {
    shop { name currencyCode primaryDomain { url } }
    publications(first: 100) { nodes { id name app { title } } }
    all: collection(id: $allId) { ${fields} }
    veymenz: collectionByHandle(handle: "veymenz") { ${fields} }
  }`, { allId, publicationId });
  return data;
}
function ruleKey(rule) { return JSON.stringify([rule.column, rule.relation, rule.condition]); }
function sameRules(actual, expected) {
  return actual && actual.appliedDisjunctively === expected.appliedDisjunctively
    && JSON.stringify(actual.rules.map(ruleKey).sort()) === JSON.stringify(expected.rules.map(ruleKey).sort());
}
function assertAll(collection) {
  if (!collection || collection.id !== allId || collection.handle !== 'all' || !collection.ruleSet) throw new Error('Existing ALL collection identity or automation mismatch.');
  const originalOnly = collection.ruleSet.rules.length === 1 && ruleKey(collection.ruleSet.rules[0]) === ruleKey(originalRule);
  if (!originalOnly && !sameRules(collection.ruleSet, desiredAllRules)) throw new Error('ALL rules changed unexpectedly; refusing to replace them.');
}
function assertVendor(collection) {
  if (!collection) return;
  if (collection.handle !== 'veymenz' || !sameRules(collection.ruleSet, desiredVendorRules)) throw new Error('Existing veymenz handle has unexpected rules; refusing to overwrite another collection.');
}
function checkErrors(payload) {
  if (payload.userErrors?.length) throw new Error(JSON.stringify(payload.userErrors));
}
function protectedAll(collection) {
  const { ruleSet, products, productsCount, ...protectedFields } = collection;
  return protectedFields;
}
async function waitForJob(job) {
  if (!job || job.done) return;
  run.actions.push({ at: now(), operation: 'membership-job', jobId: job.id });
  await checkpoint();
  for (let attempt = 0; attempt < 6; attempt++) {
    const result = await graphql('query CollectionMembershipJob($id: ID!) { job(id: $id) { id done } }', { id: job.id });
    if (result.job?.done) return;
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
  run.actions.push({ at: now(), operation: 'membership-job-still-processing', jobId: job.id });
  await checkpoint();
}

try {
  const before = await snapshot();
  if (before.shop.currencyCode !== 'USD') throw new Error('Expected the verified USD store.');
  const onlineStore = before.publications.nodes.find(p => p.id === publicationId && [p.name, p.app?.title].some(name => ['Online Store', '在线商店'].includes(name)));
  if (!onlineStore) throw new Error('Verified Online Store publication is unavailable.');
  assertAll(before.all);
  assertVendor(before.veymenz);
  run.before = before;
  run.stage = apply ? 'applying' : 'ready-for-apply';
  // Persist the entire original collection state before any write.
  await checkpoint();
  if (apply) {
    if (!sameRules(before.all.ruleSet, desiredAllRules)) {
      const data = await graphql(`mutation BroadenAllCollection($input: CollectionInput!) {
        collectionUpdate(input: $input) {
          collection { id handle ruleSet { appliedDisjunctively rules { column relation condition } } }
          job { id done } userErrors { field message }
        }
      }`, { input: { id: allId, ruleSet: desiredAllRules } }, true);
      checkErrors(data.collectionUpdate);
      if (data.collectionUpdate.collection?.id !== allId || !sameRules(data.collectionUpdate.collection.ruleSet, desiredAllRules)) throw new Error('ALL rule update verification failed.');
      run.actions.push({ at: now(), operation: 'broaden-all-vendors', id: allId });
      await checkpoint();
      await waitForJob(data.collectionUpdate.job);
    } else {
      run.actions.push({ at: now(), operation: 'skip-all-already-synced', id: allId });
    }
    // Re-query immediately before creation to avoid duplicates on reruns.
    let current = await snapshot();
    assertVendor(current.veymenz);
    if (!current.veymenz) {
      const data = await graphql(`mutation CreateVeymenzCollection($input: CollectionInput!) {
        collectionCreate(input: $input) {
          collection { id title handle ruleSet { appliedDisjunctively rules { column relation condition } } }
          userErrors { field message }
        }
      }`, { input: newCollection }, true);
      checkErrors(data.collectionCreate);
      const created = data.collectionCreate.collection;
      assertVendor(created);
      if (!created?.id) throw new Error('Create mutation returned no collection.');
      run.actions.push({ at: now(), operation: 'create-veymenz', id: created.id });
      await checkpoint();
      current = await snapshot();
    } else {
      run.actions.push({ at: now(), operation: 'skip-existing-veymenz', id: current.veymenz.id });
    }
    if (!current.veymenz.publishedOnPublication) {
      const id = current.veymenz.id;
      const data = await graphql(`mutation PublishVeymenzOnlineStore($id: ID!, $publicationId: ID!) {
        publishablePublish(id: $id, input: [{ publicationId: $publicationId }]) {
          publishable { publishedOnPublication(publicationId: $publicationId) } userErrors { field message }
        }
      }`, { id, publicationId }, true);
      checkErrors(data.publishablePublish);
      if (!data.publishablePublish.publishable?.publishedOnPublication) throw new Error('Collection publication verification failed.');
      run.actions.push({ at: now(), operation: 'publish-veymenz-online-store', id, publicationId });
      await checkpoint();
    }
  }
  const after = await snapshot();
  run.after = after;
  if (apply) {
    if (!sameRules(after.all.ruleSet, desiredAllRules)) throw new Error('ALL final rule verification failed.');
    if (JSON.stringify(protectedAll(before.all)) !== JSON.stringify(protectedAll(after.all))) throw new Error('ALL title, handle, image, sorting, SEO, template, or publications changed unexpectedly.');
    assertVendor(after.veymenz);
    if (!after.veymenz?.publishedOnPublication) throw new Error('VEYMENZ collection is not published to Online Store.');
    const otherPublications = collection => collection?.resourcePublicationsV2.nodes.filter(p => p.publication.id !== publicationId) ?? [];
    if (JSON.stringify(otherPublications(before.veymenz)) !== JSON.stringify(otherPublications(after.veymenz))) throw new Error('Another sales channel publication changed unexpectedly.');
    if (before.all.products.nodes.some(product => !after.all.products.nodes.some(item => item.id === product.id))) throw new Error('An original ALL collection member is missing after broadening.');
  }
  run.summary = after.veymenz ? {
    id: after.veymenz.id,
    url: `${after.shop.primaryDomain.url}/collections/veymenz`,
    adminProductCount: after.veymenz.productsCount,
    returnedProducts: after.veymenz.products.nodes.length,
    activeOnlineStoreProducts: after.veymenz.products.nodes.filter(p => p.status === 'ACTIVE' && p.publishedOnPublication).length,
    draftProducts: after.veymenz.products.nodes.filter(p => p.status === 'DRAFT').length,
    publishedOnOnlineStore: after.veymenz.publishedOnPublication,
    allCollectionProductCount: after.all.productsCount,
  } : { veymenzExists: false };
  run.stage = apply ? 'verified' : 'ready-for-apply';
  run.completedAt = now();
  await checkpoint();
  console.log(JSON.stringify({ mode: run.mode, stage: run.stage, ...run.summary }, null, 2));
} catch (error) {
  run.stage = 'failed';
  run.error = error.message;
  await checkpoint();
  console.error(error.message);
  process.exitCode = 1;
} finally {
  const target = path.resolve(work);
  const relative = path.relative(path.resolve(tmpdir()), target);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative) || !path.basename(target).startsWith('veymenz-collections-')) throw new Error('Refusing cleanup outside the task temporary directory.');
  await rm(target, { recursive: true, force: true });
}
