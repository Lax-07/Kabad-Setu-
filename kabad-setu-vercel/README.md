# Kabad Setu

A responsive local prototype focused on e-waste, connecting waste collectors with recyclers. Local development uses Python’s standard library and two SQLite databases without extra packages. Vercel deployment uses PostgreSQL through psycopg.

## Vercel deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for the Vercel setup. The hosted version uses PostgreSQL, serves public AI/audio assets separately, and requires `DATABASE_URL` and a private `RECYCLER_PASSWORD`. Local SQLite development still works.

## Run

```sh
python3 server.py
```

Open **http://localhost:8000**. The server binds to loopback only. Set `PORT` to use another port.

## Try the full flow

1. Select **Sell your waste** and create a collector profile. Use test details such as `Ramesh Kumar`, `9876543210` and a fictional address. The fresh demo OTP appears in an in-site notification; enter it to continue.
2. Choose **Voice language** (Hindi, Marathi, English or Kannada), then tap **Listen** for speech guidance. Location detection starts automatically when registration or the location editor opens. Allow the browser’s location prompt; if high-accuracy detection fails, it retries with standard accuracy. Enable browser permission and device Location Services if blocked. GPS ranks demo recyclers by straight-line distance; address-only registration also works. After registration, use **Edit pickup location** on your profile, sell page or recycler page (or the home location button) to change your address, capture GPS again, enter coordinates manually, or clear GPS. Saving refreshes nearby recyclers. New bookings use the new location; existing bookings retain their address and coordinates from booking time.
3. Upload an electronics photo and select **Analyse my photo**. The bundled local model suggests visible objects and e-waste subcategories. Review every category and replace reference weight assumptions with measured weights where possible. Manual entry remains available.
4. Choose a compatible recycler (EcoCircuit Recovery accepts e-waste in the demo), a date from tomorrow to 30 days ahead, and a time slot. Booking creates a persistent in-app notification.
5. Open **Recycler workspace** (on mobile, navigate to `/#recycler`), select the booked recycler, and sign in with `demo-recycler` unless `RECYCLER_PASSWORD` was set.
6. Complete the pickup by uploading a fresh collection photo and granting GPS permission. The server records the proof in the separate transaction database and atomically marks the pickup complete., 
7. View the collection receipt from either workspace.

Collector and recycler sessions are separate, HttpOnly, SameSite cookies, so both roles can be demonstrated in the same browser. Sessions expire after 7 days. Account recovery and phone sign-in are not implemented; keep the collector's original browser session.

## Photo analysis — no API key required

