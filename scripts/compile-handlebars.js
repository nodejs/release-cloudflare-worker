#!/usr/bin/env node

import { glob } from 'glob';
import { minify } from 'terser';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync, writeFileSync } from 'node:fs';
import Handlebars from 'handlebars';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

const removeStringIndents = str =>
  // This function allows removing all spaces before a < and
  // all new lines and new lines accompanied by spaces
  // This is the most simplistic yet effective way to remove
  // empty spaces and new lines to minify the HTML result for the Response Body
  str.replace(/[ ]+</g, '<').replace(/\\n[ ]*/g, '');

const templatesToParse = glob('src/templates/*.hbs', {
  root: __dirname,
});

templatesToParse.then(files => {
  files.forEach(filename => {
    const filePath = join(__dirname, '..', filename);

    // Add <!DOCTYPE html> here because prettier removes it for whatever reason
    const sourceTemplate = '<!DOCTYPE html>' + readFileSync(filePath, 'utf8');

    const compiledTemplate = Handlebars.precompile(sourceTemplate, {
      knownHelpersOnly: true,
      preventIndent: true,
      noEscape: true,
      strict: true,
    });

    // The Handlebars.precompile returns a JavaScript object
    // and then we make a default export of the object
    const javascriptTemplate = `export default ${compiledTemplate}`;

    const outputFilename = filePath.replace('.hbs', '.out.js');

    // We minify the resulting JavaScript file with Terser and
    // then write on the same directory but with `.out.js` extension
    minify(javascriptTemplate).then(({ code }) =>
      writeFileSync(outputFilename, code + '\n', 'utf8')
    );
  });
});
