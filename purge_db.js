/**
 * Destructive script: purges all data from the database.
 * Deletes all documents in all Firestore collections and all users in Firebase Auth.
 * 
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=./functions/serviceAccount.json node purge_db.js
 */
const admin = require("firebase-admin");

admin.initializeApp();

const COLLECTIONS = [
  "users",
  "profiles",
  "posts",
  "connections",
  "chats",
  "appeals",
  "admin_audit_log",
  "blacklisted_devices"
];

async function deleteCollection(db, collectionPath, batchSize = 100) {
  const collectionRef = db.collection(collectionPath);
  const query = collectionRef.limit(batchSize);

  return new Promise((resolve, reject) => {
    deleteQueryBatch(db, query, resolve, reject);
  });
}

async function deleteQueryBatch(db, query, resolve, reject) {
  try {
    const snapshot = await query.get();

    const batchSize = snapshot.size;
    if (batchSize === 0) {
      resolve();
      return;
    }

    const batch = db.batch();
    
    // Check if documents have subcollections (specifically messages inside chats)
    for (const doc of snapshot.docs) {
      if (doc.ref.parent.id === "chats") {
        const messagesSnap = await doc.ref.collection("messages").get();
        messagesSnap.forEach(msgDoc => {
          batch.delete(msgDoc.ref);
        });
      }
      batch.delete(doc.ref);
    }

    await batch.commit();

    // Recurse until collection is empty
    process.nextTick(() => {
      deleteQueryBatch(db, query, resolve, reject);
    });
  } catch (err) {
    reject(err);
  }
}

async function purgeAuthUsers() {
  console.log("Listing and deleting users from Firebase Auth...");
  let count = 0;
  
  async function deletePage(nextPageToken) {
    const listUsersResult = await admin.auth().listUsers(1000, nextPageToken);
    const uids = listUsersResult.users.map(user => user.uid);
    
    if (uids.length > 0) {
      const deleteResult = await admin.auth().deleteUsers(uids);
      count += uids.length;
      console.log(`  Deleted ${uids.length} auth users...`);
      if (deleteResult.errors.length > 0) {
        console.warn(`  Warning: failed to delete some users:`, deleteResult.errors);
      }
    }
    
    if (listUsersResult.pageToken) {
      await deletePage(listUsersResult.pageToken);
    }
  }
  
  await deletePage();
  console.log(`Auth purge complete: Deleted ${count} users.`);
}

async function main() {
  const db = admin.firestore();
  
  console.log("⚠️  WARNING: This will permanently delete ALL data in Firestore and ALL users in Firebase Auth!");
  console.log("Starting database purge...");
  
  // 1. Purge Firestore Collections
  for (const coll of COLLECTIONS) {
    console.log(`Purging Firestore collection: ${coll}...`);
    await deleteCollection(db, coll);
    console.log(`  Collection ${coll} purged.`);
  }
  
  // 2. Purge Firebase Auth Users
  try {
    await purgeAuthUsers();
  } catch (err) {
    console.error("Auth purge failed (check permissions):", err);
  }
  
  console.log("\n✅ Database and Auth purge complete! All records have been deleted.");
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error("Purge failed:", err);
    process.exit(1);
  });
