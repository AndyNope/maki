# Maki Style

Expo Router + TypeScript, PHP 8.2+ with GD, PDO MySQL, fileinfo, mbstring and optional EXIF. MySQL 8+ or MariaDB 10.6+. No AI service or API key required.

## Structure

```text
app/_layout.tsx            Fonts and wardrobe provider
app/(tabs)/_layout.tsx     Responsive tab navigation
app/(tabs)/index.tsx       Wardrobe, photo upload and camera
app/(tabs)/stylist.tsx     Color-based outfits
app/(tabs)/community.tsx   Local demo feed
app/(tabs)/profile.tsx     Session token and preferences
components/               Shared UI, color picker and camera
lib/                      API client, store and demo color rules
backend/public/           Public PHP endpoints
backend/schema.sql        Fresh database
backend/migrate_colors.sql Existing AI-era database migration
deployment/               Apache configuration
scripts/export-plesk.mjs  Production packaging
```

## Local test

```sh
npm ci
npm run typecheck
php backend/tests/colors.php
node backend/tests/api.mjs
npx expo start --web --port 8081
```

Without a token the wardrobe and color stylist run in demo mode. The community feed, favorites, saved looks and profile preferences are currently session-only, not a production social service. Demo images are external sample photos; their assigned colors are illustrative.

The API integration test requires a running local MariaDB/MySQL and a mysql CLI user allowed to create temporary databases. It creates only a randomly named `maki_test_*` database, tests uploads and migration, then deletes that database. PHP's test PDO user defaults to the OS user; set MAKI_TEST_DB_USER and MAKI_TEST_DB_PASSWORD locally if needed. Do not point this test at a production server.

For a real upload, create a dedicated database and import `backend/schema.sql`. Create `backend/config.local.php` based on `backend/config.example.php`. Use a localhost API URL, `require_https => false` only locally, a random signing key of at least 32 characters, and the exact Expo origin in `allowed_origins`.

```sh
php backend/create_user.php you@example.com 'Your name'
php -S 127.0.0.1:8082 -t backend/public
EXPO_PUBLIC_API_URL=http://127.0.0.1:8082 npx expo start --web --port 8081
```

Enter the generated token in the profile, never in source code or EXPO_PUBLIC variables. A physical phone needs the computer's LAN address instead of localhost. Native apps require an absolute API URL; production must use HTTPS.

## Color behavior

The backend downsizes the image, samples its center (50% width, 60% height), quantizes RGB into buckets and stores the most frequent bucket's mean HEX color. `color_coverage` is the fraction of sampled pixels in that bucket, not a recognition confidence; `brightness` is average weighted pixel intensity. There is no garment or background recognition. Frame one garment tightly in even daylight, avoid colored lighting and strong shadows. Patterns and backgrounds can dominate; choose a manual HEX color when needed.

Very dark samples below 0.08 are rejected unless a manual color is supplied. Black clothing and poor exposure cannot reliably be distinguished from pixel brightness alone. The in-app camera has a central framing guide and a manual flash toggle on native devices. Browsers require HTTPS (or localhost) and camera permission; browser flash control is not guaranteed. Flash is not forced because glare and white balance can distort fabric colors.

Harmonisch favors neighboring hues and neutrals; Kontrastreich favors complementary hues and light/dark contrast; Einfarbig minimizes distance to a chosen color; Gewagt favors saturated, roughly quarter-circle hue differences. The server samples up to 800 combinations and randomly chooses among the highest-scoring candidates, so it does not guarantee the global optimum. Color harmony is a heuristic, not a judgement of taste; fit, weather, material and occasion are not evaluated.

Uploads: max 8 MB, JPEG/PNG/WebP, max 20 MP and 6000 pixels per side; re-encoded JPEG with metadata removed. HEIC must first be converted. Up to 500 garments per user, 30 upload attempts/hour by default. Images use signed links valid for one hour; reload the wardrobe if a link expires.

## Plesk Production

For same-origin hosting at the domain root:

```sh
EXPO_PUBLIC_API_URL=/api npm run export:plesk
```

The export creates two ZIP files (the local `zip` command is required):

- `release/maki-plesk.zip`: extract directly inside your domain's document root (usually `httpdocs`). Its root contains `index.html`, `.htaccess`, `api/`, `_expo/` and `assets/`, with no extra `plesk` or `httpdocs` wrapper.
- `release/maki-private.zip`: extract in the domain directory above `httpdocs`. It contains the private `backend/` directory, directly next to `httpdocs`. Never extract it into the public webroot.

The unpacked reference layout is available at `release/plesk/httpdocs` and `release/plesk/backend`. Config, tokens, photos and node_modules are deliberately excluded. No Node.js server is needed in production. The API also supports the previous sibling `private/backend` layout for compatibility; the new direct `backend` layout takes priority. Do not overwrite an existing server configuration or move stored photos without updating `storage_path`.

