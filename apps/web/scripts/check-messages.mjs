// Verifies the translation catalogs: same keys and list lengths in every locale, every message parses as ICU,
// and a translation never uses a placeholder the code does not pass. Run: node scripts/check-messages.mjs
import {readFileSync} from 'node:fs';
import {IntlMessageFormat} from 'intl-messageformat';

const load=locale=>JSON.parse(readFileSync(new URL(`../messages/${locale}.json`,import.meta.url),'utf8'));
const base='en',locales=['vi'];
const errors=[];

function leaves(node,path='',out=new Map()){
 if(typeof node==='string'){out.set(path,node);return out}
 if(Array.isArray(node)){out.set(`${path}[]`,node.length);node.forEach((item,i)=>leaves(item,`${path}[${i}]`,out));return out}
 for(const [key,value] of Object.entries(node))leaves(value,path?`${path}.${key}`:key,out);
 return out;
}
function args(message,locale,path){
 try{const names=new Set();const walk=els=>{for(const el of els){if(el.value&&typeof el.value==='string'&&el.type!==0)names.add(el.value);if(el.options)for(const o of Object.values(el.options))walk(o.value);if(el.children)walk(el.children)}};walk(new IntlMessageFormat(message,locale).getAst());return names}
 catch(e){errors.push(`${locale} ${path}: does not parse (${e.message})`);return new Set()}
}

const reference=leaves(load(base));
for(const [path,value] of reference)if(typeof value==='string')args(value,base,path);
for(const locale of locales){
 const target=leaves(load(locale));
 for(const [path,value] of reference){
  if(!target.has(path)){errors.push(`${locale} ${path}: missing`);continue}
  const other=target.get(path);
  if(typeof value==='number'&&other!==value)errors.push(`${locale} ${path}: ${other} items, expected ${value}`);
  if(typeof value==='string'){const expected=args(value,base,path);for(const name of args(other,locale,path))if(!expected.has(name))errors.push(`${locale} ${path}: unknown placeholder {${name}}`)}
 }
 for(const path of target.keys())if(!reference.has(path))errors.push(`${locale} ${path}: not in ${base}`);
}
if(errors.length){console.error(errors.join('\n'));process.exit(1)}
console.log(`Messages OK: ${reference.size} entries checked across ${[base,...locales].join(', ')}.`);
