/**
 * One-time backfill: create a public `profiles/{uid}` document for every existing
 * `users/{uid}` document.
 *
 * The syncProfile Cloud Function maintains the mirror going forward, but it only
 * fires on *future* writes. Existing users have no profile doc yet, so without this
 * backfill they would render blank (no username/avatar) once the locked-down read
 * rules are deployed. Run this once per project right after deploying.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount.json node backfill_profiles.js [--dry-run]
 *
 * Download a service-account key from:
 *   Firebase Console -> Project Settings -> Service accounts -> Generate new private key
 * (Keep that JSON out of git — functions/.gitignore already covers serviceAccount*.json)
 *
 * ALWAYS run against the development project first (set the credential to the dev
 * service account), verify the app, then run against production.
 *
 * The allowlist below MUST stay in sync with PUBLIC_PROFILE_FIELDS in index.js.
 */
const admin = require("firebase-admin");

admin.initializeApp();

const PUBLIC_PROFILE_FIELDS = [
  "username",
  "mood",
  "bio",
  "headline",
  "profileTheme",
  "emoji_avatar",
  "spotify_track_uri",
  "spotify_song_title",
  "spotify_artist_name",
  "favorited_bars",
  "createdAt",
  "lastLogin",
  "lastActiveAt",
  "isAdmin"
];

const dryRun = process.argv.includes("--dry-run");

async function backfill() {
  const db = admin.firestore();
  const usersSnap = await db.collection("users").get();
  console.log(`Found ${usersSnap.size} user docs. ${dryRun ? "(dry run — no writes)" : ""}`);

  let written = 0;
  let batch = db.batch();
  let batchCount = 0;

  for (const userDoc of usersSnap.docs) {
    const data = userDoc.data();
    const publicData = {};
    for (const field of PUBLIC_PROFILE_FIELDS) {
      if (data[field] !== undefined) publicData[field] = data[field];
    }

    if (dryRun) {
      console.log(`  ${userDoc.id}: ${JSON.stringify(publicData)}`);
      continue;
    }

    batch.set(db.collection("profiles").doc(userDoc.id), publicData);
    batchCount++;
    written++;

    // Firestore batches are capped at 500 operations.
    if (batchCount === 450) {
      await batch.commit();
      batch = db.batch();
      batchCount = 0;
      console.log(`  ...committed ${written} so far`);
    }
  }

  if (!dryRun && batchCount > 0) {
    await batch.commit();
  }

  console.log(dryRun ? "Dry run complete." : `Backfill complete. Wrote ${written} profile docs.`);
}

backfill()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Backfill failed:", err);
    process.exit(1);
  });
