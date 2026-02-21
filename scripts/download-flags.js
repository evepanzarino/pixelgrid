#!/usr/bin/env node
// Downloads all LGBTQIA+ pride flags from the fandom wiki

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, '../belonging/client/public/flags');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const FILES = [
  "File:A-Spec Flag Aloe Vera.svg","File:A-Spec Flag.svg","File:Abroromantic flag.png",
  "File:Abrosexual Flag.svg","File:Aceflux Flag.svg","File:Achillean flag original.jpg",
  "File:Achillean Flag.svg","File:Aegoromantic Flag.svg","File:Aegosexual Flag.svg",
  "File:Agender 4-stripe Flag.svg","File:Agender Flag.svg","File:Agender Spectrum Flag.png",
  "File:Agenderflux Flag Original File.png","File:Alloace Flag.svg","File:Alloaro Flag.svg",
  "File:Alt Genderfluid Flag.png","File:Alternative Pansexual Flag.svg","File:Androgyne flag 2 .png",
  "File:Androgyne Pride Flag.png","File:Androgynous Flag.svg","File:AndroromanticFlag.png",
  "File:Androsexual Flag.svg","File:Angled Aroace Flag.svg","File:Another QPR Flag.jpg",
  "File:Aplatonic flag.png","File:Aplatonic Flag.svg","File:ApothiromanticFlag.png",
  "File:Apothisexual Flag.svg","File:Aroace Flag Alt.svg","File:Aroace Flag.svg",
  "File:Aroaceflux.png","File:Aroflux Flag.svg","File:Aromantic Flag.svg",
  "File:Aromantic Spectrum Flag.svg","File:Asexual Flag.svg","File:Asexual Spectrum Flag.svg",
  "File:Bear Flag.svg","File:Bicurious.png","File:Bigender Flag.svg",
  "File:Biromantic flag (by pride-flags).png","File:Biromantic Flag1.png","File:Bisexual Flag.svg",
  "File:Butch Flag.svg","File:Ceteroromantic flag.png","File:Ceterosexual.jpg",
  "File:Ceterosexual2.png","File:Chevron Queer Flag.svg","File:Community Lesbian Flag.svg",
  "File:Cougar-Lipstick-Pink.png","File:Cupioromantic Flag Original File.png",
  "File:Cupioromantic Flag.svg","File:Cupiosexual Flag.svg","File:Cupiosexual.png",
  "File:Demiboy Flag.svg","File:Demifluid.png","File:Demiflux.jpg",
  "File:Demigender Flag.svg","File:Demigirl Flag.svg","File:Demiromantic Flag.svg",
  "File:Demisexual Flag.svg","File:Desinoromantic Flag.png.jpg","File:Desinoromantic Flag.svg",
  "File:Diamoric Flag.svg","File:Egogender momma-mogai-sphinx.png","File:EnbianFlag.png",
  "File:Femme Flag.svg","File:First Aromantic Flag.svg","File:Fluid flag original.png",
  "File:Fluidflux Flag.svg","File:FluidFlux.png","File:Frayromantic Flag.svg",
  "File:Frayromantic.png","File:Fraysexual flag.jpg","File:Fraysexual Flag.svg",
  "File:Gay flag Baker.svg","File:Gay flag seven stripe.svg","File:Gay Men Pride Flag 2019.svg",
  "File:Gender Creative.svg","File:Gender Neutral Flag.svg","File:GenderCreativePrideFlag.png",
  "File:Genderfae Flag.svg","File:Genderfaun Flag.svg","File:Genderflor Flag.svg",
  "File:Genderfluid Flag.svg","File:Genderflux Flag.png","File:Genderfuck Flag.svg",
  "File:Genderqueer Flag.svg","File:Gilbert Baker Lavender Flag.svg","File:Gilbert Baker Lavender.png",
  "File:Gray-aromantic Flag.svg","File:Gray-Asexual Flag.svg","File:Graygender Flag Original File.png",
  "File:GrayRomantic.png","File:GyneromanticFlag.png","File:Gynesexual.svg",
  "File:GynesexualFlag.png","File:Heteroqueer Gayer9000.jpg","File:Hijra Flag Original File.png",
  "File:Intergender Flag 2020.png","File:Intergender Flag.svg","File:Intersex Flag.svg",
  "File:Labrys Lesbian Flag.svg","File:Lesbian Flag 5 stripe.svg","File:Lesbian Flags 7 stripes.png",
  "File:Lesbian Pride Double Venus1.svg","File:LGBTI Flag.svg","File:Lydia sapphic flag.svg",
  "File:Maverique flag.png","File:MOGAI Pride Flag.png","File:Monosexual.png",
  "File:Multigender Flag.svg","File:Multisexual Flag.png","File:Neurogender Flag.svg",
  "File:Neutrois.svg","File:Non-Binary Flag.svg","File:Nonbinary Boy flag.png",
  "File:Nonbinary Girl flag.png","File:Novo-original-hq.png","File:Novosexual Flag Alt.png",
  "File:OldAltIntergender.png","File:OldIntergenderFlag.png","File:OldIntersexFlag.png",
  "File:Omniromantic flag.png","File:Omnisexual Flag.svg","File:Oriented Aroace Flag.svg",
  "File:Original sapphic flag.png","File:Pangender flag.png","File:Panromantic Pride Flag.png",
  "File:Pansexual Flag.svg","File:Philadelphia Pride Flag.svg","File:Polyamory Flag.svg",
  "File:Polyamory.png","File:Polygender.webp","File:Polyromantic flag.png",
  "File:Polyromantic.png","File:Polysexual Flag.svg","File:Pomosexual.png",
  "File:Progress Pride Flag1.svg","File:Queer Flag.svg","File:Queerhet Kaestral.png",
  "File:Queerplatonic attraction flag.png","File:Questioning Flag.svg","File:Rainbow Flag1.svg",
  "File:Sapphic Flag.svg","File:Second Aromantic Flag.svg","File:Sex Worker Inclusive Progress Flag.svg",
  "File:Straight Ally flag.png","File:Straight Queer.svg","File:The Butch Flag.png",
  "File:The Femme Flag.png","File:Toric.png","File:Transfeminine2.svg",
  "File:TransfeminineFlag2.png","File:Transgender Flag.svg","File:Transmasc flag.png",
  "File:Transmasculine 2.svg","File:Transmasculine Flag 3.svg","File:Transmasculine flag.png",
  "File:Transmasculine Flag.svg","File:Transmasculine.png","File:Transmedicalism.svg",
  "File:Transmedicalist symbol.png","File:Tricolor Polyamory Pride Flag.png","File:Trigender.jpg",
  "File:Trixic.png","File:Twink Flag.svg","File:Two-Spirit Flag.png",
  "File:Unlabeled Flag.svg","File:UnlabeledPrideFlag.png","File:Waria.png",
  "File:Xenicflag2.webp","File:Xenogender Flag Alt.svg","File:Xenogender Flag.svg"
];

