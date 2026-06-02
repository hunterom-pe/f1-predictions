import { readFileSync } from 'fs';
import admin from 'firebase-admin';

// Read config
const envFile = readFileSync('.env.local', 'utf-8');
const envVars = {};
envFile.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    envVars[key.trim()] = valueParts.join('=').trim();
  }
});

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: envVars.VITE_FIREBASE_PROJECT_ID
  });
}
const db = admin.firestore();

const PHOENIX_BARS_ONLY = [
  { id: "venue_cobra", name: "Cobra Arcade Bar", city: "Phoenix", address: "801 N 2nd St, Phoenix, AZ 85004", zone: "Downtown" },
  { id: "venue_valley", name: "Valley Bar", city: "Phoenix", address: "130 N Central Ave, Phoenix, AZ 85004", zone: "Downtown" },
  { id: "venue_gracies", name: "Gracies Tax Bar", city: "Phoenix", address: "711 N 7th Ave, Phoenix, AZ 85007", zone: "Downtown" },
  { id: "venue_linger", name: "Linger Longer Lounge", city: "Phoenix", address: "6522 N 16th St, Phoenix, AZ 85016", zone: "Downtown" },
  { id: "venue_theodore", name: "The Theodore", city: "Phoenix", address: "110 E Roosevelt St, Phoenix, AZ 85004", zone: "Downtown" },
  { id: "venue_thunderbird", name: "Thunderbird Lounge", city: "Phoenix", address: "710 W Montecito Ave, Phoenix, AZ 85013", zone: "Midtown" }
];

const MOCK_USERS = [
  { username: "AlexP", mood: "Chillin' 😎", bio: "Just moved to PHX. Love arcade games.", emoji_avatar: "👾", theme: "classic" },
  { username: "Sarah_Smiles", mood: "Happy 😊", bio: "Coffee by day, cocktails by night.", emoji_avatar: "🍸", theme: "sunset" },
  { username: "NeonNights", mood: "Vibing ✨", bio: "Synthwave enthusiast.", emoji_avatar: "🌌", theme: "cyberpunk" },
  { username: "DesertDog", mood: "Thirsty 🌵", bio: "Always looking for a good dive bar.", emoji_avatar: "🐕", theme: "classic" },
  { username: "MusicLover99", mood: "Rock on 🎸", bio: "Live music is my therapy.", emoji_avatar: "🎧", theme: "glitter" },
  { username: "PHX_Foodie", mood: "Hungry 🍕", bio: "Eating my way through the Valley.", emoji_avatar: "🌮", theme: "classic" },
  { username: "NightOwl", mood: "Tired 🦉", bio: "Up all night. Sleep all day.", emoji_avatar: "🌙", theme: "goth" },
  { username: "RetroGamer", mood: "Focused 🎮", bio: "Beating high scores since '95.", emoji_avatar: "🕹️", theme: "gameboy" },
  { username: "LocalLegend", mood: "Confident 😎", bio: "I know all the bartenders.", emoji_avatar: "👑", theme: "glitter" },
  { username: "CactusFlower", mood: "Blooming 🌸", bio: "Cactus enthusiast.", emoji_avatar: "🌵", theme: "sunset" },
  { username: "UrbanExplorer", mood: "Curious 🗺️", bio: "Finding hidden gems.", emoji_avatar: "🕵️", theme: "classic" },
  { username: "VinylCollector", mood: "Groovy 🎶", bio: "Records only. No Spotify.", emoji_avatar: "📻", theme: "classic" },
  { username: "ArtSnob", mood: "Cultured 🎨", bio: "First Fridays regular.", emoji_avatar: "🖼️", theme: "cyberpunk" },
  { username: "CocktailKing", mood: "Mixologist 🥃", bio: "I judge your drink orders.", emoji_avatar: "🍹", theme: "classic" },
  { username: "DowntownDweller", mood: "Busy 🏙️", bio: "Walking everywhere.", emoji_avatar: "🚶", theme: "classic" }
];

