#!/usr/bin/env node

import { glob } from 'glob';
import { minify } from 'terser';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync, writeFileSync } from 'node:fs';
import Handlebars from 'handlebars';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

const removeStringIndents = str =>
  str.replace(/[ ]+</g, '<').replace(/\\n[ ]*/g, '');

const templatesToParse = glob('src/templates/*.hbs', {
  root: __dirname,
});

templatesToParse.then(files => {
  files.forEach(filename => {
    const filePath = join(__dirname, '..', filename);

    const sourceTemplate = readFileSync(filePath, 'utf8');

    const compiledTemplate = Handlebars.precompile(sourceTemplate, {
      knownHelpersOnly: true,
      preventIndent: true,
      noEscape: true,
      strict: true,
    });

    const javascriptTemplate = `export default ${removeStringIndents(
      compiledTemplate
    )}`;

    const outputFilename = filePath.replace('.hbs', '.out.js');

    minify(javascriptTemplate).then(({ code }) =>
      writeFileSync(outputFilename, code, 'utf8')
    );
  });
});
