import {createRequire} from 'node:module';
import {mkdir, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(import.meta.url);
const {build} = require(process.env.ESBUILD_PACKAGE || 'esbuild');
const result = await build({entryPoints: [join(root, 'src/client.jsx')], bundle: true, write: false, platform: 'browser', format: 'cjs',
  external: ['react', 'react-dom', '@deepseek-ai/dsh-client-ui-primitives'], target: ['chrome120'], charset: 'utf8', minify: true});
const client = `window.__ModuleLoader__.load({id:"dsh-question-notifier",factory(require){const module={exports:{}};const exports=module.exports;\n${result.outputFiles[0].text}\nreturn module.exports;}});\n`;
await mkdir(join(root, 'lib'), {recursive: true});
await writeFile(join(root, 'lib/client.js'), client, 'utf8');
console.log(`Built question notifier: ${Buffer.byteLength(client)} bytes; shared React and UI primitives.`);