const MOCK_POSTS = [
  "You were playing Galaga and I couldn't stop watching. Next round is on me?",
  "We locked eyes across the room while the band was playing. You had a red beanie.",
  "You bought my drink because the bartender messed up the tab. I owe you one!",
  "To the girl in the vintage denim jacket: your laugh is contagious.",
  "You were reading a book at the bar. Who does that? I loved it.",
  "We talked about our favorite 80s movies for 20 minutes then you vanished.",
  "You spilled your drink on my shoes but apologized so sweetly I couldn't be mad.",
  "You requested 'Tainted Love' on the jukebox. Good taste.",
  "I was too shy to say hi, but you have the most amazing smile.",
  "You were talking about your dog the whole time. I want to meet your dog."
];

function getRandomBars(min, max) {
  const shuffled = [...PHOENIX_BARS_ONLY].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.floor(Math.random() * (max - min + 1)) + min);
}

async function seedAuth() {
  console.log('Starting auth seed process...');
  
  const createdUsers = [];

  for (let i = 0; i < 15; i++) {
    const userData = MOCK_USERS[i];
    const email = `${userData.username.toLowerCase()}@asl.com`;
    const password = `password${i}123!`;
    
    try {
      let uid;
      try {
        const userRecord = await admin.auth().createUser({
          email,
          password
        });
        uid = userRecord.uid;
        console.log(`Created Auth account for ${email}`);
      } catch (err) {
        if (err.code === 'auth/email-already-in-use') {
          console.log(`Email ${email} already exists. Retrieving existing UID...`);
          const userRecord = await admin.auth().getUserByEmail(email);
          uid = userRecord.uid;
        } else {
          throw err;
        }
      }
      
      const favoriteBars = getRandomBars(1, 5).map(b => b.id);
      
      await db.collection("users").doc(uid).set({
        uid,
        email: email,
        username: userData.username,
        mood: userData.mood,
        bio: userData.bio,
        emoji_avatar: userData.emoji_avatar,
        profileTheme: userData.theme,
        unlockedThemes: ["classic", "glitter", "cyberpunk", "sunset", "goth", "gameboy"],
        favorited_bars: favoriteBars,
        homeCity: "Phoenix",
        selectedCity: "Phoenix",
        isAnonymous: false,
        flag_count: 0,
        banned: false,
        uuid: "seed_device_auth_" + i,
        createdAt: Date.now() - Math.floor(Math.random() * 1000000000)
      });
      
      createdUsers.push({
        uid,
        email,
        password,
        username: userData.username,
        emoji_avatar: userData.emoji_avatar,
        mood: userData.mood
      });
    } catch (err) {
      console.error(`Error creating auth for ${email}:`, err);
    }
  }

  // Create 10 posts for the first 10 auth users
  for (let i = 0; i < Math.min(10, createdUsers.length); i++) {
    const user = createdUsers[i];
    const bar = PHOENIX_BARS_ONLY[Math.floor(Math.random() * PHOENIX_BARS_ONLY.length)];
    const text = MOCK_POSTS[i];
    
    await db.collection("posts").add({
      userId: user.uid,
      username: user.username,
      emoji_avatar: user.emoji_avatar,
      mood: user.mood,
      venueId: bar.id,
      venueName: bar.name,
      venueCity: bar.city,
      venueZone: bar.zone,
      venueAddress: bar.address,
      text: text,
      timestamp: Date.now() - Math.floor(Math.random() * 86400000 * 5),
      date: "May 2026",
      timeRange: "Evening",
      status: "active",
      thumbsUpCount: Math.floor(Math.random() * 5)
    });
    console.log(`Created post by ${user.username} at ${bar.name}`);
  }

  console.log('\n--- CREDENTIALS LIST ---');
  createdUsers.forEach(u => {
    console.log(`Username: ${u.username} | Email: ${u.email} | Password: ${u.password}`);
  });
  console.log('------------------------\n');

  process.exit(0);
}

seedAuth().catch(err => {
  console.error("Auth seed error:", err);
  process.exit(1);
});
