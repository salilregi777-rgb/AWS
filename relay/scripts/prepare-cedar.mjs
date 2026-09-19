import { copyFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const base=new URL('../',import.meta.url);
mkdirSync(fileURLToPath(new URL('public/cedar/',base)),{recursive:true});
copyFileSync(fileURLToPath(new URL('node_modules/@cedar-policy/cedar-wasm/web/cedar_wasm_bg.wasm',base)),fileURLToPath(new URL('public/cedar/cedar_wasm_bg.wasm',base)));
console.log('Prepared the local AWS Cedar WebAssembly engine.');
