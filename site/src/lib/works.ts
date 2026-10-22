// Every painting page is built from pipeline/works/<slug>/script.json, the same file that makes the
// carousel and the reel, so the site always tells the story that was posted. Optional long-form
// article data lives in src/data/articles/<slug>.json.
import fs from 'node:fs';
import path from 'node:path';
import published from '../data/published.json';
import images from '../data/images.json';

export type Focus = [number, number, number, number];
export interface Step { headline: string; text: string; focus: Focus; detail: [number, number]; }
interface Article {
  facts?: { medium: string; size_cm: string; museum: string; city: string; licence: string };
  image?: { alt?: string; credit?: string; sourceUrl?: string };
  article?: { intro: string; body: string; interpretation: string; whereToSee: string; sources: { title: string; note: string; url: string }[] };
}
export interface Work {
  slug: string; title: string; artist: string; artistSlug: string; year: string;
  hook: string; museum: string; steps: Step[];
  image: { base: string; width: number; height: number; dzi: string; alt: string; credit: string; sourceUrl: string; sizes: Record<string, number[]> };
  facts?: Article['facts']; article?: Article['article'];
}

// Artists that already have their own page.
export const artistPages = ['pieter-bruegel-the-elder'];

const articles = import.meta.glob<Article>('../data/articles/*.json', { eager: true, import: 'default' });
const WORKS = path.resolve(process.cwd(), '..', 'pipeline', 'works');

const slugify = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/^attributed to /, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function load(slug: string): Work {
  const script = JSON.parse(fs.readFileSync(path.join(WORKS, slug, 'script.json'), 'utf8').replace(/^﻿/, ''));
  const img = (images as unknown as Record<string, { width: number; height: number; sizes: Record<string, number[]>; details: [number, number][] }>)[slug];
  if (!img) throw new Error(`${slug}: no web images yet, run python site/scripts/prepare-images.py`);
  const extra = articles[`../data/articles/${slug}.json`] ?? {};
  const source: string = script.source ?? '';
  const museum = source.split(' (')[0].split('. ')[0].trim();
  const file = source.match(/Wikimedia Commons:\s*(.+?\.(?:jpe?g|png|tiff?))/i)?.[1];
  const steps = (script.slides as any[]).filter(s => s.focus).map((s, i) => ({ headline: s.headline, text: s.text, focus: s.focus as Focus, detail: img.details[i] }));
  return {
    slug, title: script.title, artist: script.artist, artistSlug: slugify(script.artist), year: script.year,
    hook: script.slides[0].headline, museum, steps,
    image: {
      base: `/images/${slug}`, width: img.width, height: img.height, dzi: `/images/${slug}/painting.dzi`, sizes: img.sizes,
      alt: extra.image?.alt ?? `${script.title} by ${script.artist}, ${script.year}.`,
      credit: extra.image?.credit ?? `Public domain · ${museum} · via Wikimedia Commons`,
      sourceUrl: extra.image?.sourceUrl ?? (file ? `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(file.replace(/ /g, '_'))}` : ''),
    },
    facts: extra.facts, article: extra.article,
  };
}

export const works: Work[] = published.works.map(load);
export const getWork = (slug: string) => works.find(w => w.slug === slug)!;

export function nextWork(work: Work) {
  return works[(works.indexOf(work) + 1) % works.length];
}

// Same artist first, then the paintings that follow on the wall.
export function relatedTo(work: Work, count = 3) {
  const others = works.filter(w => w !== work);
  const start = works.indexOf(work);
  const byWall = [...others].sort((a, b) => ((works.indexOf(a) - start + works.length) % works.length) - ((works.indexOf(b) - start + works.length) % works.length));
  return [...byWall.filter(w => w.artistSlug === work.artistSlug), ...byWall.filter(w => w.artistSlug !== work.artistSlug)].slice(0, count);
}
