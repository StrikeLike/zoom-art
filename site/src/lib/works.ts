// Every painting page is built from pipeline/works/<slug>/: script.json (the story told in the reel and
// carousel) and, once written, article.json (the full story for the site: its own title, every known
// detail, sections, interpretations and sources). With an article, the site tells everything; without
// one, it tells the reel story and the page stays out of search engines.
import fs from 'node:fs';
import path from 'node:path';
import published from '../data/published.json';
import images from '../data/images.json';

export type Focus = [number, number, number, number];
export interface Step { headline: string; text: string; focus: Focus; detail: [number, number]; }
interface Source { title: string; note: string; url: string }
interface Article {
  title?: string; question?: string; intro?: string; whereToSee?: string; flip?: boolean;
  seo?: { keyword: string; meta_title: string; meta_description: string };
  facts?: { medium: string; size_cm: string; museum: string; city: string; licence: string };
  image?: { alt?: string; credit?: string; sourceUrl?: string };
  sections?: { heading: string; paragraphs: string[] }[];
  meaning?: string[];
  details?: { headline: string; text: string; focus: Focus }[];
  sources?: Source[];
}
export interface Work {
  slug: string; title: string; artist: string; artistSlug: string; year: string;
  heading: string; question: string; hook: string; museum: string; steps: Step[]; reelSteps: number; full: boolean;
  image: { base: string; width: number; height: number; dzi: string; alt: string; credit: string; sourceUrl: string; sizes: Record<string, number[]> };
  facts?: Article['facts']; article: Article;
}

// Artists that already have their own page.
export const artistPages = ['pieter-bruegel-the-elder'];

const WORKS = path.resolve(process.cwd(), '..', 'pipeline', 'works');
const readJson = (file: string) => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^﻿/, ''));

const slugify = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/^attributed to /, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function load(slug: string): Work {
  const script = readJson(path.join(WORKS, slug, 'script.json'));
  const articleFile = path.join(WORKS, slug, 'article.json');
  const article: Article = fs.existsSync(articleFile) ? readJson(articleFile) : {};
  const img = (images as unknown as Record<string, { width: number; height: number; sizes: Record<string, number[]>; details: [number, number][] }>)[slug];
  if (!img) throw new Error(`${slug}: no web images yet, run python site/scripts/prepare-images.py`);
  const source: string = script.source ?? '';
  const museum = source.split(' (')[0].split('. ')[0].trim();
  const file = source.match(/Wikimedia Commons:\s*(.+?\.(?:jpe?g|png|tiff?))/i)?.[1];
  const reel = (script.slides as any[]).filter(s => s.focus);
  const full = Boolean(article.details?.length);
  const told = full ? article.details! : reel;
  if (img.details.length !== told.length) throw new Error(`${slug}: images are out of date, run python site/scripts/prepare-images.py ${slug}`);
  return {
    slug, title: script.title, artist: script.artist, artistSlug: slugify(script.artist), year: script.year,
    heading: article.title ?? script.title, question: article.question ?? script.slides[0].headline,
    hook: script.slides[0].headline, museum, full, reelSteps: reel.length,
    steps: told.map((s, i) => ({ headline: s.headline, text: s.text, focus: s.focus as Focus, detail: img.details[i] })),
    image: {
      base: `/images/${slug}`, width: img.width, height: img.height, dzi: `/images/${slug}/painting.dzi`, sizes: img.sizes,
      alt: article.image?.alt ?? `${script.title} by ${script.artist}, ${script.year}.`,
      credit: article.image?.credit ?? `Public domain · ${museum} · via Wikimedia Commons`,
      sourceUrl: article.image?.sourceUrl ?? (file ? `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(file.replace(/ /g, '_'))}` : ''),
    },
    facts: article.facts, article,
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
