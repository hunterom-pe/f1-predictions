import { readFileSync } from 'fs';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

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

async function countUsers() {
  const usersSnap = await getDocs(collection(db, "users"));
  console.log(`Total users in DB: ${usersSnap.size}`);
  
  let authUsers = 0;
  let anonUsers = 0;
  usersSnap.forEach(doc => {
    if (doc.data().email) {
      authUsers++;
    } else {
      anonUsers++;
    }
  });
  console.log(`With Email: ${authUsers}`);
  console.log(`Anonymous/No Email: ${anonUsers}`);
  
  process.exit(0);
}

countUsers().catch(console.error);
