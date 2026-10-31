import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { deploymentTargets, ftpConnection, deploymentPlan, uploadPlan } from './deploy-ftp.mjs';

test('httpdocs and backend are siblings and unsafe target paths fail', () => {
  assert.deepEqual(deploymentTargets('/maki.andynope.com/httpdocs/'), { web: '/maki.andynope.com/httpdocs', backend: '/maki.andynope.com/backend' });
  assert.deepEqual(deploymentTargets('/httpdocs/'), { web: '/httpdocs', backend: '/backend' });
  assert.deepEqual(deploymentTargets('maki.andynope.com/httpdocs/', '/account'), { web: '/account/maki.andynope.com/httpdocs', backend: '/account/maki.andynope.com/backend' });
  assert.deepEqual(deploymentTargets('./httpdocs/', '/account/domain'), { web: '/account/domain/httpdocs', backend: '/account/domain/backend' });
  for (const path of ['', '/', '/maki.andynope.com/', '/maki/../httpdocs', '/maki\\httpdocs']) assert.throws(() => deploymentTargets(path));
});

test('FTP uses certificate-verified TLS and credentials stay out of server URLs', () => {
  const environment = { FTP_SERVER: 'ftp.example.com', FTP_USERNAME: 'test', FTP_PASSWORD: 'test-only', FTP_SERVER_DIR: '/httpdocs' };
  assert.equal(ftpConnection(environment).secure, true);
  assert.equal(ftpConnection({ ...environment, FTP_SERVER: 'ftps://ftp.example.com:990' }).secure, 'implicit');
  assert.throws(() => ftpConnection({ ...environment, FTP_PASSWORD: '' }));
  assert.throws(() => ftpConnection({ ...environment, FTP_SERVER: 'ftps://user:password@ftp.example.com' }));
});

test('CLI reports invalid target without exposing credentials or connecting', () => {
  const result = spawnSync(process.execPath, [resolve(import.meta.dirname, 'deploy-ftp.mjs')], { encoding: 'utf8', env: { ...process.env, FTP_SERVER: 'ftp.example.com', FTP_USERNAME: 'fixture-user', FTP_PASSWORD: 'fixture-secret', FTP_SERVER_DIR: '/wrong-target/' } });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /FTP_SERVER_DIR must point directly to httpdocs/);
  for (const value of ['fixture-secret', 'fixture-user', 'ftp.example.com', '/wrong-target/']) assert.ok(!result.stderr.includes(value));
});

test('upload plan puts backend first, preserves runtime files and never deletes remotely', async () => {
  const root = await mkdtemp(resolve(tmpdir(), 'maki-deploy-'));
  try {
    await mkdir(resolve(root, 'httpdocs/api'), { recursive: true });
    await mkdir(resolve(root, 'backend'));
    for (const file of ['httpdocs/index.html', 'httpdocs/.htaccess', 'httpdocs/api/_bootstrap.php', 'backend/bootstrap.php']) await writeFile(resolve(root, file), 'fixture');
    const plan = await deploymentPlan(root, '/maki.andynope.com/httpdocs/');
    assert.equal(plan[0].group, 'backend');
    assert.ok(plan.every(file => !file.remote.includes('/httpdocs/backend/')));
    const operations = [];
    await uploadPlan({ ensureDir: async directory => operations.push(['directory', directory]), uploadFrom: async (local, remote) => operations.push(['upload', remote]) }, plan);
    assert.equal(operations.length, plan.length * 2);
    await writeFile(resolve(root, 'backend/config.local.php'), 'fixture');
    await assert.rejects(deploymentPlan(root, '/httpdocs'));
    await rm(resolve(root, 'backend/config.local.php'));
    await mkdir(resolve(root, 'httpdocs/private'));
    await assert.rejects(deploymentPlan(root, '/httpdocs'));
  } finally { await rm(root, { recursive: true, force: true }); }
});