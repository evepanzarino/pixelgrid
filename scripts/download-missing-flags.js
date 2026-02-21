#!/usr/bin/env node
// Downloads the 11 missing LGBTQIA+ pride flags from alternative sources

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, '../belonging/client/public/flags');

function fetch(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 belonging-app/1.0' } }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetch(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

function fetchJson(url) {
  return fetch(url).then(buf => JSON.parse(buf.toString()));
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function getWikimediaUrl(filename) {
  const api = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(filename)}&prop=imageinfo&iiprop=url&format=json`;
  const data = await fetchJson(api);
  const pages = Object.values(data.query.pages);
  if (pages[0].imageinfo) return pages[0].imageinfo[0].url;
  throw new Error(`Not found on Wikimedia: ${filename}`);
}

async function getFandomUrl(filename, wiki = 'lgbtqia-sandbox') {
  const api = `https://lgbtqia.fandom.com/api.php?action=query&titles=${encodeURIComponent(filename)}&prop=imageinfo&iiprop=url&format=json`;
  const data = await fetchJson(api);
  const pages = Object.values(data.query.pages);
  if (pages[0].imageinfo) return pages[0].imageinfo[0].url;
  throw new Error(`Not found on fandom: ${filename}`);
}

async function getNonbinaryWikiUrl(filename) {
  const api = `https://nonbinary.wiki/w/api.php?action=query&titles=${encodeURIComponent(filename)}&prop=imageinfo&iiprop=url&format=json`;
  const data = await fetchJson(api);
  const pages = Object.values(data.query.pages);
  if (pages[0].imageinfo) return pages[0].imageinfo[0].url;
  throw new Error(`Not found on nonbinary.wiki: ${filename}`);
}

async function downloadTo(url, destFile) {
  const dest = path.join(OUT_DIR, destFile);
  const data = await fetch(url);
  fs.writeFileSync(dest, data);
  console.log(`  OK   ${destFile} (${data.length} bytes) from ${url.substring(0, 60)}...`);
}

async function tryMethods(destFile, methods) {
  for (const method of methods) {
    try {
      const url = await method();
      await downloadTo(url, destFile);
      return;
    } catch(e) {
      console.log(`  SKIP ${destFile}: ${e.message.substring(0, 80)}`);
      await sleep(500);
    }
  }
  console.log(`  FAIL ${destFile}: all methods exhausted`);
}

async function main() {
  console.log('Downloading 11 missing LGBTQIA+ pride flags...\n');

  // Pansexual Flag — available on Wikimedia Commons
  await tryMethods('pansexual-flag.svg', [
    () => getWikimediaUrl('File:Pansexuality_Pride_Flag.svg'),
  ]);
  await sleep(300);

  // Non-Binary Flag — available on Wikimedia Commons
  await tryMethods('non-binary-flag.svg', [
    () => getWikimediaUrl('File:Nonbinary_flag.svg'),
  ]);
  await sleep(300);

  // Omnisexual Flag — available on Wikimedia Commons
  await tryMethods('omnisexual-flag.svg', [
    () => getWikimediaUrl('File:Omnisexual_Pride-Flag.svg'),
    () => getWikimediaUrl('File:Omnisexuality_flag.svg'),
  ]);
  await sleep(300);

  // Agenderflux Flag — try nonbinary.wiki then fandom retry
  await tryMethods('agenderflux-flag.png', [
    () => getNonbinaryWikiUrl('File:Agenderflux.png'),
    () => getFandomUrl('File:Agenderflux Flag Original File.png'),
  ]);
  await sleep(300);

  // Apothisexual Flag — retry fandom (503 may be transient)
  await tryMethods('apothisexual-flag.svg', [
    () => getFandomUrl('File:Apothisexual Flag.svg'),
    // DeviantArt blocks bots, so just retry fandom
    async () => {
      await sleep(2000);
      return getFandomUrl('File:Apothisexual Flag.svg');
    },
  ]);
  await sleep(300);

  // Desinoromantic Flag — retry fandom
  await tryMethods('desinoromantic-flag-original.png', [
    () => getFandomUrl('File:Desinoromantic Flag.png.jpg'),
    () => getNonbinaryWikiUrl('File:Desinoromantic.png'),
  ]);
  await sleep(300);

  // Fluid flag original — retry fandom + try nonbinary.wiki
  await tryMethods('fluid-flag-original.png', [
    () => getFandomUrl('File:Fluid flag original.png'),
    () => getNonbinaryWikiUrl('File:Fluid attraction flag.png'),
  ]);
  await sleep(300);

  // Frayromantic flag
  await tryMethods('frayromantic-alt.png', [
    () => getFandomUrl('File:Frayromantic.png'),
    () => getNonbinaryWikiUrl('File:Frayromantic flag.png'),
    () => getWikimediaUrl('File:Frayromantic_flag.svg'),
  ]);
  await sleep(300);

  // Gilbert Baker Lavender Flag — try fandom retry + Wikimedia
  await tryMethods('gilbert-baker-lavender-flag.svg', [
    () => getFandomUrl('File:Gilbert Baker Lavender Flag.svg'),
    () => getWikimediaUrl('File:Gilbert_Baker_Lavender_Flag.svg'),
    () => getWikimediaUrl('File:Rainbow_flag_(without_stripes).svg'),
  ]);
  await sleep(300);

  // OldIntergenderFlag
  await tryMethods('oldintergender-flag.png', [
    () => getFandomUrl('File:OldIntergenderFlag.png'),
    () => getNonbinaryWikiUrl('File:Intergender flag (old).png'),
  ]);
  await sleep(300);

  // TransfeminineFlag2 — try nonbinary.wiki
  await tryMethods('transfeminine-flag2.png', [
    () => getFandomUrl('File:TransfeminineFlag2.png'),
    () => getNonbinaryWikiUrl('File:Transfeminine flag by unknown.svg'),
    () => getNonbinaryWikiUrl('File:Transfeminine by vriskaZone.png'),
  ]);

  console.log('\nDone.');
}

main().catch(console.error);