The default analyser uses the public [OWL-ViT model](https://huggingface.co/Xenova/owlvit-base-patch32) with [Transformers.js zero-shot object detection](https://huggingface.co/docs/transformers.js/v2.17.2/en/api/pipelines#module_pipelines.ZeroShotObjectDetectionPipeline). Its pinned, quantized model and WebAssembly runtime are stored locally under `static/models/` and `static/vendor/` (approximately 180 MB). The photo is analysed in a browser worker; it is not sent to an external AI provider. After analysis, the photo and editable result are saved to this app's SQL database.

The assets are already installed in this workspace. For a fresh checkout:

```sh
python3 scripts/setup_local_ai.py
python3 server.py
```

The setup script uses `curl` with TLS validation, pins the model revision, verifies its SHA-256, and downloads the versioned JavaScript/WASM runtime. Python's standard library is still sufficient for the server. No Python ML packages, Node, account or API key are required. First use loads the model into the browser and can take a minute. Subsequent analyses reuse the worker. Cancel stops the worker, and failures leave manual entry available. Chrome desktop is covered by the real-model browser test; small/mobile devices can take longer or lack enough memory.

Detection identifies candidate objects, applies a score threshold, and removes overlapping duplicate detections. It can miss items or misclassify backgrounds. It does **not** determine actual weight, material grade or resale value. Initial weights are explicitly labelled reference assumptions per detected item; review and edit them. Illustrative prices are recalculated on the server. Unrelated images are not given fabricated sample rows.

An optional legacy OpenAI path is retained when local assets are absent and `OPENAI_API_KEY` is exported in the server environment (`OPENAI_VISION_MODEL` defaults to `gpt-4.1-mini`). It uses the [Responses image-input API](https://developers.openai.com/api/docs/guides/images-vision) and requires explicit photo-sharing consent. This installation uses local analysis instead.

## English and Hindi

The language button changes the complete interface through `static/i18n.js`: navigation, page copy, dialogs, placeholders, material/category labels, error messages, notifications and receipts. Open dialogs have their own language button. The selection is saved in browser local storage and switching does not rebuild forms or discard input, uploads or active estimates. Automatic item descriptions are stored under a canonical `name_key`, displayed in the selected language, and switch immediately even if analysis started in Hindi. Typing a custom description clears the automatic label marker so language changes preserve your edits. User-entered data and organisation names are preserved. The separate voice selector supports Hindi, Marathi, English and Kannada, with its preference saved independently.

## Data

Created automatically under `data/` (override with `KABAD_DATA_DIR`):

- `marketplace.sqlite3`: collector profiles, hashed session tokens, fictional recycler listings, waste photos, estimates, bookings (including a snapshot of their pickup address and coordinates), and in-app notifications.
- `transactions.sqlite3`: pickup photos, SHA-256 hashes, server receipt timestamps (UTC), client photo selection timestamps, coordinates, reported GPS accuracy, and pickup/recycler references.

The databases are attached for a single SQLite transaction when completing a pickup. Duplicate bookings and duplicate proofs are prevented with unique constraints. Photos are private API resources, scoped to their collector and assigned recycler. SQL uses bound parameters. The server does not expose database files or log personal request content.

## Prototype boundaries

- Recycler listings and prices are explicitly fictional/illustrative. This is not a verified directory of authorised recyclers. Replace seed records and implement licence review before actual operations.
- Voice guidance uses bundled synthesized Hindi, Marathi, English and Kannada audio, not a conversational AI agent. It does not require an API key or installed browser voices. Browsers may block initial autoplay; tap **सुनें · Listen** to start. Registration plays one prompt per step with Stop and Replay controls and a visible playback status. The complete interface can switch between English and Hindi; the voice guide has a separate language selector.
- Registration does not ask for Aadhaar, Voter ID, or another identity document. A fresh OTP appears in an in-site notification, expires after 10 minutes, permits five verification attempts, and produces a one-time registration token. This demo confirms the registration flow but does not prove ownership of the entered phone number.
- Notifications are stored in the app and polled every 15 seconds in the recycler workspace. SMS, WhatsApp, email and external push are not connected.
- Capture controls use the mobile camera where supported and the file picker on desktop. Timestamp and GPS are browser-reported, not tamper-proof evidence. Server receipt time and photo hash provide a record, not independent proof of handover. GPS is mandatory for completion; no coordinates are fabricated.
- Pickup slots are labelled in India time. The local server uses its system calendar for booking-date validation; run it in Asia/Kolkata.
- Payment settlement, cancellation, collector account recovery, and per-user recycler accounts remain to be implemented. Vercel deployment configuration is included. The recycler workspace has a shared demo password; do not expose this development server publicly.
- For production, replace the standard-library HTTP server with a production application stack, use HTTPS and secure cookies, add rate limiting, authenticated onboarding/recovery, audited authorisation workflows, encryption and a retention policy for personal data, managed image storage, operational monitoring and backups.

## Tests

```sh
python3 -m unittest discover -s tests -v
```

Tests run a real HTTP server against temporary databases and cover OTP registration and replay protection, GPS sorting, server-authoritative pricing, e-waste subcategory validation/persistence and recycler compatibility, booking and notification creation, access control, duplicate protection, proof completion, invalid inputs, unconfigured AI, and non-silent audio delivery with byte ranges. They never contact an AI or SMS service or modify the app's data directory.

An optional full browser test uses an installed macOS Google Chrome, starts isolated temporary app data on port 8765, and checks actual Hindi media playback with browser speech synthesis disabled, stop/replay, prompts across registration steps, e-waste booking through pickup receipt, and desktop/mobile overflow, plus language persistence and translated forms:

```sh
python3 tests/browser_smoke.py
```

For the real local-model check, place a laptop test photo at `/tmp/kabad-test-laptop.jpg` and run `python3 tests/browser_smoke.py --local-ai`. This also verifies that a blank image returns no detections. The test uses an isolated browser and temporary databases, never collector data.

It saves review screenshots to `/tmp/kabad-desktop.png` and `/tmp/kabad-mobile.png` and removes its test databases and browser profile.

## Hindi audio assets

Six prebuilt WAV prompts per supported voice language live in `static/audio/`, with transcripts in the matching JSON files. The server supports audio byte-range requests and allows same-origin audio in its content-security policy. Playback uses a single audio element, starts directly from the Listen action, and handles rejected playback without falsely showing “Playing.” Initial autoplay remains subject to [browser playback permissions](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/play).

To regenerate these fixed prompts on macOS with the installed Lekha Hindi voice, run `python3 scripts/generate_voice.py`. Regeneration checks duration and non-silent samples. The application itself runs with the bundled files on any supported Python system; macOS and `say` are only needed to regenerate them.

E-waste items keep `category: "E-waste"` plus a validated `subcategory` in their saved JSON. Existing e-waste rows without a subtype are treated as `Mixed e-waste`. Subcategory-specific prices are recalculated on the server. The optional cloud image-analysis prompt also requests these subcategories and avoids double-counting intact devices and their components. All rates are illustrative scrap prices per kilogram, not working-device resale prices.

The location-edit API is `POST /api/profile/location` with `address`, `lat`, and `lng`; both coordinates can be `null` for address-only mode. It uses the authenticated collector session and cannot select another collector by ID. Startup migrates older booking rows to location snapshots before profile editing is enabled.

Additional voice assets can be regenerated using `python3 scripts/add_voice_languages.py` on macOS. English uses Rishi, Kannada uses Soumya, and Marathi text uses the available Lekha Devanagari voice, so its accent may differ from a native Marathi voice.

Collectors can open their profile and choose **Sign out of collector account**. This revokes the collector session and clears local collection data without signing the recycler out. Stored bookings remain in the database. Phone sign-in and account recovery are still unavailable in this prototype, as stated beside the sign-out button.

## Demo roles

Use **Switch role** in the top bar. User mode exposes collector features and blocks recycler APIs. Recycler mode requires the workspace password, selects one recycler, and shows only its assigned pickups, notifications and evidence. Admin preserves the full existing website; it does not bypass individual record ownership checks.

Admin entry uses `ADMIN_PASSWORD` when configured, otherwise the existing `RECYCLER_PASSWORD`. Local default: `demo-recycler`. Set `ADMIN_PASSWORD` separately in Vercel if the admin password should differ. Roles are stored in server sessions, and cannot be elevated by changing a URL or local storage. Choosing User revokes the prior role session. Collector accounts remain saved when switching roles.

For simultaneous roleplay, use separate browser profiles or an incognito window; tabs in the same browser profile share the active role. This is a password-protected demo role system, not individual staff account management.

In Recycler mode, **Edit recycler profile** lets the signed-in recycler choose accepted scrap categories, update its address and GPS coordinates, and set operating timings. These settings appear to collectors and immediately control compatibility for future bookings. A recycler can update only its own profile; existing pickup assignments are preserved.
