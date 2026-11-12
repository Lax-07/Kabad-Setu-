# Deploy Kabad Setu to Vercel

The project is prepared for Vercel with a Python API and persistent PostgreSQL storage. You must connect a PostgreSQL database and set the recycler password before deploying. No OpenAI key is required. This work does not create a Vercel project or database account for you.

## Deploy through GitHub

For a clean upload, run `python3 scripts/package_upload.py`. Extract the generated
`kabad-setu-vercel.zip` and upload its **contents** to the root of your GitHub
repository, including hidden configuration files. Do not upload the ZIP itself.
The package excludes local databases, environment secrets, virtual environments,
and generated AI assets. GitHub Actions runs the automated tests on pushes and
pull requests. Vercel downloads the model assets during its build.

1. Create a private GitHub repository and upload this project. Include `api/`, `migrations/`, `scripts/`, `static/` (including `static/audio/`), `server.py`, `database.py`, `requirements.txt`, `.python-version`, `vercel.json`, and the ignore files. Do not upload `.env`, `data/`, `.venv/`, `public/`, `static/models/`, or `static/vendor/`.
2. In Vercel, add a new project and import that repository. Choose **Other** as the framework preset and use the repository root as the root directory. Keep the settings from `vercel.json`: build command `python3 scripts/build_vercel.py`, output directory `public`.
3. Create a PostgreSQL database, for example using a PostgreSQL integration in the Vercel Marketplace. Copy its **pooled PostgreSQL connection URL**, including the provider's TLS settings. Use a new database dedicated to this app. The database user needs permission to create tables and the `evidence` schema.
4. Add these Vercel environment variables before deployment:

   | Variable | Value |
   | --- | --- |
   | `DATABASE_URL` | Your PostgreSQL connection string, usually `postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require` |
   | `RECYCLER_PASSWORD` | A private password of your own choosing; `demo-recycler` is rejected on Vercel |

   `POSTGRES_URL` is accepted if your integration supplies it instead. `DATABASE_URL` takes precedence. Keep credentials in Vercel settings, never frontend JavaScript or GitHub files. Use a separate database for Preview deployments; do not point untrusted previews at production data.
5. Click **Deploy**. The build downloads the pinned browser AI model and runtime; this can take several minutes on the first build. Public assets are served directly from Vercel, outside the Python function.
6. Open the deployed HTTPS URL. The first API request creates the database tables and seeds the three demo recyclers. Later requests reuse the tables. If setup fails, check your connection URL and database permissions, then retry. Database credentials are not printed in public errors.

## Verify your deployment

- Open `/api/bootstrap`: it should return JSON with three recyclers and `ai_mode: "local"`.
- Register with a test phone number, enter the OTP shown in the website notification, and allow location access. Refresh to confirm the profile persists.
- Check Listen in Hindi, Marathi, English, and Kannada.
- Upload a photo, run analysis, review the estimate, and book a pickup.
- Sign into the recycler workspace with the password you set; confirm the pickup notification appears.
- Upload a proof photo with GPS and check the receipt.
- Sign out of the collector account and confirm private collector information is cleared.

GPS and camera access require user permission. Use the deployed HTTPS address. Voice autoplay may require tapping Listen.

## Storage and files

Hosted data is stored in PostgreSQL: collector profiles, sessions, lots, pickups, and notifications use public tables. Transaction proofs use a separate `evidence` schema in the same database, allowing proof creation and pickup completion to commit atomically. This replaces the two local SQLite files in hosted mode; it is logical separation, not a second PostgreSQL database.

Photos are private PostgreSQL `BYTEA` values and remain behind the app's ownership checks. A separate object-storage account is not required for this prototype. The browser accepts photos up to 6 MB, compresses larger images before upload, and the API limits stored photos to 3 MB to fit Vercel request/response limits. Proof hashes identify the uploaded, potentially compressed image. Monitor your database storage as photos accumulate.

Existing local SQLite records are **not migrated automatically**. Your first deployment starts with an empty collector database and the demo recycler directory. Keep local `data/` files private if you need those records later.

The browser AI model is approximately 148 MiB, downloaded once by each browser and cached where supported. It runs in the browser without sending photos to an external AI service. Build downloads are pinned; third-party licenses are listed in `THIRD_PARTY_NOTICES.md`. Heavy model downloads consume hosting bandwidth.

## Local development and tests

`python3 server.py` still runs the standard-library SQLite version when `DATABASE_URL` and `POSTGRES_URL` are unset. The app does not load `.env` automatically: export variables in your shell for local PostgreSQL use. Vercel injects its configured environment variables automatically.

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
python3 scripts/build_vercel.py
python3 -m unittest discover -s tests -v
python3 tests/browser_smoke.py
```

To exercise real PostgreSQL transactions, install the requirements, export `KABAD_TEST_POSTGRES_URL` pointing to a dedicated test database, and run `.venv/bin/python -m unittest discover -s tests -p test_postgres.py -v`. This creates the app schema and demo recyclers there, then checks generated IDs, private binary photos, cross-schema joins, duplicate protection, and transaction rollback. Leave this variable unset for ordinary SQLite tests.

`api/handler.py` is the Vercel entrypoint. `vercel.json` routes `/api/*` to it; all public pages, models, runtime files and audio come from the generated `public/` directory. The function excludes static assets and local databases. Do not upload `public/` or generated model files with the CLI; let the remote build generate them.

This remains a demonstration marketplace: recycler entries are fictional, notifications are in-app only, and collector phone sign-in/account recovery is not implemented. The in-site OTP demonstrates the registration workflow; it does not prove phone ownership or provide government identity verification.

Platform references: [Python API handlers](https://vercel.com/docs/functions/runtimes/python/api-directory), [Vercel configuration](https://vercel.com/docs/project-configuration/vercel-json), [request size limits](https://vercel.com/kb/guide/how-to-bypass-vercel-body-size-limit-serverless-functions), [SQLite and persistent storage](https://vercel.com/kb/guide/is-sqlite-supported-in-vercel).

The automated suite includes deployment boundary checks and local API workflows.
Live PostgreSQL checks require `KABAD_TEST_POSTGRES_URL`; a successful local test
run does not verify a hosted database connection or an actual Vercel deployment.

## Demo roles

Use **Switch role** in the top bar. User mode exposes collector features and blocks recycler APIs. Recycler mode requires the workspace password, selects one recycler, and shows only its assigned pickups, notifications and evidence. Admin preserves the full existing website; it does not bypass individual record ownership checks.

Admin entry uses `ADMIN_PASSWORD` when configured, otherwise the existing `RECYCLER_PASSWORD`. Local default: `demo-recycler`. Set `ADMIN_PASSWORD` separately in Vercel if the admin password should differ. Roles are stored in server sessions, and cannot be elevated by changing a URL or local storage. Choosing User revokes the prior role session. Collector accounts remain saved when switching roles.

For simultaneous roleplay, use separate browser profiles or an incognito window; tabs in the same browser profile share the active role. This is a password-protected demo role system, not individual staff account management.

Recycler profiles include editable accepted scrap categories, address, GPS coordinates, and operating timings. Existing PostgreSQL deployments add the `operating_hours` column automatically on the first API request after redeployment.
