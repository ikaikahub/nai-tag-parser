// bumps the release number, commits, pushes and starts the CI build, which tags vN once it publishes the release.
// tauri needs semver so package.json holds 0.0.N while the tag is just vN
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

// the account that owns the repo, so releases start from it whichever gh account is active
const GITHUB_ACCOUNT = 'ikaikahub';

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
const branch = git('branch --show-current');
git('add package.json');
git(`commit -m ${tag}`);
// -u origin HEAD also works for a branch that hasn't been pushed yet
git('push -u origin HEAD');

// a run on the branch shares its build cache with every other release, a run on a fresh tag starts from nothing
const token = execSync(`gh auth token --user ${GITHUB_ACCOUNT}`, { encoding: 'utf8' }).trim();
execSync(`gh workflow run build.yml --ref ${branch} -f release_tag=${tag}`, {
  stdio: 'inherit',
  env: { ...process.env, GH_TOKEN: token },
});
console.log(`started the ${tag} build on ${branch}`);
