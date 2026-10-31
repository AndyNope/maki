import { cp, mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const release = resolve(root, 'release/plesk');
await rm(release, { recursive: true, force: true });
await mkdir(`${release}/backend`, { recursive: true });
await cp(`${root}/dist`, `${release}/httpdocs`, { recursive: true });
await cp(`${root}/backend/public`, `${release}/httpdocs/api`, { recursive: true });
for (const name of ['bootstrap.php', 'colors.php', 'config.example.php', 'create_user.php', 'schema.sql', 'migrate_colors.sql']) {
  await cp(`${root}/backend/${name}`, `${release}/backend/${name}`);
}
await cp(`${root}/deployment/web.htaccess`, `${release}/httpdocs/.htaccess`);
await cp(`${root}/deployment/api.htaccess`, `${release}/httpdocs/api/.htaccess`);
await cp(`${root}/README.md`, `${release}/README.md`);
for (const [directory, archive, entry] of [['httpdocs', 'maki-plesk.zip', '.'], ['.', 'maki-private.zip', 'backend']]) {
  const destination = resolve(root, 'release', archive);
  await rm(destination, { force: true });
  const result = spawnSync('zip', ['-qr', destination, entry, '-x', '.DS_Store', '*/.DS_Store'], { cwd: `${release}/${directory}`, stdio: 'inherit' });
  if (result.error || result.status !== 0) throw new Error('ZIP export failed. Install the zip command and rerun the export.');
}
console.log('Webroot: release/maki-plesk.zip (index.html at archive root).');
console.log('Private backend: release/maki-private.zip (extract into the domain directory above httpdocs; contains backend/).');