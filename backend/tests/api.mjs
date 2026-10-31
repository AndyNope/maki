import { spawn, spawnSync } from 'node:child_process';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { randomBytes, createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { createServer } from 'node:net';
import assert from 'node:assert/strict';

const database = `maki_test_${randomBytes(6).toString('hex')}`;
const temporary = await mkdtemp(`${tmpdir()}/maki-api-`);
let server;
let created = false;
function mysql(sql) {
  const argumentsList = ['--batch', '--skip-column-names'];
  if (process.env.MAKI_TEST_DB_HOST) argumentsList.push('--host', process.env.MAKI_TEST_DB_HOST);
  if (process.env.MAKI_TEST_DB_USER) argumentsList.push('--user', process.env.MAKI_TEST_DB_USER);
  const result = spawnSync('mysql', argumentsList, { input: sql, encoding: 'utf8', env: { ...process.env, ...(process.env.MAKI_TEST_DB_PASSWORD ? { MYSQL_PWD: process.env.MAKI_TEST_DB_PASSWORD } : {}) } });
  if (result.status !== 0) throw new Error('Local MySQL test connection failed. Configure mysql CLI defaults for a local test administrator.');
  return result.stdout.trim();
}
try {
  mysql(`CREATE DATABASE ${database} CHARACTER SET utf8mb4;`);
  created = true;
  const backend = resolve(import.meta.dirname, '..');
  await cp(backend, `${temporary}/backend`, { recursive: true });
  mysql(`USE ${database};\n${await readFile(`${backend}/schema.sql`, 'utf8')}`);
  const token = randomBytes(32).toString('hex');
  const hash = createHash('sha256').update(token).digest('hex');
  mysql(`INSERT INTO ${database}.users (email, display_name, api_token_hash) VALUES ('test@example.com', 'Test', '${hash}');`);
  const socket = createServer();
  await new Promise(resolveReady => socket.listen(0, '127.0.0.1', resolveReady));
  const port = socket.address().port;
  await new Promise(resolveClosed => socket.close(resolveClosed));
  const base = `http://127.0.0.1:${port}`;
  const config = { db_dsn: `mysql:host=${process.env.MAKI_TEST_DB_HOST || 'localhost'};dbname=${database};charset=utf8mb4`, db_user: process.env.MAKI_TEST_DB_USER || process.env.USER, db_password: process.env.MAKI_TEST_DB_PASSWORD || '', media_signing_key: randomBytes(32).toString('hex'), public_api_url: base, allowed_origins: ['https://test.example'], require_https: false, uploads_per_hour: 30, storage_path: `${temporary}/uploads` };
  const encoded = JSON.stringify(config).replaceAll('\\', '\\\\').replaceAll("'", "\\'");
  await writeFile(`${temporary}/backend/config.local.php`, `<?php return json_decode('${encoded}', true);`);
  server = spawn('php', ['-S', `127.0.0.1:${port}`, '-t', `${temporary}/backend/public`], { stdio: 'ignore' });
  for (let attempt = 0; attempt < 50; attempt++) {
    try { await fetch(`${base}/items.php`); break; } catch {
      if (attempt === 49) throw new Error('PHP test server did not start.');
      await new Promise(resolveRetry => setTimeout(resolveRetry, 100));
    }
  }
  const headers = { Authorization: `Bearer ${token}` };
  assert.equal((await fetch(`${base}/items.php`)).status, 401);
  assert.equal((await fetch(`${base}/items.php`, { headers: { ...headers, Origin: 'https://evil.example' } })).status, 403);
  assert.equal((await fetch(`${base}/items.php`, { method: 'OPTIONS', headers: { Origin: 'https://test.example' } })).status, 204);
  async function upload(category, rgb, color = '') {
    const fixture = `${temporary}/fixture.jpg`;
    const result = spawnSync('php', ['-r', '$image=imagecreatetruecolor(100,100); imagefill($image,0,0,imagecolorallocate($image,(int)$argv[2],(int)$argv[3],(int)$argv[4])); imagejpeg($image,$argv[1],95);', fixture, ...rgb.map(String)]);
    assert.equal(result.status, 0);
    const form = new FormData();
    form.append('category', category);
    form.append('color', color);
    form.append('image', new Blob([await readFile(fixture)], { type: 'image/jpeg' }), 'fixture.jpg');
    const response = await fetch(`${base}/upload_item.php`, { method: 'POST', headers, body: form });
    return { status: response.status, body: await response.json() };
  }
  const red = await upload('Tops', [255, 0, 0]);
  assert.equal(red.status, 201, JSON.stringify(red.body));
  assert.match(red.body.item.color, /^#[A-F0-9]{6}$/);
  assert.equal(red.body.item.color_source, 'pixel');
  assert.ok(red.body.item.color_coverage > 0.9);
  assert.equal((await upload('Bottoms', [0, 255, 255])).status, 201);
  assert.equal((await upload('Schuhe', [220, 220, 220])).status, 201);
  assert.equal((await upload('Tops', [5, 5, 5])).status, 422);
  const manual = await upload('Tops', [5, 5, 5], '#202020');
  assert.equal(manual.status, 201);
  assert.equal(manual.body.item.color_source, 'manual');
  assert.equal((await upload('Invalid', [255, 0, 0])).status, 422);
  assert.equal((await upload('Tops', [255, 0, 0], 'red')).status, 422);
  const list = await (await fetch(`${base}/items.php`, { headers })).json();
  assert.equal(list.items.length, 4);
  for (const mode of ['Harmonisch', 'Kontrastreich', 'Einfarbig', 'Gewagt']) {
    const response = await fetch(`${base}/generate_outfit.php`, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ mode, color: '#FF0000' }) });
    const outfit = await response.json();
    assert.equal(response.status, 200, JSON.stringify(outfit));
    const chosen = outfit.item_ids.map(id => list.items.find(item => item.id === id));
    assert.equal(chosen.length, 3);
    assert.deepEqual(chosen.map(item => item.category), ['Tops', 'Bottoms', 'Schuhe']);
  }
  assert.equal((await fetch(red.body.item.image_url)).headers.get('content-type'), 'image/jpeg');
  const invalidLink = new URL(red.body.item.image_url);
  invalidLink.searchParams.set('signature', 'invalid');
  assert.equal((await fetch(invalidLink)).status, 403);
  assert.equal(mysql(`SELECT COUNT(*) FROM ${database}.wardrobe_items;`), '4');
  mysql(`ALTER TABLE ${database}.wardrobe_items DROP COLUMN color_source, DROP COLUMN color_coverage, DROP COLUMN brightness; ALTER TABLE ${database}.users DROP COLUMN upload_window_started_at, DROP COLUMN upload_requests;`);
  mysql(`USE ${database};\n${await readFile(`${backend}/migrate_colors.sql`, 'utf8')}`);
  assert.equal(mysql(`SELECT COUNT(*) FROM ${database}.wardrobe_items;`), '4');
  assert.equal(mysql(`SELECT COUNT(*) FROM ${database}.wardrobe_items WHERE color_source = 'legacy';`), '4');
  console.log('API integration passed: auth, CORS, real image uploads, dark rejection, manual override, category validation, MySQL persistence, four outfit modes, signed media and non-destructive migration.');
} finally {
  if (server) {
    server.kill();
    await new Promise(resolveExit => server.once('exit', resolveExit));
  }
  if (created) mysql(`DROP DATABASE ${database};`);
  await rm(temporary, { recursive: true, force: true });
}