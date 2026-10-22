import {readFile,readdir,stat,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {gzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
const root=path.resolve(import.meta.dirname,'..'), dist=path.join(root,'dist');
const work=JSON.parse(await readFile(path.join(root,'src/data/work.json'),'utf8'));
const routes=['/','/works/childrens-games/','/artists/pieter-bruegel-the-elder/','/collections/hidden-details/','/about/','/editorial-policy/',...work.related.map(item=>item.href)];
let count=0;
for(const route of routes){
  const html=await readFile(path.join(dist,route,'index.html'),'utf8');
  assert.equal((html.match(/<h1(?:\s|>)/g)||[]).length,1,`${route}: exactly one h1`);
  for(const image of html.matchAll(/<img\b[^>]*>/g)) assert(/\balt=/.test(image[0]),`${route}: image alt missing`);
  for(const link of html.matchAll(/(?:href|src)="(\/[^"#?]*)(?:[#?][^"]*)?"/g)){
    const file=path.join(dist,link[1],link[1].endsWith('/')?'index.html':'');
    await stat(file).catch(()=>assert.fail(`${route}: missing ${link[1]}`));
  }
  if(route==='/works/childrens-games/'){
    assert(html.includes(work.article.intro),'Static article intro is missing');
    for(const slide of work.slides.slice(1)){
      assert(slide.focus.length===4 && slide.focus.every(n=>n>=0 && n<=1),'Invalid focus data');
      assert(html.includes(slide.headline.replaceAll("'",'&#39;')) || html.includes(slide.headline),'Static guide heading missing');
    }
    assert(html.includes('VisualArtwork') && html.includes('BreadcrumbList') && html.includes('Article'),'Structured data missing');
    assert(!html.includes('src="/images/childrens-games/image.jpg"'),'Original must never be sent whole');
  }
  count++;
}
const scripts=[];
for(const file of await readdir(path.join(dist,'_astro'))){if(file.endsWith('.js')){const bytes=await readFile(path.join(dist,'_astro',file));scripts.push({file,bytes:bytes.length,gzipBytes:gzipSync(bytes).length});}}
const firstView=scripts.filter(file=>!file.file.toLowerCase().includes('openseadragon'));
assert(firstView.reduce((total,file)=>total+file.gzipBytes,0)<100*1024,'First-view JS exceeds 100 KB gzip');
const tileRoot=path.join(dist,'images/childrens-games/painting_files');
const dzi=await readFile(path.join(dist,'images/childrens-games/painting.dzi'),'utf8');
assert(dzi.includes('Width="8000"') && dzi.includes('Height="5770"'),'DZI dimensions disagree with source');
let tiles=0,tileBytes=0;
for(const level of await readdir(tileRoot))for(const file of await readdir(path.join(tileRoot,level))){tiles++;tileBytes+=(await stat(path.join(tileRoot,level,file))).size;}
const report={routes:count,staticHTML:'passed',internalLinks:'passed',focusData:'passed',structuredData:'passed',scripts,firstViewGzipBytes:firstView.reduce((sum,file)=>sum+file.gzipBytes,0),tiles,tileBytes,performanceNote:'Byte sizes are build measurements. LCP, CLS and INP require mobile 4G lab/field measurement; no pass claimed.'};
await writeFile(path.join(root,'BUILD-REPORT.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
