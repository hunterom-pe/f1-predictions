# Release & App Store Submission Guide

This guide takes **asl / RetroConnect** from the current hardened codebase to a
live production deployment and an App Store submission.

The code changes are done. The remaining steps require your accounts/machine
(Firebase project, Apple Developer account, Xcode) and cannot be automated from
the repo.

---

## 0. What changed (security hardening summary)

These are now in the codebase and are the reason the app is safe to ship:

- **Firestore rules rewritten** (`firestore.rules`): closed the privilege-escalation
  hole that let any user ban/tamper with any other user. Posts are now created
  only via Cloud Function; flag/ban/audit fields are server-only; appeals & the
  audit log are no longer client-readable.
- **Cloud Functions** (`functions/index.js`): `createPostSecure` (moderation +
  home-city + cooldown + daily-limit, server-enforced), `onReportCreated`
  (trust scopes + 3/day throttle), `banOffendingUser`, `onConnectionCreated`
  (proof moderation), `onPostLikeCreated/Deleted` (like counts), and
  `sysopAction` (admin-claim-gated moderation console backend).
- **Gemini key moved server-side.** The client no longer ships an API key; it
  only does an instant local pre-check for UX. The invalid `gemini-3.5-flash`
  model name was replaced with `gemini-2.5-flash`.
- **SysOp access** is now gated by a Firebase **custom claim** (`admin`), not a
  hardcoded UID. See step 4.
- **User blocking** added (App Store UGC requirement) — block/unblock in feed &
  Settings, persisted on the profile.
- **The "BSOD" ban screen** was reframed as the app's own account-suspension
  screen (no longer a simulated OS crash) to satisfy App Review.
- **iOS**: added `PrivacyInfo.xcprivacy`, location usage string, and
  `ITSAppUsesNonExemptEncryption`.
- **Moderation can no longer be bypassed.** Posts and connection proofs are
  created only through Cloud Functions (`createPostSecure`, `createConnectionSecure`),
  and the client no longer silently falls back to a direct Firestore write when a
  function rejects content. The per-day claim throttle is enforced server-side in a
  transaction. Untrusted text is passed to Gemini only as data, not concatenated
  into the prompt (prompt-injection fix).
- **Private/public profile split.** `users/{uid}` is now owner-only; a
  `profiles/{uid}` mirror (maintained by the `syncProfile` Function) exposes only
  non-sensitive fields. Email, device UUID, flag/ban state, and reporter IDs are no
  longer readable by other users. **Requires a one-time backfill — see §3.5.**
- **Foursquare key moved server-side**, proxied through `searchVenuesSecure`
  (same pattern as Gemini). It is no longer shipped in the client bundle.

---

## 1. Prerequisites (you have these)

- [x] Apple Developer Program membership
- [x] Firebase project on the **Blaze** plan (required for Cloud Functions)
- [x] Real Firebase / Gemini / Foursquare API keys
- [ ] A hosted **Privacy Policy URL** and **EULA** — Apple requires both for
      apps with accounts + user-generated content. Host them anywhere public
      (even a GitHub Pages page) before submitting.

Install tooling:

```bash
npm install -g firebase-tools
firebase login
```

---

## 2. Configure environment

```bash
cp .env.example .env.local
# fill in the VITE_FIREBASE_* values
```

Confirm `.env.local` is gitignored (it is) and never commit it.

> **Note:** the Foursquare key is **no longer a client env var** — it's a server
> secret set in step 3 (`FOURSQUARE_API_KEY`). Remove any `VITE_FOURSQUARE_API_KEY`
> from `.env.local`; it is ignored by the client now.

---

## 3. Deploy Firestore rules + Cloud Functions

```bash
# from repo root
firebase use <your-project-id>

cd functions
npm install
cd ..

# Set the API keys as function secrets (NOT client env vars)
firebase functions:secrets:set GEMINI_API_KEY
firebase functions:secrets:set FOURSQUARE_API_KEY
# paste each key when prompted
```

`createPostSecure` already binds this secret (`{ secrets: ["GEMINI_API_KEY"] }`),
so set it **before** deploying. If you don't want AI moderation, the function
falls back to the regex pass — in that case remove `GEMINI_API_KEY` from the
`secrets` array in `functions/index.js` so the deploy doesn't require it.

Then deploy the **functions first** (so the `profiles` mirror starts working
before you lock down the rules — see §3.5 for why ordering matters):

```bash
firebase deploy --only functions
```

Create the composite index if the console asks for one (the report/post
queries are designed to avoid composite indexes, but verify in the console).

---

## 3.5 Public profiles & the privacy split (run after step 3)

`users/{uid}` is now **owner-only**; other users read public fields from the
`profiles/{uid}` mirror, which the `syncProfile` Function maintains automatically.
But `syncProfile` only fires on *future* writes — existing users have no profile
doc yet. If you deploy the locked-down rules before populating `profiles`, every
existing user renders blank (no username/avatar) in the feed, the "cool new
people" list, and connection inboxes.

**So the order is: functions → backfill → rules + client.**

1. Functions are already deployed (step 3).

