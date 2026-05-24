const fs = require('fs');
const path = require('path');
const execSync = require('child_process').execSync;

let hash = 'unknown';
try {
  hash = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
} catch {
  // Not a git repo or git not available — keep 'unknown'
}

const content = `// Auto-generated — DO NOT EDIT MANUALLY
// Updated by prebuild script with the current git commit hash.
export const APP_VERSION = '${hash}';
`;

const filePath = path.join(__dirname, '..', 'src', 'app', 'core', 'version.ts');
fs.writeFileSync(filePath, content);
console.log(`Version set to ${hash}`);
