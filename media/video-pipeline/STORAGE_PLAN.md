# Storage plan: Google Drive for delivery, iCloud for long-term keeping

ASCLEPIOS-VIDEO-001 · issue #142 · 2026-11-04 · **assessment only: no login test, no authorisation, no files moved**

This continues the earlier iCloud discussion on #142 (comment 6642726352).
The owner's direction is that Google Drive is the delivery and working store,
and the existing 2 TB iCloud plan is the long-term archive. Below, each point is
marked **Tested** (done in this environment), **Documented** (the vendor's or
the tool's own documentation says so, not tried here) or **Unknown**.

## 1. Roles

| Store | Role | Holds |
|---|---|---|
| GitHub (this repo) | source of truth for method | code, project.json, manifests, `ASSET_INDEX.md`, captions, small evidence; never large media |
| Google Drive | working and delivery store | approved source assets, previews, masters, per-video workspace folder |
| iCloud Drive (owner's 2 TB plan, about 1 TB soft target) | long-term archive | final masters, approved sources, rights records, and the manifest for each finished video |
| Rex session scratch | temporary only | caches and renders. It is lost when the session ends, so nothing is kept only here |

## 2. Google Drive: what works now

| Capability | Status | Notes |
|---|---|---|
| Search, list and read metadata | **Tested** | connector `search_files`, `get_file_metadata` |
| Download into a session | **Tested**, with a limit | the connector download is capped at about **10 MB per file**. Larger files had to be uploaded unzipped or split |
| Upload from a session | **Documented** for small files | `create_file` takes the content inline as base64, so it suits text, captions, manifests and images. It is **not usable for a 48 MB master**: that has to be uploaded by the owner, or by a future direct API route |
| Delete or modify existing files | not done, by rule | the owner's standing order is to never modify or delete Drive files without explicit approval |

**Per-video workspace** (owner spec 6630512479): one Drive folder per video, holding:
- `01_script`, `02_sources`, `03_voice`, `04_music`, `05_captions`, `06_visuals`, `07_previews`, `08_master`, `09_qa`
- `manifest.json` (file, version, approval, licence, cost, sha256 and Drive ID)

`ASSET_INDEX.md` is the human-readable form of that manifest.

## 3. iCloud: the options

### A. Owner's Apple devices sync iCloud Drive (official)
- **Documented.** Files placed in iCloud Drive from an iPhone, iPad or Mac Files app, or through iCloud.com in a browser, are Apple's supported routes. Apple supports sharing an iCloud Drive folder with other people, who can edit it from iCloud.com (Apple guides `mm708256356b`, `mm9331af712f`).
- **No official unattended API** exists for iCloud Drive file management. An agent can't be given folder-scoped, revocable access the way Google Drive allows.
- **Fit:** reliable, but it needs a person (or an owner device) to make each copy. The owner has no always-on MacBook.

### B. rclone `iclouddrive` backend (unofficial, automatable)
Read from rclone's own documentation on GitHub (`rclone/rclone` → `docs/content/iclouddrive.md`, master branch; rclone.org is outside this session's allowed network):
- **Documented:** setup uses a **regular Apple Account password plus 2FA** (a trusted-device prompt or SMS). "App-specific passwords are not accepted."
- **Documented:** "The trust token is valid for **30 days**. After which you will have to reauthenticate with `rclone reconnect` or `rclone config`." A person must complete the 2FA each time, so the method is never fully hands-off.
- **Documented:** Advanced Data Protection is supported (current docs) if "Access iCloud Data on the Web" is ON. Apple may ask for approval on a trusted device. Older rclone releases may not support it, so check the version.
- **Documented:** iCloud **Photos** is read-only through rclone. iCloud **Drive** supports read and write.
- **Unknown:** whether a *separately invited* Apple Account can reach the owner's **shared folder** through rclone. The docs don't cover shared folders. Large multi-GB uploads, rate limits and resumable transfers are also not documented, so all of these need a test.
- **Security:** it stores an Apple Account password (obscured, not encrypted) and session cookies in the rclone config. Using the owner's personal Apple Account this way is **not recommended**.

### C. A dedicated Apple Account and a shared folder
- The owner shares one archive folder from their iCloud Drive with a **dedicated Apple Account** created for ASCLEPIOS media.
- Any automation uses only that account, so access can be revoked by un-sharing the folder, and the owner's own credentials are never handed over.
- **Unknown until tested:** whether rclone (option B) can see and write a shared folder from the invited account. If it can't, the dedicated account still works through iCloud.com in a browser (manual).

## 4. Recommendation

1. **Now:** Drive stays the working and delivery store.
   - Rex uploads small files (captions, manifests, QA, contact sheets) by connector.
   - Large masters reach the owner via the session file send or a playable page, and the owner (or an assistant) places them in the Drive workspace.
2. **Archive step (manual, low effort, official):**
   - When a video is approved, the owner copies its `08_master`, `02_sources` and `manifest.json` from Drive into the iCloud archive folder.
   - Use the Files app on iPhone or iPad (Drive and iCloud Drive both appear there), or iCloud.com.
   - About 5 minutes per video, with no credentials shared.
3. **Automation trial (only after owner approval):** test option C with option B.
   - Create a dedicated Apple Account and share the archive folder with it.
   - In one session, configure rclone with that account. The owner enters the 2FA code; Rex never sees the password if the owner types it in an interactive config.
   - Test listing the shared folder, one small upload and one 1 GB upload, then the 30-day `rclone reconnect`.
   - Until that passes, there is no automated iCloud writing.
4. **Soft 1 TB cap:**
   - Keep an `archive_manifest.json` (file, bytes, sha256, video, version, archived date).
   - Before each archive step, sum the bytes and stop at 900 GB (warn) and 1 TB (block).
   - Keep only masters and approved sources in iCloud. Intermediates stay in Drive and are cleaned up under the owner-approved cleanup manifest.
5. **Independent backup:** the final master lives in at least two places (Drive and iCloud), each copy with a matching sha256 recorded in the manifest.

## 5. Re-authentication runbook (if option B is adopted)

| When | Who | Action |
|---|---|---|
| Every ≤ 30 days, or on an auth error | owner (2FA on a trusted device) plus Rex | run `rclone reconnect icloud-archive:`, approve the 2FA prompt, then a `rclone lsd icloud-archive:` check |
| A `Missing PCS cookies` error (ADP) | owner | turn on "Access iCloud Data on the Web", approve the device prompt, then `rclone reconnect` |
| Stale state | Rex | clear `cookies` and `trust_token` in the config, or recreate the remote |
| Revoke access | owner | un-share the archive folder from the dedicated account, or change that account's password |

## 6. Not done (by instruction)

No Apple login, no rclone configuration, no credentials requested, and no files copied or moved to iCloud or Drive.
