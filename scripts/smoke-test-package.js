#!/usr/bin/env node
/**
 * Packaging smoke test.
 *
 * Packs the tarball, installs it into a throwaway project, and loads it through
 * both entry points the way a consumer would.
 *
 * The unit suite runs ts-jest against `src/`, so it never exercises the built
 * output. That gap let the ESM build ship broken from at least 0.2.0-beta
 * through 1.0.0-beta: TypeScript does not rewrite relative import specifiers, so
 * `dist/esm` carried extensionless imports that Node's ESM resolver rejects.
 * `require()` worked, `import` failed with ERR_MODULE_NOT_FOUND, and nothing in
 * CI noticed. This runs against the real artifact so that cannot recur.
 */

'use strict';

const { execFileSync } = require('child_process');
const { mkdtempSync, writeFileSync, mkdirSync, rmSync, readdirSync } = require('fs');
const { join } = require('path');
const { tmpdir } = require('os');

const repoRoot = join(__dirname, '..');

function run(cmd, args, cwd) {
  return execFileSync(cmd, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
let workdir;

try {
  process.stdout.write('Packing tarball... ');
  // `npm pack` prints progress to stderr and the filename to stdout.
  const packed = run(npm, ['pack', '--silent'], repoRoot).trim().split('\n').pop().trim();
  const tarball = join(repoRoot, packed);
  console.log(packed);

  workdir = mkdtempSync(join(tmpdir(), 'ziptax-smoke-'));
  writeFileSync(join(workdir, 'package.json'), JSON.stringify({ name: 'smoke', private: true }));

  process.stdout.write('Installing into a clean project... ');
  run(npm, ['install', tarball, '--silent', '--no-audit', '--no-fund'], workdir);
  console.log('done');

  // --- CommonJS -----------------------------------------------------------
  process.stdout.write('  require() ... ');
  const cjs = run(
    process.execPath,
    [
      '-e',
      `const sdk = require('@ziptax/node-sdk');
       const c = new sdk.ZiptaxClient({ apiKey: 'smoke' });
       if (typeof c.getSalesTaxByAddress !== 'function') throw new Error('client method missing');
       if (typeof sdk.verifyWebhookSignature !== 'function') throw new Error('webhook helper missing');
       if (typeof sdk.isTaxCloudCartResponse !== 'function') throw new Error('type guard missing');
       process.stdout.write(String(Object.keys(sdk).length));`,
    ],
    workdir
  );
  console.log(`ok (${cjs} exports)`);

  // --- ES modules ---------------------------------------------------------
  // A nested package.json with "type": "module" makes Node treat the test file
  // as ESM without touching the host project's own type.
  const esmDir = join(workdir, 'esm');
  mkdirSync(esmDir, { recursive: true });
  writeFileSync(join(esmDir, 'package.json'), JSON.stringify({ type: 'module' }));
  writeFileSync(
    join(esmDir, 'smoke.mjs'),
    `import { ZiptaxClient, verifyWebhookSignature, isTaxCloudCartResponse, NO_RETRY } from '@ziptax/node-sdk';
     const c = new ZiptaxClient({ apiKey: 'smoke' });
     if (typeof c.getSalesTaxByAddress !== 'function') throw new Error('client method missing');
     if (typeof verifyWebhookSignature !== 'function') throw new Error('webhook helper missing');
     if (typeof isTaxCloudCartResponse !== 'function') throw new Error('type guard missing');
     if (NO_RETRY.maxAttempts !== 1) throw new Error('NO_RETRY not exported correctly');
     process.stdout.write('ok');
    `
  );

  process.stdout.write('  import ..... ');
  run(process.execPath, [join(esmDir, 'smoke.mjs')], workdir);
  console.log('ok');

  // --- Type declarations --------------------------------------------------
  // Checked under node16 resolution, which reads the "exports" map rather than
  // the top-level "types" field, so a mis-ordered map fails here.
  writeFileSync(
    join(workdir, 'types-check.ts'),
    `import { ZiptaxClient, V60Response, MerchantType, RateUpdatedEvent } from '@ziptax/node-sdk';
     const c: ZiptaxClient = new ZiptaxClient({ apiKey: 'smoke' });
     const t: MerchantType = 'self-managed';
     const r: V60Response | undefined = undefined;
     const e: RateUpdatedEvent | undefined = undefined;
     void c; void t; void r; void e;
    `
  );
  writeFileSync(
    join(workdir, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: {
        strict: true,
        target: 'ES2022',
        module: 'node16',
        moduleResolution: 'node16',
        noEmit: true,
        skipLibCheck: true,
      },
      files: ['types-check.ts'],
    })
  );

  process.stdout.write('  types ...... ');
  // Resolve TypeScript's own entry rather than node_modules/.bin, which is not
  // present in a git worktree and is a .cmd shim on Windows.
  const tscJs = join(require.resolve('typescript/package.json'), '..', 'bin', 'tsc');
  run(process.execPath, [tscJs, '-p', join(workdir, 'tsconfig.json')], workdir);
  console.log('ok');

  // Clean up the tarball we produced in the repo.
  for (const name of readdirSync(repoRoot)) {
    if (name.startsWith('ziptax-node-sdk-') && name.endsWith('.tgz')) {
      rmSync(join(repoRoot, name));
    }
  }

  console.log('\nPackage smoke test passed.');
} catch (error) {
  console.log('FAILED\n');
  if (error.stdout) process.stderr.write(String(error.stdout));
  if (error.stderr) process.stderr.write(String(error.stderr));
  console.error(`\n${error.message}`);
  process.exitCode = 1;
} finally {
  if (workdir) {
    try {
      rmSync(workdir, { recursive: true, force: true });
    } catch {
      // Best effort; a leftover temp dir is harmless.
    }
  }
}
