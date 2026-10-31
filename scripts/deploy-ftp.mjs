import { Client } from 'basic-ftp';
import { readdir } from 'node:fs/promises';
import { posix, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const backendFiles = new Set(['bootstrap.php', 'colors.php', 'config.example.php', 'create_user.php', 'schema.sql', 'migrate_colors.sql']);

export function deploymentTargets(directory, home = '/') {
  if (typeof directory !== 'string' || directory === '' || /[\\\r\n\0]/.test(directory) || directory.split('/').includes('..')) {
    throw new Error('FTP_SERVER_DIR must be a path to httpdocs without parent traversal.');
  }
  const web = posix.resolve(home, directory).replace(/\/$/, '');
  if (posix.basename(web) !== 'httpdocs') throw new Error('FTP_SERVER_DIR must point directly to httpdocs, not the domain directory.');
  return { web, backend: posix.join(posix.dirname(web), 'backend') };
}

export function ftpConnection(environment) {
  for (const name of ['FTP_SERVER', 'FTP_USERNAME', 'FTP_PASSWORD', 'FTP_SERVER_DIR']) {
    if (!environment[name]) throw new Error(`Missing GitHub secret: ${name}`);
  }
  const server = new URL(environment.FTP_SERVER.includes('://') ? environment.FTP_SERVER : `ftps://${environment.FTP_SERVER}`);
  if (!['ftp:', 'ftps:'].includes(server.protocol) || !server.hostname || server.username || server.password || !['', '/'].includes(server.pathname) || server.search || server.hash) {
    throw new Error('FTP_SERVER must contain only the FTP hostname and optional port.');
  }
  return { host: server.hostname, port: Number(server.port || 21), user: environment.FTP_USERNAME, password: environment.FTP_PASSWORD, secure: server.port === '990' ? 'implicit' : true };
}

export async function deploymentPlan(root, directory, home = '/') {
  const targets = deploymentTargets(directory, home);
  const plan = [];
  async function collect(local, remote, group, relative = '') {
    const entries = await readdir(local, { withFileTypes: true });
    for (const entry of entries.sort((first, second) => first.name.localeCompare(second.name))) {
      const name = posix.join(relative, entry.name);
      if (entry.isSymbolicLink()) throw new Error('Deployment artifacts must not contain symbolic links.');
      if (/^(backend|private|storage|uploads)(\/|$)/.test(name) && group === 'web') throw new Error('Private content found in web artifacts.');
      if (entry.name === 'config.local.php' || entry.name === '.env' || entry.name.startsWith('.env.') || entry.name === '.git') throw new Error('Runtime configuration must never be deployed from CI.');
      if (group === 'backend' && !backendFiles.has(name)) throw new Error('Unexpected private backend artifact.');
      if (entry.isDirectory()) await collect(resolve(local, entry.name), posix.join(remote, entry.name), group, name);
      else if (entry.isFile()) plan.push({ local: resolve(local, entry.name), remote: posix.join(remote, entry.name), group });
    }
  }
  await collect(resolve(root, 'backend'), targets.backend, 'backend');
  await collect(resolve(root, 'httpdocs'), targets.web, 'web');
  for (const required of [posix.join(targets.backend, 'bootstrap.php'), posix.join(targets.web, 'index.html'), posix.join(targets.web, '.htaccess'), posix.join(targets.web, 'api/_bootstrap.php')]) {
    if (!plan.some(file => file.remote === required)) throw new Error('Deployment export is incomplete.');
  }
  return plan;
}

export async function uploadPlan(client, plan) {
  for (const file of plan) {
    await client.ensureDir(posix.dirname(file.remote));
    await client.uploadFrom(file.local, posix.basename(file.remote));
  }
}

async function deploy() {
  let connection;
  let plan;
  try {
    connection = ftpConnection(process.env);
    plan = await deploymentPlan(resolve(import.meta.dirname, '../release/plesk'), process.env.FTP_SERVER_DIR);
  } catch (error) {
    console.error(`Deployment configuration check failed: ${error instanceof Error ? error.message : 'Invalid deployment configuration.'}`);
    process.exitCode = 1;
    return;
  }
  const client = new Client(60000);
  client.ftp.verbose = false;
  let phase = 'connection';
  try {
    await client.access(connection);
    if (!process.env.FTP_SERVER_DIR.startsWith('/')) {
      plan = await deploymentPlan(resolve(import.meta.dirname, '../release/plesk'), process.env.FTP_SERVER_DIR, await client.pwd());
    }
    phase = 'upload';
    await uploadPlan(client, plan);
    console.log(`FTPS deployment completed: ${plan.length} files uploaded. No remote files deleted.`);
  } catch (error) {
    const code = error && /^[A-Z0-9_]+$/.test(String(error.code)) ? String(error.code) : 'unknown';
    console.error(`FTPS ${phase} failed (code: ${code}). Check TLS/FTP credentials and write access to httpdocs and its sibling backend.`);
    process.exitCode = 1;
  } finally {
    client.close();
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  deploy().catch(() => {
    console.error('FTPS deployment failed. Check all four secrets, the httpdocs target, TLS certificate, and write access to the sibling backend directory.');
    process.exitCode = 1;
  });
}