2. **Backfill existing users → profiles. Dev project first, always.** The script
   uses the Admin SDK (same service-account key as `set_admin.js`) and supports a
   `--dry-run` that prints what each profile will contain without writing:

   ```bash
   cd functions
   # Dev: dry-run, eyeball the output, then write
   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount-dev.json node backfill_profiles.js --dry-run
   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount-dev.json node backfill_profiles.js
   ```

   Smoke-test the **dev** app: profiles open, the new-people list and venue
   "favoriters" show names/avatars, and an accepted connection shows the sender's
   name in the inbox. Confirm a `profiles` doc contains **no** `email`, `uuid`,
   `flag_count`, `banned`, or `reporterIds`. Then run it against production:

   ```bash
   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount-prod.json node backfill_profiles.js
   ```

3. **Now deploy the rules:**

   ```bash
   firebase deploy --only firestore:rules
   ```

   The updated **client** (which reads from `profiles`) ships separately — the web
   bundle in step 6 / hosting, and the iOS build. Just don't ship the new client
   *before* the backfill, or existing users will look blank until it runs.

The `profiles` queries (newest-by-`createdAt`, `lastLogin` window) are single-field
and need no composite index. The allowlist of mirrored fields lives in both
`functions/index.js` (`PUBLIC_PROFILE_FIELDS`) and `backfill_profiles.js` — **keep
them in sync** if you add a public profile field.

---

## 4. Grant yourself SysOp (admin) access

The `/sysop` console now requires the `admin` custom claim.

```bash
cd functions
# Download a service account key:
#   Firebase Console -> Project Settings -> Service accounts -> Generate new private key
# Save it as functions/serviceAccount.json (gitignored)

GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount.json node set_admin.js you@example.com
```

Sign out and back in so your ID token picks up the claim. Then visit `/sysop`.

---

## 5. Seed data (optional)

The `seed_*.js` scripts populate demo users/posts. Run against your project only
if you want demo content. They read `.env.local`. Remember real auth accounts
created by seeds are real — don't ship demo accounts to production unless intended.

---

## 6. Build the web bundle + sync iOS

```bash
npm install
npm run build
npx cap sync ios
npx cap open ios   # opens Xcode
```

---

## 7. Xcode configuration (one-time)

In Xcode (`ios/App/App.xcworkspace` — open the **workspace**, not the project):

1. **Signing & Capabilities** → select your Team; set a unique Bundle ID
   (currently `com.hunterom-pe.asl`).
2. **Add the Privacy Manifest to the build**: drag `App/PrivacyInfo.xcprivacy`
   into the Xcode project navigator and ensure it's in **Target → Build Phases →
   Copy Bundle Resources**. (Capacitor does not add it automatically.)
3. **Push Notifications**: the app depends on `@capacitor/push-notifications`.
   Either add the **Push Notifications** capability (and configure APNs in the
   Apple Developer portal + Firebase Cloud Messaging), **or** remove the plugin
   if you don't ship push for v1:
   ```bash
   npm uninstall @capacitor/push-notifications
   npx cap sync ios
   ```
4. **App Icons**: confirm the alternate icons (MidnightRadar / PinkSilhouette /
   NeonHeart) and the primary AppIcon are all present (they are in the asset
   catalog).
5. Set **Version** (e.g. 1.0.0) and **Build** (e.g. 1).

---

## 8. App Store Connect

1. Create the app record (matching Bundle ID).
2. **App Privacy** questionnaire — mirror `PrivacyInfo.xcprivacy`: you collect
   Email, Precise Location, User Content, and Device ID, all linked to the user,
   for App Functionality, **not** for tracking.
3. **Age rating**: this is a social app with unfiltered user-generated content
   and "missed connections" framing → expect **17+**. Answer the questionnaire
   honestly (mature/suggestive themes, user-generated content).
4. **Content rights / UGC**: provide your EULA + Privacy Policy URLs.
5. Screenshots for required device sizes (6.7" and others).
6. Notes for the reviewer: explain the retro UI; if needed, mention the
   **Reviewer Mode** toggle in Settings → Diagnostics (bypasses city-lock and
   injects demo data) so the reviewer can see content immediately.

---

## 9. App Store Review risk checklist

These are the things most likely to get this app bounced — address before submit:

- **UGC safety (Guideline 1.2)** — REQUIRED and now implemented: content
  moderation, a report mechanism, **user blocking**, and a way to contact you.
  Make sure moderation Functions are actually deployed (step 3), not just in code.
- **Account deletion (Guideline 5.1.1(v))** — present in Settings → Danger Zone.
  Verify it fully deletes the account against your live project.
- **Suspension screen** — the former "BSOD" now reads as an app suspension +
  appeal screen. Don't revert it to a fake OS crash.
- **No fake system UI** — confirm nothing else imitates iOS/Windows system
  alerts in a deceptive way.
- **Push permission** — only prompt with context, or remove the plugin (step 7.3).

---

## 10. Post-launch hardening (recommended, not blocking)

- Enable **Firebase App Check** (DeviceCheck/App Attest on iOS) so only your app
  can call Firestore/Functions — this is the real defense for the client config.
- Add **Crashlytics / logging**.
- Consider **code-splitting** the 760 kB JS bundle (Vite warns about it) with
  dynamic imports for faster cold start.
- Add automated tests around the Cloud Functions moderation/throttle logic.
