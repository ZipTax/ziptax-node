#!/usr/bin/env node
/**
 * Writes a minimal package.json into each build output directory declaring its
 * module type.
 *
 * The root package.json has no "type" field, so Node treats every .js file in
 * the package as CommonJS. That includes dist/esm/*.js, which meant an `import`
 * resolved through the exports map to the ESM build and then got parsed as
 * CommonJS. Node's named-export detection found some bindings and missed others,
 * so on Node 18 the failure surfaced as:
 *
 *   SyntaxError: Named export 'NO_RETRY' not found. The requested module
 *   '@ziptax/node-sdk' is a CommonJS module...
 *
 * Newer Node happened to tolerate it, which is why the matrix in CI matters.
 *
 * These markers scope the module type per directory, which is the standard
 * dual-package layout. dist/cjs is marked explicitly too, so the CommonJS build
 * keeps working if the root package ever adopts "type": "module".
 */

'use strict';

const { writeFileSync, existsSync } = require('fs');
const { join } = require('path');

const targets = [
  ['dist/esm', 'module'],
  ['dist/cjs', 'commonjs'],
];

const repoRoot = join(__dirname, '..');
let wrote = 0;

for (const [dir, type] of targets) {
  const absolute = join(repoRoot, dir);

  if (!existsSync(absolute)) {
    console.error(`${dir} does not exist; run the compile steps first`);
    process.exitCode = 1;
    continue;
  }

  writeFileSync(join(absolute, 'package.json'), `${JSON.stringify({ type }, null, 2)}\n`);
  console.log(`Wrote ${dir}/package.json with type "${type}"`);
  wrote += 1;
}

if (wrote !== targets.length) {
  process.exitCode = 1;
}
