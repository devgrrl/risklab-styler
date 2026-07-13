import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = new URL('..', import.meta.url).pathname.replace(/^\/(.:)/, '$1');
const run = (command, args, cwd) => {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', shell: process.platform === 'win32' });
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} failed\n${result.stdout}\n${result.stderr}`);
  return result.stdout;
};
const workspace = await mkdtemp(join(tmpdir(), 'risklab-styler-consumer-'));
let tarball;
try {
  const output = run('npm', ['pack', '--silent'], root);
  const filename = output.trim().split(/\r?\n/).findLast((line) => line.endsWith('.tgz'));
  if (!filename) throw new Error(`npm pack did not report a tarball.\n${output}`);
  tarball = join(root, filename);
  await writeFile(join(workspace, 'package.json'), '{"type":"module","private":true}\n');
  run('npm', ['install', '--ignore-scripts', tarball], workspace);
  await writeFile(join(workspace, 'esm.mjs'), `
    import { css } from '@risklab/styler';
    import { createServerStyleCollector } from '@risklab/styler/server';
    import { compileStyleDocument } from '@risklab/styler/compiler';
    if (!css({display:'grid'}).startsWith('rs-')) process.exit(2);
    if (!createServerStyleCollector().getStyleTag().includes('<style')) process.exit(3);
    if (!compileStyleDocument({version:'risklab.styles/v1',styles:{a:{display:'grid'}}}).css) process.exit(4);
  `);
  await writeFile(join(workspace, 'cjs.cjs'), `
    const core = require('@risklab/styler');
    const server = require('@risklab/styler/server');
    const compiler = require('@risklab/styler/compiler');
    if (!core.css || !server.createServerStyleCollector || !compiler.compileStyleDocument) process.exit(5);
  `);
  run('node', ['esm.mjs'], workspace);
  run('node', ['cjs.cjs'], workspace);
  console.log(`Consumer install, ESM, and CommonJS execution passed: ${filename}`);
} finally {
  await rm(workspace, { recursive: true, force: true });
  if (tarball) await rm(tarball, { force: true });
}