function fetch(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, { headers: { 'User-Agent': 'belonging-app/1.0' } }, res => {
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
  });
}

function fetchJson(url) {
  return fetch(url).then(buf => JSON.parse(buf.toString()));
}

function slugify(title) {
  // "File:Bisexual Flag.svg" -> "bisexual-flag.svg"
  return title.replace(/^File:/, '').replace(/\s+/g, '-').toLowerCase();
}

async function getImageUrls(batch) {
  const titles = batch.join('|');
  const apiUrl = `https://lgbtqia.fandom.com/api.php?action=query&titles=${encodeURIComponent(titles)}&prop=imageinfo&iiprop=url&format=json`;
  const data = await fetchJson(apiUrl);
  const pages = data.query.pages;
  const results = {};
  for (const page of Object.values(pages)) {
    if (page.imageinfo && page.imageinfo[0]) {
      results[page.title] = page.imageinfo[0].url;
    }
  }
  return results;
}

async function downloadFile(url, filename) {
  const dest = path.join(OUT_DIR, filename);
  if (fs.existsSync(dest)) {
    console.log(`  SKIP ${filename} (exists)`);
    return filename;
  }
  const data = await fetch(url);
  fs.writeFileSync(dest, data);
  console.log(`  OK   ${filename} (${data.length} bytes)`);
  return filename;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  console.log(`Downloading ${FILES.length} flags to ${OUT_DIR}\n`);

  const BATCH = 50;
  const urlMap = {};

  for (let i = 0; i < FILES.length; i += BATCH) {
    const batch = FILES.slice(i, i + BATCH);
    console.log(`Fetching URLs for batch ${Math.floor(i/BATCH)+1}...`);
    try {
      const urls = await getImageUrls(batch);
      Object.assign(urlMap, urls);
    } catch(e) {
      console.error(`  Batch error: ${e.message}`);
    }
    await sleep(500);
  }

  console.log(`\nGot ${Object.keys(urlMap).length} URLs. Downloading images...\n`);

  const manifest = [];
  for (const file of FILES) {
    const url = urlMap[file];
    if (!url) {
      console.log(`  MISS ${file}`);
      continue;
    }
    const filename = slugify(file);
    // use the actual extension from the URL
    const ext = url.match(/\.(svg|png|jpg|jpeg|webp|gif)/i)?.[1]?.toLowerCase() || 'png';
    const base = filename.replace(/\.[^.]+$/, '');
    const finalName = `${base}.${ext}`;
    try {
      await downloadFile(url, finalName);
      const label = file.replace(/^File:/, '').replace(/\.[^.]+$/, '').replace(/ (Flag|flag|Pride).*$/i, '').trim();
      manifest.push({ file: finalName, label: label, original: file });
    } catch(e) {
      console.error(`  FAIL ${file}: ${e.message}`);
    }
    await sleep(100);
  }

  // Write manifest
  const manifestPath = path.join(OUT_DIR, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`\nWrote manifest with ${manifest.length} flags to ${manifestPath}`);
}

main().catch(console.error);