1. In Plesk create MySQL/MariaDB database and a least-privileged database user. Import `backend/schema.sql` for a fresh install. For an existing installation, back up first and run `migrate_colors.sql` exactly once instead; old named colors remain untouched and are excluded from outfit generation until the garments are uploaded with HEX colors.
2. Select PHP 8.2+ FPM, enable GD JPEG/PNG/WebP, PDO MySQL, fileinfo and mbstring. Set `upload_max_filesize=8M`, `post_max_size=10M`, `memory_limit=256M`, `max_execution_time=60`. Match nginx's request-body limit to at least 10 MB.
3. Use `backend/config.example.php` to create `backend/config.local.php`: real DB credentials, `public_api_url=https://maki.andynope.com/api`, `allowed_origins=['https://maki.andynope.com']`, `require_https=true`, and a fresh random signing key. Keep `storage_path` outside `httpdocs`. Restrict config permissions to the PHP user (typically 0600); storage directories 0700. Back up DB and uploads together.
4. Issue a Let's Encrypt certificate, redirect HTTP to HTTPS in Plesk. Ensure the PHP-FPM user can read the sibling `backend` and write its storage directory. Plesk `open_basedir` must allow that directory of this subscription.
5. Keep Apache proxy mode enabled. `.htaccess` handles exported `/stylist`, `/community` and `/profile` routes plus Authorization forwarding. If nginx serves static requests directly, add equivalent `try_files $uri $uri.html $uri/ =404;` routing in the existing location through the hosting administrator, or let Apache serve these requests. Do not add a conflicting duplicate nginx location. Headers must allow same-origin camera access.
6. With SSH or a Plesk scheduled task (CLI only), run `php backend/create_user.php you@example.com 'Your name'` from the domain directory. Retrieve the token privately, enter it in the app profile and remove any scheduled task/output afterwards. Without CLI access generate a random token locally, store only its SHA-256 hash in a user row through phpMyAdmin. Never create a public user-provisioning script.
7. Smoke test HTTPS, direct `/stylist` reload, unauthorized `/api/items.php` (401), valid upload, manual black clothing, dark image rejection, every outfit mode and an expired/tampered image link. Confirm the private backend configuration is not reachable over HTTP and that no DB credentials occur in web files.

## GitHub Actions / FTPS

The workflow `.github/workflows/deploy.yml` runs on pushes to `main` and can also be started manually in GitHub Actions. It installs dependencies, checks TypeScript and PHP, runs color tests, tests the API and migration against a disposable MariaDB service, builds the web export, then uploads private PHP files first and webroot files second. FTPS with certificate verification is required; there is no plaintext fallback.

Use the four repository secrets in `AndyNope/maki`:

| Secret | Value |
| --- | --- |
| `FTP_SERVER` | FTP hostname, optionally with a port; do not embed credentials or a path |
| `FTP_USERNAME` | FTP user with write access to both sibling directories |
| `FTP_PASSWORD` | That user's password |
| `FTP_SERVER_DIR` | Absolute FTP-visible path directly to `httpdocs`, e.g. `/maki.andynope.com/httpdocs/` |

The FTP-visible path depends on the account's home directory. If the account starts inside the domain directory, use `/httpdocs/` instead. Do not use the full Linux server path unless that is also the path visible after FTP login. The deployment derives the sibling backend target from this setting, for example `/maki.andynope.com/backend/`. It uploads individual files without deleting remote files; existing `config.local.php`, databases and uploaded photos are not included and are preserved. Old web bundles are not cleaned up automatically.

First install the database and private `backend/config.local.php` using the Plesk steps above. FTP alone cannot create a database, run migrations or provision users. Schema and migration files are uploaded but never executed automatically on production. The final live check requires the website to respond successfully and unauthenticated `/api/items.php` to return 401. That 401 validates configuration loading, not the DB credentials or a full authenticated upload. A 503 fails the workflow and means server setup still needs completion.

Test the uploader without production credentials:

```sh
node --test scripts/deploy-ftp.test.mjs
```

Never put the FTP password or database credentials into this repository. Local `.env*` and `config.local.php` files are ignored; only the placeholder `.env.example` is tracked.

The export is deployable infrastructure for a private beta, not a completed public consumer service: token login has no registration/reset/revocation UI, preferences and likes are not persisted, and community moderation, account deletion, privacy/consent flows and operational monitoring still need implementation before public launch. Test on the actual Plesk host before exposing it publicly. Never use wildcard CORS with tokens.

## iOS / Android Later

Bundle/package identifiers are configured in `app.json`; choose your own final identifiers before store registration. Expo Camera and Image Picker have permission plugins. Native camera/flash must be tested on real devices.

```sh
npx expo start --ios
npx expo start --android
npx eas-cli login
npx eas-cli build:configure
npx eas-cli build --profile preview --platform android
npx eas-cli build --profile production --platform ios
npx eas-cli build --profile production --platform android
```

Configure `EXPO_PUBLIC_API_URL=https://YOUR-DOMAIN/api` in the EAS environment used by each build. `eas.json` prepares preview and production builds; development builds additionally need `expo-dev-client` installed via `npx expo install expo-dev-client`. iOS simulator requires Xcode on macOS, Android emulator requires Android Studio. App Store/Play Store publication requires developer accounts, signing and device validation. `expo export --platform web` exports web assets only, not installable native apps.