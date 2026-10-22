import {readFile,readdir,stat,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {gzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
const root=path.resolve(import.meta.dirname,'..'), dist=path.join(root,'dist');
const {works}=JSON.parse(await readFile(path.join(root,'src/data/published.json'),'utf8'));
const routes=['/','/artists/pieter-bruegel-the-elder/','/collections/hidden-details/','/about/','/editorial-policy/',...works.map(slug=>`/works/${slug}/`)];
let count=0;
for(const route of routes){
  const html=await readFile(path.join(dist,route,'index.html'),'utf8');
  assert.equal((html.match(/<h1(?:\s|>)/g)||[]).length,1,`${route}: exactly one h1`);
  for(const image of html.matchAll(/<img\b[^>]*>/g)) assert(/\balt=/.test(image[0]),`${route}: image alt missing`);
  for(const link of html.matchAll(/(?:href|src)="(\/[^"#?]*)(?:[#?][^"]*)?"/g)){
    const file=path.join(dist,link[1],link[1].endsWith('/')?'index.html':'');
    await stat(file).catch(()=>assert.fail(`${route}: missing ${link[1]}`));
  }
  assert(!/src="[^"]*\/image\.jpg"/.test(html),`${route}: the original must never be sent whole`);
  const slug=route.match(/^\/works\/([^/]+)\/$/)?.[1];
  if(slug){
    const script=JSON.parse((await readFile(path.join(root,'..','pipeline','works',slug,'script.json'),'utf8')).replace(/^﻿/,''));
    for(const slide of script.slides.filter(s=>s.focus)){
      assert(slide.focus.length===4 && slide.focus.every(n=>n>=0 && n<=1),`${slug}: invalid focus data`);
      const escaped=slide.headline.replaceAll('&','&amp;').replaceAll("'",'&#39;').replaceAll('"','&quot;');
      assert(html.includes(escaped) || html.includes(slide.headline),`${slug}: guided step "${slide.headline}" missing from the HTML`);
    }
    assert(html.includes('VisualArtwork') && html.includes('BreadcrumbList') && html.includes('Article'),`${slug}: structured data missing`);
    await stat(path.join(dist,'images',slug,'painting.dzi')).catch(()=>assert.fail(`${slug}: zoom tiles missing`));
  }
  count++;
}
const scripts=[];
for(const file of await readdir(path.join(dist,'_astro'))){if(file.endsWith('.js')){const bytes=await readFile(path.join(dist,'_astro',file));scripts.push({file,bytes:bytes.length,gzipBytes:gzipSync(bytes).length});}}
const firstView=scripts.filter(file=>!file.file.toLowerCase().includes('openseadragon'));
const firstViewGzipBytes=firstView.reduce((total,file)=>total+file.gzipBytes,0);
assert(firstViewGzipBytes<100*1024,'First-view JS exceeds 100 KB gzip');
let files=0,bytes=0;
const walk=async dir=>{for(const entry of await readdir(dir,{withFileTypes:true})){const p=path.join(dir,entry.name);if(entry.isDirectory())await walk(p);else{files++;bytes+=(await stat(p)).size;}}};
await walk(path.join(dist,'images'));
assert(files<20000,'Cloudflare Pages allows at most 20,000 files per deployment');
const report={routes:count,staticHTML:'passed',internalLinks:'passed',focusData:'passed',structuredData:'passed',scripts,firstViewGzipBytes,imageFiles:files,imageBytes:bytes,performanceNote:'Byte sizes are build measurements. LCP, CLS and INP require mobile 4G lab/field measurement; no pass claimed.'};
await writeFile(path.join(root,'BUILD-REPORT.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({...report,scripts:undefined},null,2));
