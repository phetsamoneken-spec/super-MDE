// Preview-only deployment branch. Preserve the exact existing production
// artifact and add the approved UI review build under /preview/premium-motion/.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const site=fileURLToPath(new URL('../../preview-site/',import.meta.url));
const destination=fileURLToPath(new URL('../dist/',import.meta.url));
const integrity=JSON.parse(fs.readFileSync(new URL('../../preview-production-integrity.json',import.meta.url),'utf8'));
for(const [relative,expected] of Object.entries(integrity)) {
  const actual=createHash('sha256').update(fs.readFileSync(path.join(site,relative))).digest('hex');
  if(actual!==expected)throw new Error(`Production artifact changed: ${relative}`);
}
fs.rmSync(destination,{recursive:true,force:true});
fs.cpSync(site,destination,{recursive:true});
console.log(`Preserved ${Object.keys(integrity).length} production files byte-for-byte.`);
console.log('Added approved motion preview at /super-MDE/preview/premium-motion/.');
