// bumps the release number, commits, tags vN and pushes, which starts the CI build
// tauri needs semver so package.json holds 0.0.N while the tag is just vN
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

/** @param {string} command */
const git = (command) => execSync(`git ${command}`, { encoding: 'utf8' }).trim();

if (git('status --porcelain --untracked-files=no')) {
  console.error('commit or stash your changes first');
  process.exit(1);
}

const packagePath = new URL('../package.json', import.meta.url);
const packageText = readFileSync(packagePath, 'utf8');
const currentRelease = Number(JSON.parse(packageText).version.split('.')[2]);
const nextRelease = currentRelease + 1;

writeFileSync(packagePath, packageText.replace(/"version": "[^"]*"/, `"version": "0.0.${nextRelease}"`));

const tag = `v${nextRelease}`;
git('add package.json');
git(`commit -m ${tag}`);
git(`tag -a ${tag} -m ${tag}`);
// -u origin HEAD also works for a branch that hasn't been pushed yet
git('push --follow-tags -u origin HEAD');
console.log(`released ${tag}`);
