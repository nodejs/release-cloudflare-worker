#!/usr/bin/env node

import { glob } from 'glob';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync, writeFileSync } from 'node:fs';
import mustache from 'mustache';
import { minify } from 'html-minifier-terser';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const files = await glob(join(root, 'src', 'templates', '*.html'), {
  cwd: root,
});

await Promise.all(
  files.map(async file => {
    const rawHtml = readFileSync(file, 'utf8');
    const minHtml = await minify(rawHtml, {
      collapseWhitespace: true,
      minifyCSS: true,
    });
    const parsed = mustache.parse(minHtml);
    const outFile = file.replace(/\.html$/, '.out.json');
    writeFileSync(outFile, JSON.stringify(parsed) + '\n');
  })
);
