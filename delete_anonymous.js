import { readFileSync } from 'fs';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore';

const envFile = readFileSync('.env.local', 'utf-8');
const envVars = {};
envFile.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    envVars[key.trim()] = valueParts.join('=').trim();
  }
});

const firebaseConfig = {
  apiKey: envVars.VITE_FIREBASE_API_KEY,
  authDomain: envVars.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: envVars.VITE_FIREBASE_PROJECT_ID,
  storageBucket: envVars.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: envVars.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: envVars.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function deleteAnonUsers() {
  console.log("Fetching users to delete anonymous profiles...");
  const usersSnap = await getDocs(collection(db, "users"));
  
  let deletedCount = 0;
  for (const userDoc of usersSnap.docs) {
    const data = userDoc.data();
    if (!data.email) {
      console.log(`Deleting anonymous user: ${userDoc.id}`);
      await deleteDoc(doc(db, "users", userDoc.id));
      deletedCount++;
    }
  }

  console.log(`Successfully deleted ${deletedCount} anonymous users.`);
  process.exit(0);
}

deleteAnonUsers().catch(console.error);
