// Recheck tracked roles and write the cached snapshot: `npm run check:roles`.
import { writeFileSync } from 'node:fs';
import { checkRoles } from '../server/roles';

const roles = await checkRoles();
for (const r of roles) console.log(`${r.status.padEnd(10)} ${r.title} | ${r.location} | min years ${r.minYearsExperience} | ${r.applyUrl}`);
writeFileSync('src/data/roles.json', JSON.stringify(roles, null, 2) + '\n');
console.log('wrote src/data/roles.json');
