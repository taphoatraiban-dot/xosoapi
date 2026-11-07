const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const files = fs.readdirSync(root).filter(p => p.endsWith('.html'));
const exists = p => fs.existsSync(path.join(root, p));
const sitemap = read('sitemap.xml');
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
const failures = [];
const check = (ok, message) => { if (!ok) failures.push(message); };
check(urls.length === new Set(urls).size, 'Duplicate URLs in sitemap');
for (const url of urls) {
  const pathname = new URL(url).pathname.replace(/^\//, '') || 'index.html';
  check(exists(pathname), 'Missing sitemap target: ' + pathname);
  if (!exists(pathname) || !pathname.endsWith('.html')) continue;
  const html = read(pathname);
  check(!/<meta\b[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html), 'Noindex page in sitemap: ' + pathname);
  check((html.match(/<h1\b/gi) || []).length === 1, 'Expected one H1: ' + pathname);
}
for (const file of files) {
  const html = read(file);
  for (const match of html.matchAll(/\bhref\s*=\s*["']([^"'#?]+)(?:[?#][^"']*)?["']/gi)) {
    const href = match[1];
    if (!href.startsWith('/') && !href.startsWith('./')) continue;
    if (href.startsWith('//')) continue;
    const target = href.replace(/^\.?\//, '') || 'index.html';
    check(exists(target), 'Broken local href in ' + file + ': ' + href);
  }
}
check(read('index.html').includes('href="https://xosothantaiapi.info/"'), 'Homepage canonical missing');
if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else console.log('SEO checks passed:', urls.length, 'sitemap URLs,', files.length, 'HTML pages');
