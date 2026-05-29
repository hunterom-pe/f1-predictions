import { readFileSync } from 'fs';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc } from 'firebase/firestore';

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

const VALID_MOODS = [
  "Chillin' 😎", "Excited ⚡", "Crushing 😍", "Mellow 🎧", 
  "Melancholy 🌧️", "Emo 🖤", "Gay 🌈", "Ready to Party 🍹", "Hyper 🤪", 
  "Sassy 💅", "Pissed 😡", "Bored 😑", "Creative 🎨", "Spacey 🚀", 
  "Tired 😴", "Reflective 📖", "Rebellious ✊", "Nostalgic 📼"
];

async function fixMoods() {
  console.log("Fetching users and posts to fix moods...");
  
  // Fix users
  const usersSnap = await getDocs(collection(db, "users"));
  for (const userDoc of usersSnap.docs) {
    const data = userDoc.data();
    if (data.mood && !VALID_MOODS.includes(data.mood)) {
      const randomMood = VALID_MOODS[Math.floor(Math.random() * VALID_MOODS.length)];
      await updateDoc(doc(db, "users", userDoc.id), { mood: randomMood });
      console.log(`Updated user ${data.username}: ${data.mood} -> ${randomMood}`);
    }
  }

  // Fix posts
  const postsSnap = await getDocs(collection(db, "posts"));
  for (const postDoc of postsSnap.docs) {
    const data = postDoc.data();
    if (data.mood && !VALID_MOODS.includes(data.mood)) {
      // Find the user's updated mood, or just give a random one
      const randomMood = VALID_MOODS[Math.floor(Math.random() * VALID_MOODS.length)];
      await updateDoc(doc(db, "posts", postDoc.id), { mood: randomMood });
      console.log(`Updated post by ${data.username}: ${data.mood} -> ${randomMood}`);
    }
  }
  
  console.log("All moods fixed!");
  process.exit(0);
}

fixMoods().catch(console.error);
