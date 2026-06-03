import { initializeApp, getApps } from "firebase/app";
import { 
  getAuth,
  initializeAuth,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  signInAnonymously, 
  linkWithCredential, 
  EmailAuthProvider, 
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateEmail,
  sendPasswordResetEmail,
  deleteUser,
  linkWithPopup,
  signInWithPopup,
  GoogleAuthProvider,
  OAuthProvider,
  createUserWithEmailAndPassword
} from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  addDoc, 
  updateDoc,
  deleteDoc,
  onSnapshot, 
  query, 
  where, 
  orderBy,
  limit,
  serverTimestamp,
  getDocs,
  increment
} from "firebase/firestore";

// Read Firebase configurations from Vite environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Check if we have complete configurations to run real Firebase
const isRealFirebaseConfigured = 
  firebaseConfig.apiKey && 
  firebaseConfig.apiKey !== "YOUR_FIREBASE_API_KEY" &&
  firebaseConfig.projectId;

let realAuth = null;
let realDb = null;

if (isRealFirebaseConfigured) {
  try {
    const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    
    // Capacitor iOS WebView has a known bug where Firebase Auth hangs indefinitely
    // when detecting the default persistence. Explicitly setting persistence fixes it.
    try {
      realAuth = initializeAuth(firebaseApp, {
        persistence: [indexedDBLocalPersistence, browserLocalPersistence]
      });
    } catch (err) {
      // In case of hot reloads where auth is already initialized
      if (err.code === "auth/already-initialized") {
        realAuth = getAuth(firebaseApp);
      } else {
        throw err;
      }
    }
    
    realDb = getFirestore(firebaseApp);
    console.log("Firebase initialized successfully using environment credentials.");
  } catch (err) {
    console.error("Failed to initialize real Firebase, switching to simulation:", err);
  }
}

// ==========================================
// LOCAL STORAGE SIMULATION LAYER (FALLBACK)
// ==========================================
class SimulatedStore {
  constructor() {
    this.listeners = [];
    this.initMocks();
  }

  initMocks() {
    if (!localStorage.getItem("asl_db")) {
      const initialDb = {
        users: {
          "tom": {
            uid: "tom",
            username: "Tom",
            mood: "Friendly 🙂",
            bio: "Remember me?",
            headline: "Everyones first friend!",
            profileTheme: "classic",
            emoji_avatar: "👥🥃💖",
            favorited_bars: ["venue_cobra", "venue_gracies"],
            createdAt: Date.now() - 10 * 24 * 60 * 60 * 1000 // 10 days ago
          },
          "hunter": {
            uid: "hunter",
            username: "Hunter",
            mood: "Coding 💻",
            bio: "Founder of asl. Let me know if you have any questions!",
            profileTheme: "classic",
            emoji_avatar: "⚡🖥️🛹",
            favorited_bars: ["venue_cobra"],
            createdAt: Date.now() - 10 * 24 * 60 * 60 * 1000
          },
          "sysop_admin": {
            uid: "sysop_admin",
            username: "SysOp",
            mood: "Monitoring 🖥️",
            bio: "System Operator admin console.",
            isAdmin: true,
            profileTheme: "cyberpunk",
            emoji_avatar: "💾📟⚡",
            favorited_bars: [],
            createdAt: Date.now() - 10 * 24 * 60 * 60 * 1000
          },
          "user_greenday": {
            uid: "user_greenday",
            username: "Billie",
            mood: "Rockin' 🎸",
            bio: "Waiting for September to end.",
            profileTheme: "sunset",
            emoji_avatar: "🎸🥁🎤",
            favorited_bars: ["venue_cobra", "venue_valley", "venue_yucca"],
            createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000
          },
          "user_emo": {
            uid: "user_emo",
            username: "Sk8rBoi",
            mood: "Mopey 🖤",
            bio: "She was a skater girl, she said see ya later girl.",
            profileTheme: "classic",
            emoji_avatar: "🛹💔💀",
            favorited_bars: ["venue_caseys", "venue_yucca"],
            createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000
          },
          "user_hiphop": {
            uid: "user_hiphop",
            username: "Jay",
            mood: "Hustling 🎤",
            bio: "99 problems but asl ain't one.",
            profileTheme: "sunset",
            emoji_avatar: "🎤🕶️💵",
            favorited_bars: ["venue_gracies", "venue_bottled"],
            createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000
          },
          "user_coder": {
            uid: "user_coder",
            username: "Ada",
            mood: "Coding 💻",
            bio: "Brutalist designs are the future.",
            profileTheme: "cyberpunk",
            emoji_avatar: "💻💾⌨️",
            favorited_bars: ["venue_valley", "venue_linger"],
            createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000
          },
          "user_rave": {
            uid: "user_rave",
            username: "DJ_Spin",
            mood: "Hyped 🎧",
            bio: "Catch me at the warehouse party tonight.",
            profileTheme: "cyberpunk",
            emoji_avatar: "🎧🎛️⚡",
            favorited_bars: ["venue_sunbar", "venue_riot"],
            createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000
          },
          "user_retro": {
            uid: "user_retro",
            username: "NeonGirl",
            mood: "Glow ✨",
            bio: "Living in the wrong decade.",
            profileTheme: "classic",
            emoji_avatar: "✨🍭🛸",
            favorited_bars: ["venue_cobra", "venue_linger", "venue_gracies"],
            createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000
          },
          "user_indie": {
            uid: "user_indie",
            username: "VinylVixen",
            mood: "Chill ☕",
            bio: "Vinyl records sound better. Period.",
            profileTheme: "sunset",
            emoji_avatar: "📻🍂☕",
            favorited_bars: ["venue_valley", "venue_caseys"],
            createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000
          },
          "user_metal": {
            uid: "user_metal",
            username: "IronHead",
            mood: "Heavy 🤘",
            bio: "Metal head for life. Slayer rules.",
            profileTheme: "classic",
            emoji_avatar: "🤘🎸🔥",
            favorited_bars: ["venue_yucca", "venue_cobra"],
            createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000
          },
          "user_gamer": {
            uid: "user_gamer",
            username: "PixelKnight",
            mood: "Gaming 🎮",
            bio: "Galaga high score champion.",
            profileTheme: "cyberpunk",
            emoji_avatar: "🎮👾🏆",
            favorited_bars: ["venue_cobra", "venue_sunbar"],
            createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000
          },
          "user_coffee": {
            uid: "user_coffee",
            username: "BeanQueen",
            mood: "Caffeinated ☕",
            bio: "Too much espresso, not enough time.",
            profileTheme: "classic",
            emoji_avatar: "☕🍩⏳",
            favorited_bars: ["venue_linger", "venue_caseys"],
            createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000
          },
          "user_punk": {
            uid: "user_punk",
            username: "RiotGrrrl",
            mood: "Rebellious ✊",
            bio: "Support local zines and bands.",
            profileTheme: "sunset",
            emoji_avatar: "✊🎸🖤",
            favorited_bars: ["venue_gracies", "venue_valley", "venue_yucca"],
            createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000
          },
          "user_star": {
            uid: "user_star",
            username: "AstroBoy",
            mood: "Dreamy 🌌",
            bio: "Staring at the stars from my rooftop.",
            profileTheme: "cyberpunk",
            emoji_avatar: "🌌🌠🚀",
            favorited_bars: ["venue_riot", "venue_bottled"],
            createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000
          },
          "user_cactus": {
            uid: "user_cactus",
            username: "CactusJack",
            mood: "Chillin' 😎",
            bio: "Desert nights and neon lights.",
            profileTheme: "sunset",
            emoji_avatar: "🌵🔥🌙",
            favorited_bars: ["venue_cobra", "venue_valley", "venue_coach"],
            createdAt: Date.now() - 4 * 24 * 60 * 60 * 1000
          },
          "user_luna": {
            uid: "user_luna",
            username: "LunaMoth",
            mood: "Mellow 🎧",
            bio: "Listening to lo-fi on the patio at 2am.",
            profileTheme: "classic",
            emoji_avatar: "🦋🌙🎧",
            favorited_bars: ["venue_linger", "venue_gracies", "venue_caseys"],
            createdAt: Date.now() - 3 * 24 * 60 * 60 * 1000
          },
          "user_salsa": {
            uid: "user_salsa",
            username: "SalsaVerde",
            mood: "Excited ⚡",
            bio: "If the music is playing, I'm dancing.",
            profileTheme: "sunset",
            emoji_avatar: "💃🌶️🎶",
            favorited_bars: ["venue_sunbar", "venue_bottled", "venue_riot"],
            createdAt: Date.now() - 4 * 24 * 60 * 60 * 1000
          },
          "user_mesa": {
            uid: "user_mesa",
            username: "MesaMike",
            mood: "Nostalgic 📼",
            bio: "Born and raised in the East Valley. Still here.",
            profileTheme: "classic",
            emoji_avatar: "🏜️📼🍺",
            favorited_bars: ["venue_yucca", "venue_caseys"],
            createdAt: Date.now() - 6 * 24 * 60 * 60 * 1000
          },
          "user_copper": {
            uid: "user_copper",
            username: "CopperState",
            mood: "Creative 🎨",
            bio: "Tattoo artist by day, dive bar philosopher by night.",
            profileTheme: "cyberpunk",
            emoji_avatar: "🎨🖋️🍻",
            favorited_bars: ["venue_gracies", "venue_yucca", "venue_cobra"],
            createdAt: Date.now() - 3 * 24 * 60 * 60 * 1000
          },
          "user_phoenix": {
            uid: "user_phoenix",
            username: "PhxRising",
            mood: "Rebellious ✊",
            bio: "This city raised me. I raise it back.",
            profileTheme: "sunset",
            emoji_avatar: "🔥🏙️✊",
            favorited_bars: ["venue_valley", "venue_cobra", "venue_gracies"],
            createdAt: Date.now() - 7 * 24 * 60 * 60 * 1000
          },
          "user_dreamer": {
            uid: "user_dreamer",
            username: "DayDreamer",
            mood: "Spacey 🚀",
            bio: "Head in the clouds, feet on Mill Ave.",
            profileTheme: "cyberpunk",
            emoji_avatar: "☁️🚀💫",
            favorited_bars: ["venue_sunbar", "venue_caseys", "venue_linger"],
            createdAt: Date.now() - 2 * 24 * 60 * 60 * 1000
          },
          "user_habanero": {
            uid: "user_habanero",
            username: "Habanero",
            mood: "Sassy 💅",
            bio: "Hot takes and hotter salsa.",
            profileTheme: "sunset",
            emoji_avatar: "🌶️💅✨",
            favorited_bars: ["venue_bottled", "venue_riot", "venue_coach"],
            createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000
          },
          "user_monsoon": {
            uid: "user_monsoon",
            username: "MonsoonSzn",
            mood: "Melancholy 🌧️",
            bio: "I love this city most when it rains.",
            profileTheme: "classic",
            emoji_avatar: "🌧️⛈️🌈",
            favorited_bars: ["venue_linger", "venue_valley"],
            createdAt: Date.now() - 4 * 24 * 60 * 60 * 1000
          },
          "user_roadrunner": {
            uid: "user_roadrunner",
            username: "RoadRunner",
            mood: "Hyper 🤪",
            bio: "Beep beep. Can't catch me.",
            profileTheme: "cyberpunk",
            emoji_avatar: "🏃💨🤪",
            favorited_bars: ["venue_cobra", "venue_sunbar", "venue_yucca"],
            createdAt: Date.now() - 3 * 24 * 60 * 60 * 1000
          },
          "user_saguaro": {
            uid: "user_saguaro",
            username: "SaguaroSoul",
            mood: "Reflective 📖",
            bio: "Journaling at the bar. Don't judge.",
            profileTheme: "classic",
            emoji_avatar: "🌵📖🌅",
            favorited_bars: ["venue_gracies", "venue_linger", "venue_caseys"],
            createdAt: Date.now() - 6 * 24 * 60 * 60 * 1000
          },
          "user_scorpion": {
            uid: "user_scorpion",
            username: "ScorpionQ",
            mood: "Emo 🖤",
            bio: "Nocturnal by choice. Scorpio by birth.",
            profileTheme: "cyberpunk",
            emoji_avatar: "🦂🖤🌑",
            favorited_bars: ["venue_yucca", "venue_valley", "venue_cobra"],
            createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000
          },
          "user_turquoise": {
            uid: "user_turquoise",
            username: "TurquoiseRing",
            mood: "Crushing 😍",
            bio: "Collecting turquoise and bad decisions.",
            profileTheme: "sunset",
            emoji_avatar: "💎💙🌻",
            favorited_bars: ["venue_coach", "venue_bottled", "venue_gracies"],
            createdAt: Date.now() - 2 * 24 * 60 * 60 * 1000
          },
          "user_prickly": {
            uid: "user_prickly",
            username: "PricklyPear",
            mood: "Ready to Party 🍹",
            bio: "Margarita in hand, always.",
            profileTheme: "classic",
            emoji_avatar: "🍹🌺🎉",
            favorited_bars: ["venue_riot", "venue_sunbar", "venue_bottled"],
            createdAt: Date.now() - 4 * 24 * 60 * 60 * 1000
          },
          "user_sidewinder": {
            uid: "user_sidewinder",
            username: "Sidewinder",
            mood: "Tired 😴",
            bio: "Night shift nurse. Bar is my morning coffee.",
            profileTheme: "classic",
            emoji_avatar: "🐍😴🌙",
            favorited_bars: ["venue_caseys", "venue_gracies", "venue_linger"],
            createdAt: Date.now() - 3 * 24 * 60 * 60 * 1000
          }
        },
        posts: [
          {
            id: "post1",
            venueId: "venue_cobra",
            venueName: "Cobra Arcade Bar",
            venueAddress: "801 N 2nd St, Phoenix, AZ 85004",
            venueCity: "Phoenix",
            venueZone: "Downtown",
            text: "You were wearing a vintage Polaroid tee and playing the Galaga machine. We locked eyes when I beat your high score. Drinks on me next time?",
            userId: "user_greenday",
            date: "May 20, 2026",
            timeRange: "10:00 PM - 11:30 PM",
            timestamp: Date.now() - 172800000,
            status: "connected",
            connectedWithId: "user_cactus",
            connectedWithUsername: "CactusJack",
            connectedProofText: "I WAS wearing that Polaroid shirt! You beat my high score by like 200 points and I was so salty. I remember your green jacket. Rematch anytime."
          },
          {
            id: "post2",
            venueId: "venue_caseys",
            venueName: "Casey Moore's Oyster House",
            venueAddress: "850 S Ash Ave, Tempe, AZ 85281",
            venueCity: "Phoenix",
            venueZone: "Tempe",
            text: "You had a green beanie and were drinking Guinness on the patio. I asked if the seat next to you was taken, but got too nervous to say more. Let's get a drink.",
            userId: "user_emo",
            date: "May 21, 2026",
            timeRange: "9:00 PM - 10:30 PM",
            timestamp: Date.now() - 86400000,
            status: "active"
          },
          {
            id: "post3",
            venueId: "venue_valley",
            venueName: "Valley Bar",
            venueAddress: "130 N Central Ave, Phoenix, AZ 85004",
            venueCity: "Phoenix",
            venueZone: "Downtown",
            text: "Near the jukebox in the basement. You had neon blue eyeliner and a black leather jacket. You played 'Love Will Tear Us Apart' twice. Who are you?",
            userId: "user_coder",
            date: "May 22, 2026",
            timeRange: "11:30 PM - 1:00 AM",
            timestamp: Date.now() - 3600000,
            status: "connected",
            connectedWithId: "user_scorpion",
            connectedWithUsername: "ScorpionQ",
            connectedProofText: "Joy Division is my religion. I played it twice because nobody complained the first time. Black leather jacket is my uniform. I remember you near the booth."
          },
          {
            id: "post4",
            venueId: "venue_gracies",
            venueName: "Gracies Tax Bar",
            venueAddress: "711 N 7th Ave, Phoenix, AZ 85007",
            venueCity: "Phoenix",
            venueZone: "Downtown",
            text: "You were at the bar alone, reading a paperback novel in the dim light. Red flannel shirt, round glasses. I bought you a drink but chickened out saying hi. I'm an idiot. Was that you?",
            userId: "user_hiphop",
            date: "May 22, 2026",
            timeRange: "8:00 PM - 9:30 PM",
            timestamp: Date.now() - 7200000,
            status: "active"
          },
          {
            id: "post5",
            venueId: "venue_linger",
            venueName: "Linger Longer Lounge",
            venueAddress: "6522 N 16th St, Phoenix, AZ 85016",
            venueCity: "Phoenix",
            venueZone: "Downtown",
            text: "You spilled your drink on my laptop bag and apologized like five times — it was adorable. You had short dark hair and a vintage NASA patch jacket. I should've asked your name.",
            userId: "user_retro",
            date: "May 22, 2026",
            timeRange: "10:30 PM - midnight",
            timestamp: Date.now() - 5400000,
            status: "active"
          },
          {
            id: "post6",
            venueId: "venue_yucca",
            venueName: "Yucca Tap Room",
            venueAddress: "29 W Southern Ave, Tempe, AZ 85282",
            venueCity: "Phoenix",
            venueZone: "Tempe",
            text: "You were in the back booth with a group of friends, laughing so loud the whole bar noticed. You caught me staring and just smiled. Plaid skirt, white cowboy boots. I left before I could say anything.",
            userId: "user_metal",
            date: "May 21, 2026",
            timeRange: "11:00 PM - 1:00 AM",
            timestamp: Date.now() - 108000000,
            status: "connected",
            connectedWithId: "user_salsa",
            connectedWithUsername: "SalsaVerde",
            connectedProofText: "Okay YES that was my birthday and I was LOUD. White cowboy boots are my signature. You were the shy one in the corner right? I smiled because you looked sweet."
          },
          {
            id: "post7",
            venueId: "venue_sunbar",
            venueName: "Sunbar Tempe",
            venueAddress: "24 W 5th St, Tempe, AZ 85281",
            venueCity: "Phoenix",
            venueZone: "Tempe",
            text: "You were DJing the early set and you played 808s & Heartbreak back to back. Tall, blue streak in your hair. After your set I wanted to ask you out but you disappeared. Please be on here.",
            userId: "user_rave",
            date: "May 20, 2026",
            timeRange: "9:00 PM - 11:00 PM",
            timestamp: Date.now() - 144000000,
            status: "active"
          },
          {
            id: "post8",
            venueId: "venue_cobra",
            venueName: "Cobra Arcade Bar",
            venueAddress: "801 N 2nd St, Phoenix, AZ 85004",
            venueCity: "Phoenix",
            venueZone: "Downtown",
            text: "You beat me twice at Street Fighter and just walked away like it was nothing. Grey hoodie, headphones around your neck. I have never felt so personally defeated. Rematch?",
            userId: "user_gamer",
            date: "May 23, 2026",
            timeRange: "8:30 PM - 10:00 PM",
            timestamp: Date.now() - 1800000,
            status: "connected",
            connectedWithId: "user_roadrunner",
            connectedWithUsername: "RoadRunner",
            connectedProofText: "Bro I didn't walk away to be cool \u2014 my friend was leaving and I had to catch my ride! Grey hoodie gang. Rematch? I'll let you pick the character this time."
          },
          {
            id: "post9",
            venueId: "venue_caseys",
            venueName: "Casey Moore's Oyster House",
            venueAddress: "850 S Ash Ave, Tempe, AZ 85281",
            venueCity: "Phoenix",
            venueZone: "Tempe",
            text: "You were the one recommending oyster pairings to the couple next to me like a sommelier. Curly hair, yellow sundress. Every time our eyes met you looked away. So did I. Why are we like this.",
            userId: "user_coffee",
            date: "May 22, 2026",
            timeRange: "7:00 PM - 9:00 PM",
            timestamp: Date.now() - 43200000,
            status: "connected",
            connectedWithId: "user_turquoise",
            connectedWithUsername: "TurquoiseRing",
            connectedProofText: "I can't believe someone noticed my oyster rant! Yellow sundress is my go-to. The couple ended up ordering everything I suggested. I saw you smiling \u2014 I was too nervous to say hi."
          },
          {
            id: "post10",
            venueId: "venue_valley",
            venueName: "Valley Bar",
            venueAddress: "130 N Central Ave, Phoenix, AZ 85004",
            venueCity: "Phoenix",
            venueZone: "Downtown",
            text: "You were selling handmade zines at the merch table for a band I've never heard of. Shaved head, overalls, patch-covered tote bag. You gave me a free one and winked. I've re-read it four times.",
            userId: "user_punk",
            date: "May 22, 2026",
            timeRange: "9:00 PM - 11:30 PM",
            timestamp: Date.now() - 21600000,
            status: "connected",
            connectedWithId: "user_phoenix",
            connectedWithUsername: "PhxRising",
            connectedProofText: "THE ZINE!! I hand-printed 50 copies and you got one of the last ones. Shaved head, overalls, patch tote \u2014 that's me. The wink was intentional. You had good energy."
          },
          {
            id: "post11",
            venueId: "venue_riot",
            venueName: "Riot House",
            venueAddress: "4425 N Saddlebag Trail, Scottsdale, AZ 85251",
            venueCity: "Phoenix",
            venueZone: "Old Town",
            text: "You were on the rooftop deck staring at the sky and not talking to anyone. I sat next to you and we just watched the moon together for like 20 minutes without saying a word. It was kind of perfect. Who are you?",
            userId: "user_star",
            date: "May 21, 2026",
            timeRange: "11:30 PM - 1:00 AM",
            timestamp: Date.now() - 90000000,
            status: "active"
          },
          {
            id: "post12",
            venueId: "venue_gracies",
            venueName: "Gracies Tax Bar",
            venueAddress: "711 N 7th Ave, Phoenix, AZ 85007",
            venueCity: "Phoenix",
            venueZone: "Downtown",
            text: "You sat next to me at the bar and asked if you could borrow a pen. I don't carry pens. You laughed and said no one does anymore. We talked for an hour about nothing important. I never got your name. Tan jacket, silver rings.",
            userId: "user_indie",
            date: "May 23, 2026",
            timeRange: "6:00 PM - 8:00 PM",
            timestamp: Date.now() - 3000000,
            status: "active"
          },
          {
            id: "post13",
            venueId: "venue_cobra",
            venueName: "Cobra Arcade Bar",
            venueAddress: "801 N 2nd St, Phoenix, AZ 85004",
            venueCity: "Phoenix",
            venueZone: "Downtown",
            text: "You were feeding quarters into Ms. Pac-Man like your life depended on it. Tank top, arm tattoos, huge smile every time you died. I was the one clapping from behind you. Should've said something.",
            userId: "user_cactus",
            date: "May 24, 2026",
            timeRange: "9:00 PM - 11:00 PM",
            timestamp: Date.now() - 900000,
            status: "active"
          },
          {
            id: "post14",
            venueId: "venue_linger",
            venueName: "Linger Longer Lounge",
            venueAddress: "6522 N 16th St, Phoenix, AZ 85016",
            venueCity: "Phoenix",
            venueZone: "Downtown",
            text: "You were the only person on the patio reading a book while everyone else was screaming at the game on TV. Glasses, messy bun, iced tea. I wanted to ask what you were reading but I'm a coward.",
            userId: "user_luna",
            date: "May 24, 2026",
            timeRange: "7:00 PM - 9:00 PM",
            timestamp: Date.now() - 1200000,
            status: "active"
          },
          {
            id: "post15",
            venueId: "venue_sunbar",
            venueName: "Sunbar Tempe",
            venueAddress: "24 W 5th St, Tempe, AZ 85281",
            venueCity: "Phoenix",
            venueZone: "Tempe",
            text: "You grabbed my hand during the DJ drop and we danced for three songs straight. Red lipstick, gold hoop earrings. You disappeared when your friends dragged you to the next bar. Come back.",
            userId: "user_salsa",
            date: "May 23, 2026",
            timeRange: "11:00 PM - 1:00 AM",
            timestamp: Date.now() - 4500000,
            status: "active"
          },
          {
            id: "post16",
            venueId: "venue_yucca",
            venueName: "Yucca Tap Room",
            venueAddress: "29 W Southern Ave, Tempe, AZ 85282",
            venueCity: "Phoenix",
            venueZone: "Tempe",
            text: "You were at the pinball machine wearing a faded Descendents shirt. We argued about whether Black Flag or Minor Threat was better. You won. I want a rematch over beers.",
            userId: "user_mesa",
            date: "May 22, 2026",
            timeRange: "10:00 PM - midnight",
            timestamp: Date.now() - 36000000,
            status: "active"
          },
          {
            id: "post17",
            venueId: "venue_gracies",
            venueName: "Gracies Tax Bar",
            venueAddress: "711 N 7th Ave, Phoenix, AZ 85007",
            venueCity: "Phoenix",
            venueZone: "Downtown",
            text: "You were sketching on a napkin at the end of the bar. I peeked and it was a portrait of the bartender. Absolutely incredible. Denim vest, rings on every finger. I wanted to tell you it was beautiful.",
            userId: "user_copper",
            date: "May 24, 2026",
            timeRange: "8:00 PM - 10:00 PM",
            timestamp: Date.now() - 600000,
            status: "active"
          },
          {
            id: "post18",
            venueId: "venue_valley",
            venueName: "Valley Bar",
            venueAddress: "130 N Central Ave, Phoenix, AZ 85004",
            venueCity: "Phoenix",
            venueZone: "Downtown",
            text: "Basement show. You were moshing but in a respectful way — kept picking people up when they fell. Shaved sides, band tee, doc martens. You high-fived me after the encore. I should've asked for more than a high five.",
            userId: "user_phoenix",
            date: "May 23, 2026",
            timeRange: "10:00 PM - 12:30 AM",
            timestamp: Date.now() - 5000000,
            status: "active"
          },
          {
            id: "post19",
            venueId: "venue_caseys",
            venueName: "Casey Moore's Oyster House",
            venueAddress: "850 S Ash Ave, Tempe, AZ 85281",
            venueCity: "Phoenix",
            venueZone: "Tempe",
            text: "You told the ghost story about the house to a group of freshmen and they were TERRIFIED. Backwards cap, flannel tied around your waist. You caught me laughing and said 'believe it or not.' I believe you.",
            userId: "user_dreamer",
            date: "May 24, 2026",
            timeRange: "9:30 PM - 11:00 PM",
            timestamp: Date.now() - 1500000,
            status: "active"
          },
          {
            id: "post20",
            venueId: "venue_bottled",
            venueName: "Bottled Blonde",
            venueAddress: "7340 E Indian Plaza, Scottsdale, AZ 85251",
            venueCity: "Phoenix",
            venueZone: "Old Town",
            text: "You ordered a pizza and ate the entire thing alone at the bar with zero shame. White crop top, sunglasses on your head even though it was midnight. Iconic behavior. I need to know you.",
            userId: "user_habanero",
            date: "May 23, 2026",
            timeRange: "11:30 PM - 1:00 AM",
            timestamp: Date.now() - 7200000,
            status: "active"
          },
          {
            id: "post21",
            venueId: "venue_valley",
            venueName: "Valley Bar",
            venueAddress: "130 N Central Ave, Phoenix, AZ 85004",
            venueCity: "Phoenix",
            venueZone: "Downtown",
            text: "It was raining and we both ran inside at the same time. You shook the water off your jacket onto me and apologized by buying me a shot. Curly hair, denim on denim. That shot tasted like destiny.",
            userId: "user_monsoon",
            date: "May 22, 2026",
            timeRange: "9:00 PM - 11:00 PM",
            timestamp: Date.now() - 50400000,
            status: "active"
          },
          {
            id: "post22",
            venueId: "venue_cobra",
            venueName: "Cobra Arcade Bar",
            venueAddress: "801 N 2nd St, Phoenix, AZ 85004",
            venueCity: "Phoenix",
            venueZone: "Downtown",
            text: "You were speed-running Donkey Kong and a crowd formed. Bright green sneakers, energy drink in hand. When you beat the level you turned around and bowed. Absolutely unhinged. I'm in love.",
            userId: "user_roadrunner",
            date: "May 24, 2026",
            timeRange: "8:00 PM - 10:30 PM",
            timestamp: Date.now() - 800000,
            status: "active"
          },
          {
            id: "post23",
            venueId: "venue_caseys",
            venueName: "Casey Moore's Oyster House",
            venueAddress: "850 S Ash Ave, Tempe, AZ 85281",
            venueCity: "Phoenix",
            venueZone: "Tempe",
            text: "You were writing in a leather journal on the patio. It started raining and you didn't move — you just closed your eyes and smiled. White linen shirt, turquoise necklace. That moment was a painting.",
            userId: "user_saguaro",
            date: "May 21, 2026",
            timeRange: "7:30 PM - 9:30 PM",
            timestamp: Date.now() - 100000000,
            status: "active"
          },
          {
            id: "post24",
            venueId: "venue_yucca",
            venueName: "Yucca Tap Room",
            venueAddress: "29 W Southern Ave, Tempe, AZ 85282",
            venueCity: "Phoenix",
            venueZone: "Tempe",
            text: "3 AM at Yucca. You were the only other person there. We didn't talk — just sat at opposite ends of the bar in complete silence. It was the most comfortable silence I've ever had with a stranger. All black outfit, silver chain.",
            userId: "user_scorpion",
            date: "May 22, 2026",
            timeRange: "2:30 AM - 4:00 AM",
            timestamp: Date.now() - 72000000,
            status: "active"
          },
          {
            id: "post25",
            venueId: "venue_coach",
            venueName: "Coach House",
            venueAddress: "7011 E Indian School Rd, Scottsdale, AZ 85251",
            venueCity: "Phoenix",
            venueZone: "Old Town",
            text: "Under the Christmas lights at Coach House, you were telling the bartender about how you make your own jewelry. Turquoise ring, straw hat, cowboy boots. Every ring had a story. I wanted to hear them all.",
            userId: "user_turquoise",
            date: "May 24, 2026",
            timeRange: "6:00 PM - 8:00 PM",
            timestamp: Date.now() - 400000,
            status: "active"
          },
          {
            id: "post26",
            venueId: "venue_riot",
            venueName: "Riot House",
            venueAddress: "4425 N Saddlebag Trail, Scottsdale, AZ 85251",
            venueCity: "Phoenix",
            venueZone: "Old Town",
            text: "VIP section. You snuck me past the rope because you said I 'looked like I needed better music.' Floral dress, combat boots. We lost each other when the lights dropped. Find me.",
            userId: "user_prickly",
            date: "May 23, 2026",
            timeRange: "10:30 PM - 1:00 AM",
            timestamp: Date.now() - 3600000,
            status: "active"
          },
          {
            id: "post27",
            venueId: "venue_gracies",
            venueName: "Gracies Tax Bar",
            venueAddress: "711 N 7th Ave, Phoenix, AZ 85007",
            venueCity: "Phoenix",
            venueZone: "Downtown",
            text: "I just got off a twelve-hour shift and you could tell. You slid a beer down the bar to me without a word, just a nod. Scrubs under your jacket, tired eyes that still sparkled. Nurses stick together. What's your name?",
            userId: "user_sidewinder",
            date: "May 24, 2026",
            timeRange: "2:00 AM - close",
            timestamp: Date.now() - 200000,
            status: "active"
          }
        ],
        connections: {
          "conn_mock_1": {
            id: "conn_mock_1",
            postId: "post1",
            postText: "You were wearing a vintage Polaroid tee and playing the Galaga machine. We locked eyes when I beat your high score. Drinks on me next time?",
            venueName: "Cobra Arcade Bar",
            senderId: "user_cactus",
            receiverId: "user_greenday",
            proofText: "I WAS wearing that Polaroid shirt! You beat my high score by like 200 points and I was so salty. I remember your green jacket. Rematch anytime.",
            status: "accepted"
          },
          "conn_mock_2": {
            id: "conn_mock_2",
            postId: "post3",
            postText: "Near the jukebox in the basement. You had neon blue eyeliner and a black leather jacket. You played 'Love Will Tear Us Apart' twice. Who are you?",
            venueName: "Valley Bar",
            senderId: "user_scorpion",
            receiverId: "user_coder",
            proofText: "Joy Division is my religion. I played it twice because nobody complained the first time. Black leather jacket is my uniform. I remember you near the booth.",
            status: "accepted"
          },
          "conn_mock_3": {
            id: "conn_mock_3",
            postId: "post6",
            postText: "You were in the back booth with a group of friends, laughing so loud the whole bar noticed. You caught me staring and just smiled. Plaid skirt, white cowboy boots.",
            venueName: "Yucca Tap Room",
            senderId: "user_salsa",
            receiverId: "user_metal",
            proofText: "Okay YES that was my birthday and I was LOUD. White cowboy boots are my signature. You were the shy one in the corner right? I smiled because you looked sweet.",
            status: "accepted"
          },
          "conn_mock_4": {
            id: "conn_mock_4",
            postId: "post8",
            postText: "You beat me twice at Street Fighter and just walked away like it was nothing. Grey hoodie, headphones around your neck.",
            venueName: "Cobra Arcade Bar",
            senderId: "user_roadrunner",
            receiverId: "user_gamer",
            proofText: "Bro I didn't walk away to be cool — my friend was leaving and I had to catch my ride! Grey hoodie gang. Rematch? I'll let you pick the character this time.",
            status: "accepted"
          },
          "conn_mock_5": {
            id: "conn_mock_5",
            postId: "post9",
            postText: "You were the one recommending oyster pairings to the couple next to me like a sommelier. Curly hair, yellow sundress.",
            venueName: "Casey Moore's Oyster House",
            senderId: "user_turquoise",
            receiverId: "user_coffee",
            proofText: "I can't believe someone noticed my oyster rant! Yellow sundress is my go-to. The couple ended up ordering everything I suggested. I saw you smiling — I was too nervous to say hi.",
            status: "accepted"
          },
          "conn_mock_6": {
            id: "conn_mock_6",
            postId: "post4",
            postText: "You were at the bar alone, reading a paperback novel in the dim light. Red flannel shirt, round glasses.",
            venueName: "Gracies Tax Bar",
            senderId: "user_saguaro",
            receiverId: "user_hiphop",
            proofText: "That was me and the book was Kafka on the Shore. Red flannel is literally all I own. You bought me a drink?? I thought the bartender was being nice! Why didn't you say hi?!",
            status: "pending"
          },
          "conn_mock_7": {
            id: "conn_mock_7",
            postId: "post11",
            postText: "You were on the rooftop deck staring at the sky and not talking to anyone. I sat next to you and we just watched the moon together for like 20 minutes.",
            venueName: "Riot House",
            senderId: "user_prickly",
            receiverId: "user_star",
            proofText: "That was the most peaceful 20 minutes of my life. I wanted to say something but the silence was so perfect I didn't want to ruin it. I was wearing the floral dress and boots.",
            status: "pending"
          },
          "conn_mock_8": {
            id: "conn_mock_8",
            postId: "post5",
            postText: "You spilled your drink on my laptop bag and apologized like five times — it was adorable.",
            venueName: "Linger Longer Lounge",
            senderId: "user_luna",
            receiverId: "user_retro",
            proofText: "Oh my GOD I am still mortified about that. I spilled an entire IPA on your bag and you were SO nice about it. Vintage NASA jacket is correct — it was my dad's. Please let me buy you a replacement drink.",
            status: "pending"
          },
          "conn_mock_9": {
            id: "conn_mock_9",
            postId: "post7",
            postText: "You were DJing the early set and you played 808s & Heartbreak back to back.",
            venueName: "Sunbar Tempe",
            senderId: "user_dreamer",
            receiverId: "user_rave",
            proofText: "808s is the greatest album ever made and I will die on that hill. Blue streak in my hair is faded now but I still have it. I went backstage after — you should've come found me!",
            status: "pending"
          },
          "conn_mock_10": {
            id: "conn_mock_10",
            postId: "post10",
            postText: "You were selling handmade zines at the merch table for a band I've never heard of.",
            venueName: "Valley Bar",
            senderId: "user_phoenix",
            receiverId: "user_punk",
            proofText: "THE ZINE!! I hand-printed 50 copies and you got one of the last ones. Shaved head, overalls, patch tote — that's me. The wink was intentional. You had good energy.",
            status: "accepted"
          }
        },
        chats: {
          "chat_mock_1": {
            id: "chat_mock_1",
            connectionId: "conn_mock_1",
            participants: ["user_cactus", "user_greenday"],
            lastMessage: "System: Connection accepted. Start chatting!",
            lastTimestamp: Date.now() - 800000,
            venueName: "Cobra Arcade Bar"
          },
          "chat_mock_2": {
            id: "chat_mock_2",
            connectionId: "conn_mock_2",
            participants: ["user_scorpion", "user_coder"],
            lastMessage: "System: Connection accepted. Start chatting!",
            lastTimestamp: Date.now() - 700000,
            venueName: "Valley Bar"
          },
          "chat_mock_3": {
            id: "chat_mock_3",
            connectionId: "conn_mock_3",
            participants: ["user_salsa", "user_metal"],
            lastMessage: "System: Connection accepted. Start chatting!",
            lastTimestamp: Date.now() - 600000,
            venueName: "Yucca Tap Room"
          },
          "chat_mock_4": {
            id: "chat_mock_4",
            connectionId: "conn_mock_4",
            participants: ["user_roadrunner", "user_gamer"],
            lastMessage: "System: Connection accepted. Start chatting!",
            lastTimestamp: Date.now() - 500000,
            venueName: "Cobra Arcade Bar"
          },
          "chat_mock_5": {
            id: "chat_mock_5",
            connectionId: "conn_mock_5",
            participants: ["user_turquoise", "user_coffee"],
            lastMessage: "System: Connection accepted. Start chatting!",
            lastTimestamp: Date.now() - 400000,
            venueName: "Casey Moore's Oyster House"
          },
          "chat_mock_10": {
            id: "chat_mock_10",
            connectionId: "conn_mock_10",
            participants: ["user_phoenix", "user_punk"],
            lastMessage: "System: Connection accepted. Start chatting!",
            lastTimestamp: Date.now() - 300000,
            venueName: "Valley Bar"
          }
        },
        messages: {},
        blacklisted_devices: {},
        appeals: {}
      };
      localStorage.setItem("asl_db", JSON.stringify(initialDb));
    } else {
      // Merge missing mock user profiles in case the DB was already initialized
      try {
        const dbData = JSON.parse(localStorage.getItem("asl_db") || "{}");
        if (!dbData.users) dbData.users = {};
        
        const mockUsersList = {
          "sysop_admin": { uid: "sysop_admin", username: "SysOp", mood: "Chillin' 😎", bio: "System Operator.", profileTheme: "cyberpunk", emoji_avatar: "🖥️💾⚡", favorited_bars: [], createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000 },
          "user_greenday": { uid: "user_greenday", username: "Billie", mood: "Nostalgic 📼", bio: "Waiting for September to end.", profileTheme: "sunset", emoji_avatar: "🎸🥁🎤", favorited_bars: ["venue_cobra", "venue_valley", "venue_yucca"], createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000 },
          "user_emo": { uid: "user_emo", username: "Sk8rBoi", mood: "Melancholy 🌧️", bio: "She was a skater girl, she said see ya later girl.", profileTheme: "classic", emoji_avatar: "🛹💔💀", favorited_bars: ["venue_caseys", "venue_yucca"], createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000 },
          "user_hiphop": { uid: "user_hiphop", username: "Jay", mood: "Chillin' 😎", bio: "99 problems but asl ain't one.", profileTheme: "sunset", emoji_avatar: "🎤🕶️💵", favorited_bars: ["venue_gracies", "venue_bottled"], createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000 },
          "user_coder": { uid: "user_coder", username: "Ada", mood: "Excited ⚡", bio: "Brutalist designs are the future.", profileTheme: "cyberpunk", emoji_avatar: "💻💾⌨️", favorited_bars: ["venue_valley", "venue_linger"], createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000 },
          "user_rave": { uid: "user_rave", username: "DJ_Spin", mood: "Ready to Party 🍹", bio: "Catch me at the warehouse party tonight.", profileTheme: "cyberpunk", emoji_avatar: "🎧🎛️⚡", favorited_bars: ["venue_sunbar", "venue_riot"], createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000 },
          "user_retro": { uid: "user_retro", username: "NeonGirl", mood: "Chillin' 😎", bio: "Living in the wrong decade.", profileTheme: "classic", emoji_avatar: "✨🍭🛸", favorited_bars: ["venue_cobra", "venue_linger", "venue_gracies"], createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000 },
          "user_indie": { uid: "user_indie", username: "VinylVixen", mood: "Mellow 🎧", bio: "Vinyl records sound better. Period.", profileTheme: "sunset", emoji_avatar: "📻🍂☕", favorited_bars: ["venue_valley", "venue_caseys"], createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000 },
          "user_metal": { uid: "user_metal", username: "IronHead", mood: "Emo 🖤", bio: "Metal head for life. Slayer rules.", profileTheme: "classic", emoji_avatar: "🤘🎸🔥", favorited_bars: ["venue_yucca", "venue_cobra"], createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000 },
          "user_gamer": { uid: "user_gamer", username: "PixelKnight", mood: "Excited ⚡", bio: "Galaga high score champion.", profileTheme: "cyberpunk", emoji_avatar: "🎮👾🏆", favorited_bars: ["venue_cobra", "venue_sunbar"], createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000 },
          "user_coffee": { uid: "user_coffee", username: "BeanQueen", mood: "Mellow 🎧", bio: "Too much espresso, not enough time.", profileTheme: "classic", emoji_avatar: "☕🍩⏳", favorited_bars: ["venue_linger", "venue_caseys"], createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000 },
          "user_punk": { uid: "user_punk", username: "RiotGrrrl", mood: "Rebellious ✊", bio: "Support local zines and bands.", profileTheme: "sunset", emoji_avatar: "✊🎸🖤", favorited_bars: ["venue_gracies", "venue_valley", "venue_yucca"], createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000 },
          "user_star": { uid: "user_star", username: "AstroBoy", mood: "Spacey 🚀", bio: "Staring at the stars from my rooftop.", profileTheme: "cyberpunk", emoji_avatar: "🌌🌠🚀", favorited_bars: ["venue_riot", "venue_bottled"], createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000 },
          "user_cactus": { uid: "user_cactus", username: "CactusJack", mood: "Chillin' 😎", bio: "Desert nights and neon lights.", profileTheme: "sunset", emoji_avatar: "🌵🔥🌙", favorited_bars: ["venue_cobra", "venue_valley", "venue_coach"], createdAt: Date.now() - 4 * 24 * 60 * 60 * 1000 },
          "user_luna": { uid: "user_luna", username: "LunaMoth", mood: "Mellow 🎧", bio: "Listening to lo-fi on the patio at 2am.", profileTheme: "classic", emoji_avatar: "🦋🌙🎧", favorited_bars: ["venue_linger", "venue_gracies", "venue_caseys"], createdAt: Date.now() - 3 * 24 * 60 * 60 * 1000 },
          "user_salsa": { uid: "user_salsa", username: "SalsaVerde", mood: "Excited ⚡", bio: "If the music is playing, I'm dancing.", profileTheme: "sunset", emoji_avatar: "💃🌶️🎶", favorited_bars: ["venue_sunbar", "venue_bottled", "venue_riot"], createdAt: Date.now() - 4 * 24 * 60 * 60 * 1000 },
          "user_mesa": { uid: "user_mesa", username: "MesaMike", mood: "Nostalgic 📼", bio: "Born and raised in the East Valley. Still here.", profileTheme: "classic", emoji_avatar: "🏜️📼🍺", favorited_bars: ["venue_yucca", "venue_caseys"], createdAt: Date.now() - 6 * 24 * 60 * 60 * 1000 },
          "user_copper": { uid: "user_copper", username: "CopperState", mood: "Creative 🎨", bio: "Tattoo artist by day, dive bar philosopher by night.", profileTheme: "cyberpunk", emoji_avatar: "🎨🖋️🍻", favorited_bars: ["venue_gracies", "venue_yucca", "venue_cobra"], createdAt: Date.now() - 3 * 24 * 60 * 60 * 1000 },
          "user_phoenix": { uid: "user_phoenix", username: "PhxRising", mood: "Rebellious ✊", bio: "This city raised me. I raise it back.", profileTheme: "sunset", emoji_avatar: "🔥🏙️✊", favorited_bars: ["venue_valley", "venue_cobra", "venue_gracies"], createdAt: Date.now() - 7 * 24 * 60 * 60 * 1000 },
          "user_dreamer": { uid: "user_dreamer", username: "DayDreamer", mood: "Spacey 🚀", bio: "Head in the clouds, feet on Mill Ave.", profileTheme: "cyberpunk", emoji_avatar: "☁️🚀💫", favorited_bars: ["venue_sunbar", "venue_caseys", "venue_linger"], createdAt: Date.now() - 2 * 24 * 60 * 60 * 1000 },
          "user_habanero": { uid: "user_habanero", username: "Habanero", mood: "Sassy 💅", bio: "Hot takes and hotter salsa.", profileTheme: "sunset", emoji_avatar: "🌶️💅✨", favorited_bars: ["venue_bottled", "venue_riot", "venue_coach"], createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000 },
          "user_monsoon": { uid: "user_monsoon", username: "MonsoonSzn", mood: "Melancholy 🌧️", bio: "I love this city most when it rains.", profileTheme: "classic", emoji_avatar: "🌧️⛈️🌈", favorited_bars: ["venue_linger", "venue_valley"], createdAt: Date.now() - 4 * 24 * 60 * 60 * 1000 },
          "user_roadrunner": { uid: "user_roadrunner", username: "RoadRunner", mood: "Hyper 🤪", bio: "Beep beep. Can't catch me.", profileTheme: "cyberpunk", emoji_avatar: "🏃💨🤪", favorited_bars: ["venue_cobra", "venue_sunbar", "venue_yucca"], createdAt: Date.now() - 3 * 24 * 60 * 60 * 1000 },
          "user_saguaro": { uid: "user_saguaro", username: "SaguaroSoul", mood: "Reflective 📖", bio: "Journaling at the bar. Don't judge.", profileTheme: "classic", emoji_avatar: "🌵📖🌅", favorited_bars: ["venue_gracies", "venue_linger", "venue_caseys"], createdAt: Date.now() - 6 * 24 * 60 * 60 * 1000 },
          "user_scorpion": { uid: "user_scorpion", username: "ScorpionQ", mood: "Emo 🖤", bio: "Nocturnal by choice. Scorpio by birth.", profileTheme: "cyberpunk", emoji_avatar: "🦂🖤🌑", favorited_bars: ["venue_yucca", "venue_valley", "venue_cobra"], createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000 },
          "user_turquoise": { uid: "user_turquoise", username: "TurquoiseRing", mood: "Crushing 😍", bio: "Collecting turquoise and bad decisions.", profileTheme: "sunset", emoji_avatar: "💎💙🌻", favorited_bars: ["venue_coach", "venue_bottled", "venue_gracies"], createdAt: Date.now() - 2 * 24 * 60 * 60 * 1000 },
          "user_prickly": { uid: "user_prickly", username: "PricklyPear", mood: "Ready to Party 🍹", bio: "Margarita in hand, always.", profileTheme: "classic", emoji_avatar: "🍹🌺🎉", favorited_bars: ["venue_riot", "venue_sunbar", "venue_bottled"], createdAt: Date.now() - 4 * 24 * 60 * 60 * 1000 },
          "user_sidewinder": { uid: "user_sidewinder", username: "Sidewinder", mood: "Tired 😴", bio: "Night shift nurse. Bar is my morning coffee.", profileTheme: "classic", emoji_avatar: "🐍😴🌙", favorited_bars: ["venue_caseys", "venue_gracies", "venue_linger"], createdAt: Date.now() - 3 * 24 * 60 * 60 * 1000 }
        };

        let dbUpdated = false;
        // Add missing users and patch favorited_bars onto existing ones
        Object.keys(mockUsersList).forEach(uid => {
          if (!dbData.users[uid]) {
            dbData.users[uid] = mockUsersList[uid];
            dbUpdated = true;
          }
        });
        if (dbUpdated) {
          localStorage.setItem("asl_db", JSON.stringify(dbData));
        }
      } catch (err) {
        console.error("Error upgrading database mock users:", err);
      }
    }
    
    // Merge missing mock accounts into auth pool in case it was already initialized
    const authPool = JSON.parse(localStorage.getItem("asl_auth_users") || "{}");
    const mockAccounts = {
      "sysop@asl.com": { uid: "sysop_admin", password: "adminpassword" },
      "billie@asl.com": { uid: "user_greenday", password: "password123" },
      "sk8r@asl.com": { uid: "user_emo", password: "password123" },
      "jay@asl.com": { uid: "user_hiphop", password: "password123" },
      "ada@asl.com": { uid: "user_coder", password: "password123" },
      "spin@asl.com": { uid: "user_rave", password: "password123" },
      "neon@asl.com": { uid: "user_retro", password: "password123" },
      "vinyl@asl.com": { uid: "user_indie", password: "password123" },
      "iron@asl.com": { uid: "user_metal", password: "password123" },
      "pixel@asl.com": { uid: "user_gamer", password: "password123" },
      "bean@asl.com": { uid: "user_coffee", password: "password123" },
      "riot@asl.com": { uid: "user_punk", password: "password123" },
      "astro@asl.com": { uid: "user_star", password: "password123" },
      "cactus@asl.com": { uid: "user_cactus", password: "password123" },
      "luna@asl.com": { uid: "user_luna", password: "password123" },
      "salsa@asl.com": { uid: "user_salsa", password: "password123" },
      "mesa@asl.com": { uid: "user_mesa", password: "password123" },
      "copper@asl.com": { uid: "user_copper", password: "password123" },
      "phx@asl.com": { uid: "user_phoenix", password: "password123" },
      "dreamer@asl.com": { uid: "user_dreamer", password: "password123" },
      "habanero@asl.com": { uid: "user_habanero", password: "password123" },
      "monsoon@asl.com": { uid: "user_monsoon", password: "password123" },
      "roadrunner@asl.com": { uid: "user_roadrunner", password: "password123" },
      "saguaro@asl.com": { uid: "user_saguaro", password: "password123" },
      "scorpion@asl.com": { uid: "user_scorpion", password: "password123" },
      "turquoise@asl.com": { uid: "user_turquoise", password: "password123" },
      "prickly@asl.com": { uid: "user_prickly", password: "password123" },
      "sidewinder@asl.com": { uid: "user_sidewinder", password: "password123" }
    };
    
    let authUpdated = false;
    Object.keys(mockAccounts).forEach(email => {
      if (!authPool[email]) {
        authPool[email] = mockAccounts[email];
        authUpdated = true;
      }
    });
    if (authUpdated || !localStorage.getItem("asl_auth_users")) {
      localStorage.setItem("asl_auth_users", JSON.stringify(authPool));
    }
  }

  getDb() {
    return JSON.parse(localStorage.getItem("asl_db") || "{}");
  }

  saveDb(dbData) {
    localStorage.setItem("asl_db", JSON.stringify(dbData));
    // Trigger all live subscription listeners
    this.listeners.forEach(l => l());
  }

  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }
}

const simulatedStore = new SimulatedStore();

// Mock Auth Class
class MockAuth {
  constructor() {
    this.currentUser = null;
    this.authStateListeners = [];
    this.loadSession();
  }

  loadSession() {
    const session = localStorage.getItem("asl_auth_session");
    if (session) {
      this.currentUser = JSON.parse(session);
      // Verify ban status immediately on boot
      const db = simulatedStore.getDb();
      if (this.currentUser && db.users[this.currentUser.uid]) {
        const fullUser = db.users[this.currentUser.uid];
        this.currentUser.banned = fullUser.banned;
        this.currentUser.flag_count = fullUser.flag_count;
        this.currentUser.handshake_cooldown = fullUser.handshake_cooldown;
      }
    }
  }

  saveSession() {
    if (this.currentUser) {
      localStorage.setItem("asl_auth_session", JSON.stringify(this.currentUser));
    } else {
      localStorage.removeItem("asl_auth_session");
    }
    this.triggerAuthStateChange();
  }

  triggerAuthStateChange() {
    this.authStateListeners.forEach(cb => cb(this.currentUser));
  }

  onAuthStateChanged(cb) {
    this.authStateListeners.push(cb);
    cb(this.currentUser);
    return () => {
      this.authStateListeners = this.authStateListeners.filter(l => l !== cb);
    };
  }

  async signInAnonymously() {
    if (this.currentUser) return { user: this.currentUser };
    
    const anonId = "anon_" + Math.random().toString(36).slice(2, 11);
    this.currentUser = {
      uid: anonId,
      isAnonymous: true,
      email: null,
      flag_count: 0,
      banned: false,
      uuid: localStorage.getItem("asl_device_uuid") || ""
    };
    
    // Save to Firestore-like simulated DB
    const db = simulatedStore.getDb();
    db.users[anonId] = {
      uid: anonId,
      isAnonymous: true,
      email: null,
      flag_count: 0,
      banned: false,
      uuid: this.currentUser.uuid,
      createdAt: Date.now()
    };
    simulatedStore.saveDb(db);
    this.saveSession();
    return { user: this.currentUser };
  }

  async linkWithCredential(passwordCredential) {
    if (!this.currentUser) throw new Error("No anonymous user to link.");
    const { email, password } = passwordCredential;

    // Check if user already exists in auth pool
    const authPool = JSON.parse(localStorage.getItem("asl_auth_users") || "{}");
    if (authPool[email]) {
      throw new Error("auth/email-already-in-use: The email address is already in use by another account.");
    }

    // Upgrade anonymous user
    authPool[email] = { uid: this.currentUser.uid, password };
    localStorage.setItem("asl_auth_users", JSON.stringify(authPool));

    this.currentUser.isAnonymous = false;
    this.currentUser.email = email;

    const db = simulatedStore.getDb();
    if (db.users[this.currentUser.uid]) {
      db.users[this.currentUser.uid].isAnonymous = false;
      db.users[this.currentUser.uid].email = email;
      simulatedStore.saveDb(db);
    }

    this.saveSession();
    return { user: this.currentUser };
  }

  async signInWithEmailAndPassword(email, password) {
    const authPool = JSON.parse(localStorage.getItem("asl_auth_users") || "{}");
    const account = authPool[email];
    if (!account || account.password !== password) {
      throw new Error("auth/wrong-password-or-user: Invalid credentials.");
    }

    const db = simulatedStore.getDb();
    const userDoc = db.users[account.uid] || {
      uid: account.uid,
      isAnonymous: false,
      email: email,
      flag_count: 0,
      banned: false,
      uuid: ""
    };

    if (userDoc.banned || userDoc.flag_count >= 3) {
      throw new Error("auth/user-disabled: This user has been banned.");
    }

    this.currentUser = {
      uid: account.uid,
      isAnonymous: false,
      email: email,
      flag_count: userDoc.flag_count || 0,
      banned: userDoc.banned || false,
      uuid: userDoc.uuid || ""
    };

    this.saveSession();
    return { user: this.currentUser };
  }

  async linkWithOAuth(email) {
    if (!this.currentUser) throw new Error("No anonymous user to link.");

    const authPool = JSON.parse(localStorage.getItem("asl_auth_users") || "{}");
    authPool[email] = { uid: this.currentUser.uid, password: "oauth_linked" };
    localStorage.setItem("asl_auth_users", JSON.stringify(authPool));

    this.currentUser.isAnonymous = false;
    this.currentUser.email = email;

    const db = simulatedStore.getDb();
    if (db.users[this.currentUser.uid]) {
      db.users[this.currentUser.uid].isAnonymous = false;
      db.users[this.currentUser.uid].email = email;
      simulatedStore.saveDb(db);
    }

    this.saveSession();
    return { user: this.currentUser };
  }

  async signInWithOAuth(email) {
    const authPool = JSON.parse(localStorage.getItem("asl_auth_users") || "{}");
    let account = authPool[email];
    
    if (!account) {
      const newUid = "oauth_" + Math.random().toString(36).slice(2, 11);
      account = { uid: newUid, password: "oauth_linked" };
      authPool[email] = account;
      localStorage.setItem("asl_auth_users", JSON.stringify(authPool));
      
      const db = simulatedStore.getDb();
      db.users[newUid] = {
        uid: newUid,
        isAnonymous: false,
        email: email,
        flag_count: 0,
        banned: false,
        uuid: localStorage.getItem("asl_device_uuid") || "",
        createdAt: Date.now()
      };
      simulatedStore.saveDb(db);
    }

    const db = simulatedStore.getDb();
    const userDoc = db.users[account.uid] || {
      uid: account.uid,
      isAnonymous: false,
      email: email,
      flag_count: 0,
      banned: false,
      uuid: ""
    };

    if (userDoc.banned || userDoc.flag_count >= 3) {
      throw new Error("auth/user-disabled: This user has been banned.");
    }

    this.currentUser = {
      uid: account.uid,
      isAnonymous: false,
      email: email,
      flag_count: userDoc.flag_count,
      banned: userDoc.banned,
      uuid: userDoc.uuid
    };

    this.saveSession();
    return { user: this.currentUser };
  }

  async createUserWithEmailAndPassword(email, password) {
    const authPool = JSON.parse(localStorage.getItem("asl_auth_users") || "{}");
    if (authPool[email]) {
      throw new Error("auth/email-already-in-use: The email address is already in use by another account.");
    }
    
    const newUid = "user_" + Math.random().toString(36).slice(2, 11);
    authPool[email] = { uid: newUid, password };
    localStorage.setItem("asl_auth_users", JSON.stringify(authPool));
    
    this.currentUser = {
      uid: newUid,
      isAnonymous: false,
      email: email,
      flag_count: 0,
      banned: false,
      uuid: localStorage.getItem("asl_device_uuid") || ""
    };
    
    const db = simulatedStore.getDb();
    db.users[newUid] = {
      uid: newUid,
      isAnonymous: false,
      email: email,
      flag_count: 0,
      banned: false,
      uuid: this.currentUser.uuid,
      createdAt: Date.now()
    };
    simulatedStore.saveDb(db);
    
    this.saveSession();
    return { user: this.currentUser };
  }

  async signOut() {
    this.currentUser = null;
    this.saveSession();
  }
}

const mockAuthInstance = new MockAuth();

// ==========================================
// EXPORTS & ADAPTERS
// ==========================================
export const isSimulated = !isRealFirebaseConfigured;

export const auth = isRealFirebaseConfigured ? realAuth : mockAuthInstance;
export const db = isRealFirebaseConfigured ? realDb : {};

// Custom wrapped Firebase operations supporting both modes
export { EmailAuthProvider };

export const firebaseSignInAnonymously = async () => {
  if (isSimulated) {
    return mockAuthInstance.signInAnonymously();
  }
  return signInAnonymously(realAuth);
};

export const firebaseLinkWithCredential = async (email, password) => {
  console.log("firebaseLinkWithCredential: start. isSimulated =", isSimulated, "hasCurrentUser =", !!(isSimulated ? mockAuthInstance.currentUser : realAuth.currentUser));
  if (isSimulated) {
    if (mockAuthInstance.currentUser) {
      console.log("firebaseLinkWithCredential: [Simulated] Linking credentials to current anonymous user...");
      return mockAuthInstance.linkWithCredential({ email, password });
    } else {
      console.log("firebaseLinkWithCredential: [Simulated] Creating new email/password account from scratch...");
      return mockAuthInstance.createUserWithEmailAndPassword(email, password);
    }
  }
  if (realAuth.currentUser) {
    console.log("firebaseLinkWithCredential: [Real] Linking credentials to current anonymous user:", realAuth.currentUser.uid);
    const credential = EmailAuthProvider.credential(email, password);
    try {
      const res = await linkWithCredential(realAuth.currentUser, credential);
      console.log("firebaseLinkWithCredential: [Real] Link completed successfully.");
      return res;
    } catch (err) {
      console.error("firebaseLinkWithCredential: [Real] Link failed:", err);
      throw err;
    }
  } else {
    console.log("firebaseLinkWithCredential: [Real] Creating new email/password account from scratch...");
    try {
      const res = await createUserWithEmailAndPassword(realAuth, email, password);
      console.log("firebaseLinkWithCredential: [Real] Account creation completed successfully.");
      return res;
    } catch (err) {
      console.error("firebaseLinkWithCredential: [Real] Account creation failed:", err);
      throw err;
    }
  }
};

export const firebaseLinkWithOAuth = async (providerName) => {
  if (isSimulated) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    const mockEmail = providerName === "google" ? "hunter.google@gmail.com" : "hunter.apple@icloud.com";
    if (mockAuthInstance.currentUser) {
      return mockAuthInstance.linkWithOAuth(mockEmail);
    } else {
      return mockAuthInstance.signInWithOAuth(mockEmail);
    }
  }
  
  let provider;
  if (providerName === "google") {
    provider = new GoogleAuthProvider();
  } else if (providerName === "apple") {
    provider = new OAuthProvider("apple.com");
  } else {
    throw new Error("Unsupported provider: " + providerName);
  }
  
  if (realAuth.currentUser) {
    return linkWithPopup(realAuth.currentUser, provider);
  } else {
    return signInWithPopup(realAuth, provider);
  }
};

export const firebaseSignInWithOAuth = async (providerName) => {
  if (isSimulated) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    const mockEmail = providerName === "google" ? "hunter.google@gmail.com" : "hunter.apple@icloud.com";
    return mockAuthInstance.signInWithOAuth(mockEmail);
  }
  
  let provider;
  if (providerName === "google") {
    provider = new GoogleAuthProvider();
  } else if (providerName === "apple") {
    provider = new OAuthProvider("apple.com");
  } else {
    throw new Error("Unsupported provider: " + providerName);
  }
  
  return signInWithPopup(realAuth, provider);
};

export const firebaseSignInWithEmailAndPassword = async (email, password) => {
  if (isSimulated) {
    return mockAuthInstance.signInWithEmailAndPassword(email, password);
  }
  return signInWithEmailAndPassword(realAuth, email, password);
};

export const firebaseSignOut = async () => {
  if (isSimulated) {
    return mockAuthInstance.signOut();
  }
  return signOut(realAuth);
};

export const firebaseOnAuthStateChanged = (cb) => {
  if (isSimulated) {
    return mockAuthInstance.onAuthStateChanged(cb);
  }
  return onAuthStateChanged(realAuth, cb);
};

// In simulation mode there is no Cloud Function to maintain the public `profiles`
// mirror, so any read of `profiles` transparently resolves to the `users` store.
const resolveSimCollection = (collectionName) =>
  collectionName === "profiles" ? "users" : collectionName;

// Database operations wrapper
export const dbGetDoc = async (collectionName, docId) => {
  if (isSimulated) {
    const store = simulatedStore.getDb();
    const simColl = resolveSimCollection(collectionName);
    const data = store[simColl] ? store[simColl][docId] : null;
    return {
      exists: () => !!data,
      data: () => data,
      id: docId
    };
  }
  const docRef = doc(realDb, collectionName, docId);
  const snap = await getDoc(docRef);
  return snap;
};

export const dbSetDoc = async (collectionName, docId, data, merge = true) => {
  if (isSimulated) {
    const store = simulatedStore.getDb();
    if (!store[collectionName]) store[collectionName] = {};
    const existing = store[collectionName][docId] || {};
    store[collectionName][docId] = merge ? { ...existing, ...data } : data;
    simulatedStore.saveDb(store);
    return docId;
  }
  const docRef = doc(realDb, collectionName, docId);
  await setDoc(docRef, data, { merge });
  return docId;
};

export const dbAddDoc = async (collectionName, data) => {
  if (isSimulated) {
    if (collectionName === "posts") {
      const text = data.text || "";
      const hasPhone = /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b|\b\d{7}\b|\b\d{10}\b/.test(text);
      const hasEmail = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/.test(text);
      const hasHandle = /@\w+/.test(text) || /\b(instagram|twitter|facebook|tiktok|snapchat)\.com\b/i.test(text);
      const hasUrl = /\b(https?:\/\/|www\.)\S+\b/i.test(text);

      if (hasPhone || hasEmail || hasHandle || hasUrl) {
        const ROASTS = [
          "You sure you want to post that, fam?",
          "This ain't it, chief. The server admin caught you lacking.",
          "Bestie, the validation check failed. Let’s try that again.",
          "Cooked by the system daemon. Post discarded.",
          "Who hurt you? Keep the bad vibes off the local node.",
          "Bro tried to sneak a social handle in. We don’t do that here.",
          "Unc, no phone numbers or real names allowed. Keep it anonymous.",
          "Gatekeeping is a feature, not a bug. Remove the external links.",
          "Not the @ link... Secure portal validation failed."
        ];
        const randomRoast = ROASTS[Math.floor(Math.random() * ROASTS.length)];
        throw new Error(randomRoast);
      }
    }

    const store = simulatedStore.getDb();
    if (!store[collectionName]) store[collectionName] = [];
    
    // Some collections are object maps, some are arrays in simulation. 
    // Let's standardise on arrays for posts, messages, and chats to support lists easily
    const newId = collectionName + "_" + Math.random().toString(36).slice(2, 11);
    const item = { ...data, id: newId, timestamp: Date.now(), status: data.status || "active" };
    
    if (Array.isArray(store[collectionName])) {
      store[collectionName].push(item);
    } else {
      store[collectionName][newId] = item;
    }
    
    simulatedStore.saveDb(store);
    return { id: newId };
  }
  // Posts and connections are created exclusively through Cloud Functions so that
  // moderation, throttles and field integrity are enforced server-side. We do NOT
  // fall back to a direct Firestore write on error — that would silently bypass
  // moderation (a deliberate "post rejected" would just be written anyway). Any
  // error (rejection or outage) is surfaced to the caller.
  if (collectionName === "posts") {
    const { getFunctions, httpsCallable } = await import("firebase/functions");
    const createPostSecure = httpsCallable(getFunctions(), "createPostSecure");
    const result = await createPostSecure(data);
    return { id: result.data.id };
  }

  if (collectionName === "connections") {
    const { getFunctions, httpsCallable } = await import("firebase/functions");
    const createConnectionSecure = httpsCallable(getFunctions(), "createConnectionSecure");
    const result = await createConnectionSecure(data);
    return { id: result.data.id };
  }

  const colRef = collection(realDb, collectionName);
  return await addDoc(colRef, { ...data, timestamp: serverTimestamp() });
};

export const dbCallFunction = async (name, data) => {
  if (isSimulated) {
    console.log(`[SimDB] callFunction (simulated): ${name}`, data);
    
    if (name === "submitAppealSecure") {
      const store = simulatedStore.getDb();
      if (!store.appeals) store.appeals = [];
      const newId = "appeal_" + Math.random().toString(36).slice(2, 11);
      const item = {
        id: newId,
        userId: data.userId || "unknown",
        email: data.email || "anonymous",
        deviceUuid: data.deviceUuid || "",
        reason: data.reason || "",
        timestamp: Date.now(),
        status: "pending"
      };
      if (Array.isArray(store.appeals)) {
        store.appeals.push(item);
      } else {
        store.appeals[newId] = item;
      }
      simulatedStore.saveDb(store);
    }
    
    if (name === "wipeUserDataSecure") {
      const uid = data.uid || (mockAuthInstance.currentUser ? mockAuthInstance.currentUser.uid : null);
      if (uid) {
        const store = simulatedStore.getDb();
        if (store.users && store.users[uid]) delete store.users[uid];
        if (store.posts) store.posts = store.posts.filter(p => p.userId !== uid);
        if (store.connections) {
          if (Array.isArray(store.connections)) {
            store.connections = store.connections.filter(c => c.senderId !== uid && c.receiverId !== uid);
          } else {
            Object.keys(store.connections).forEach(id => {
              if (store.connections[id].senderId === uid || store.connections[id].receiverId === uid) {
                delete store.connections[id];
              }
            });
          }
        }
        if (store.chats) {
          if (Array.isArray(store.chats)) {
            store.chats = store.chats.filter(c => !c.participants || !c.participants.includes(uid));
          } else {
            Object.keys(store.chats).forEach(id => {
              if (store.chats[id].participants && store.chats[id].participants.includes(uid)) {
                delete store.chats[id];
              }
            });
          }
        }
        simulatedStore.saveDb(store);
      }
      if (mockAuthInstance.currentUser) {
        const uid = mockAuthInstance.currentUser.uid;
        const authPool = JSON.parse(localStorage.getItem("asl_auth_users") || "{}");
        const oldEmail = Object.keys(authPool).find(k => authPool[k].uid === uid);
        if (oldEmail) {
          delete authPool[oldEmail];
          localStorage.setItem("asl_auth_users", JSON.stringify(authPool));
        }
        mockAuthInstance.currentUser = null;
        mockAuthInstance.saveSession();
      }
    }

    if (name === "resolveAppeal") {
      const store = simulatedStore.getDb();
      const userId = data.userId;
      if (store.users && store.users[userId]) {
        store.users[userId].flag_count = 0;
        store.users[userId].banned = false;
        store.users[userId].isBanned = false;
        store.users[userId].reporterIds = [];
        
        const uuid = store.users[userId].uuid;
        if (uuid && store.blacklisted_devices && store.blacklisted_devices[uuid]) {
          delete store.blacklisted_devices[uuid];
        }
      }
      if (store.appeals) {
        if (Array.isArray(store.appeals)) {
          store.appeals = store.appeals.filter(a => a.id !== data.appealId && a.userId !== userId);
        } else if (store.appeals[data.appealId]) {
          delete store.appeals[data.appealId];
        }
      }
      simulatedStore.saveDb(store);
    }

    if (name === "restorePost") {
      const store = simulatedStore.getDb();
      const postId = data.postId;
      if (store.posts) {
        if (Array.isArray(store.posts)) {
          const post = store.posts.find(p => p.id === postId);
          if (post) {
            post.status = "active";
            delete post.reported;
            delete post.reportReason;
          }
        } else if (store.posts[postId]) {
          store.posts[postId].status = "active";
          delete store.posts[postId].reported;
          delete store.posts[postId].reportReason;
        }
      }
      simulatedStore.saveDb(store);
    }

    return { success: true };
  }
  const { getFunctions, httpsCallable } = await import("firebase/functions");
  const fns = getFunctions();
  const fn = httpsCallable(fns, name);
  const result = await fn(data);
  return result.data;
};

export const dbSubmitReport = async ({ targetUserId, postId, reason }) => {
  if (isSimulated) {
    console.log("[SimDB] submitReport (simulated) for", targetUserId);
    return { success: true };
  }
  const { getFunctions, httpsCallable } = await import("firebase/functions");
  const fns = getFunctions();
  const fn = httpsCallable(fns, "submitReport");
  const result = await fn({ targetUserId, postId, reason });
  return result.data;
};

export const dbUpdateDoc = async (collectionName, docId, data) => {
  if (isSimulated) {
    const store = simulatedStore.getDb();
    
    // Check if it is a dictionary collection
    if (store[collectionName] && store[collectionName][docId]) {
      store[collectionName][docId] = { ...store[collectionName][docId], ...data };
      
      // Perform simulated Cloud Function trigger for user flags
      if (collectionName === "users" && data.flag_count !== undefined) {
        const user = store[collectionName][docId];
        if (user.flag_count >= 3 && !user.banned) {
          user.banned = true;
          console.log(`[Simulation Cloud Function] Flag count for ${docId} reached 3. Banning user and blacklisting device.`);
          if (user.uuid) {
            if (!store.blacklisted_devices) store.blacklisted_devices = {};
            store.blacklisted_devices[user.uuid] = { banned: true, userId: docId, timestamp: Date.now() };
          }
          // Also update active session if it matches this user
          if (mockAuthInstance.currentUser && mockAuthInstance.currentUser.uid === docId) {
            mockAuthInstance.currentUser.banned = true;
            mockAuthInstance.currentUser.flag_count = user.flag_count;
            mockAuthInstance.saveSession();
          }
        }
      }
    } else if (Array.isArray(store[collectionName])) {
      // If array list (e.g. connections, posts)
      const idx = store[collectionName].findIndex(item => item.id === docId);
      if (idx !== -1) {
        store[collectionName][idx] = { ...store[collectionName][idx], ...data };
      }
    }
    
    simulatedStore.saveDb(store);
    return docId;
  }
  const docRef = doc(realDb, collectionName, docId);
  await updateDoc(docRef, data);
  return docId;
};

// Atomically adjust a single numeric field by `delta` (e.g. +1 / -1 for likes).
// Uses a Firestore server-side increment so concurrent writers don't clobber
// each other, and clamps the result to >= 0 in the simulated store.
export const dbIncrementField = async (collectionName, docId, field, delta) => {
  if (isSimulated) {
    const store = simulatedStore.getDb();
    const applyDelta = (obj) => {
      const current = typeof obj[field] === "number" ? obj[field] : 0;
      obj[field] = Math.max(0, current + delta);
    };
    if (store[collectionName] && store[collectionName][docId]) {
      applyDelta(store[collectionName][docId]);
    } else if (Array.isArray(store[collectionName])) {
      const idx = store[collectionName].findIndex(item => item.id === docId);
      if (idx !== -1) applyDelta(store[collectionName][idx]);
    }
    simulatedStore.saveDb(store);
    return docId;
  }
  const docRef = doc(realDb, collectionName, docId);
  await updateDoc(docRef, { [field]: increment(delta) });
  return docId;
};

export const dbDeleteDoc = async (collectionName, docId) => {
  if (isSimulated) {
    const store = simulatedStore.getDb();
    if (store[collectionName] && store[collectionName][docId]) {
      delete store[collectionName][docId];
    } else if (Array.isArray(store[collectionName])) {
      store[collectionName] = store[collectionName].filter(item => item.id !== docId);
    }
    simulatedStore.saveDb(store);
    return docId;
  }
  const docRef = doc(realDb, collectionName, docId);
  await deleteDoc(docRef);
  return docId;
};

export const dbGetDocs = async (collectionName, queryConstraints = []) => {
  if (isSimulated) {
    const store = simulatedStore.getDb();
    let source = store[resolveSimCollection(collectionName)] || [];
    let list = [];
    if (Array.isArray(source)) {
      list = source.map(item => ({
        ...item,
        id: item.id || item.uid
      }));
    } else {
      list = Object.entries(source).map(([key, item]) => ({
        ...item,
        id: item.id || item.uid || key
      }));
    }

    // Apply basic constraints
    queryConstraints.forEach(c => {
      if (c.type === "where") {
        const { field, op, value } = c;
        if (op === "==") {
          list = list.filter(item => item[field] === value);
        } else if (op === "array-contains") {
          list = list.filter(item => Array.isArray(item[field]) && item[field].includes(value));
        } else if (op === ">=") {
          list = list.filter(item => item[field] >= value);
        } else if (op === "<=") {
          list = list.filter(item => item[field] <= value);
        } else if (op === ">") {
          list = list.filter(item => item[field] > value);
        } else if (op === "<") {
          list = list.filter(item => item[field] < value);
        }
      }
    });

    const hasOrder = queryConstraints.some(c => c.type === "orderBy");
    if (hasOrder) {
      const orderC = queryConstraints.find(c => c.type === "orderBy");
      const dir = orderC.direction || "asc";
      list.sort((a, b) => {
        const tA = a.timestamp || 0;
        const tB = b.timestamp || 0;
        return dir === "desc" ? tB - tA : tA - tB;
      });
    }

    const limitC = queryConstraints.find(c => c.type === "limit");
    if (limitC) {
      list = list.slice(0, limitC.value);
    }

    return {
      docs: list.map(item => ({
        id: item.id,
        data: () => item
      })),
      size: list.length,
      empty: list.length === 0
    };
  }

  // Real Firebase mapping
  let qRef = collection(realDb, collectionName);
  const firestoreConstraints = [];
  queryConstraints.forEach(c => {
    if (c.type === "where") {
      firestoreConstraints.push(where(c.field, c.op, c.value));
    } else if (c.type === "orderBy") {
      firestoreConstraints.push(orderBy(c.field, c.direction));
    } else if (c.type === "limit") {
      firestoreConstraints.push(limit(c.value));
    }
  });

  if (firestoreConstraints.length > 0) {
    qRef = query(qRef, ...firestoreConstraints);
  }
  const snap = await getDocs(qRef);
  return snap;
};

export const dbOnSnapshot = (collectionName, queryConstraints = [], callback) => {
  if (isSimulated) {
    const runQuery = () => {
      const store = simulatedStore.getDb();
      let source = store[resolveSimCollection(collectionName)] || [];
      let list = [];
      if (Array.isArray(source)) {
        list = source.map(item => ({
          ...item,
          id: item.id || item.uid
        }));
      } else {
        list = Object.entries(source).map(([key, item]) => ({
          ...item,
          id: item.id || item.uid || key
        }));
      }

      // Apply basic constraints
      queryConstraints.forEach(c => {
        if (c.type === "where") {
          const { field, op, value } = c;
          if (op === "==") {
            list = list.filter(item => item[field] === value);
          } else if (op === "array-contains") {
            list = list.filter(item => Array.isArray(item[field]) && item[field].includes(value));
          } else if (op === ">=") {
            list = list.filter(item => item[field] >= value);
          } else if (op === "<=") {
            list = list.filter(item => item[field] <= value);
          } else if (op === ">") {
            list = list.filter(item => item[field] > value);
          } else if (op === "<") {
            list = list.filter(item => item[field] < value);
          }
        }
      });

      // Sort by timestamp if queryConstraints contains ordering
      const hasOrder = queryConstraints.some(c => c.type === "orderBy");
      if (hasOrder) {
        const orderC = queryConstraints.find(c => c.type === "orderBy");
        const dir = orderC.direction || "asc";
        list.sort((a, b) => {
          const tA = a.timestamp || 0;
          const tB = b.timestamp || 0;
          return dir === "desc" ? tB - tA : tA - tB;
        });
      } else {
        // Default sort descending by timestamp
        list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      }

      // Limit results
      const limitC = queryConstraints.find(c => c.type === "limit");
      if (limitC) {
        list = list.slice(0, limitC.value);
      }

      callback({
        docs: list.map(item => ({
          id: item.id,
          data: () => item
        })),
        size: list.length,
        empty: list.length === 0
      });
    };

    runQuery();
    return simulatedStore.subscribe(runQuery);
  }

  // Real Firebase mapping
  let qRef = collection(realDb, collectionName);
  const firestoreConstraints = [];
  queryConstraints.forEach(c => {
    if (c.type === "where") {
      firestoreConstraints.push(where(c.field, c.op, c.value));
    } else if (c.type === "orderBy") {
      firestoreConstraints.push(orderBy(c.field, c.direction));
    } else if (c.type === "limit") {
      firestoreConstraints.push(limit(c.value));
    }
  });

  if (firestoreConstraints.length > 0) {
    qRef = query(qRef, ...firestoreConstraints);
  }

  return onSnapshot(qRef, (snap) => {
    callback({
      docs: snap.docs,
      size: snap.size,
      empty: snap.empty
    });
  });
};

// Subscribe to a single document (used for the current user's own private doc,
// which is owner-readable — a full-collection listener would be denied by rules).
export const dbOnSnapshotDoc = (collectionName, docId, callback) => {
  if (isSimulated) {
    const run = () => {
      const store = simulatedStore.getDb();
      const coll = store[resolveSimCollection(collectionName)];
      let item = null;
      if (Array.isArray(coll)) {
        item = coll.find(i => (i.id || i.uid) === docId) || null;
      } else if (coll) {
        item = coll[docId] || null;
      }
      callback({ id: docId, exists: () => !!item, data: () => item });
    };
    run();
    return simulatedStore.subscribe(run);
  }

  return onSnapshot(doc(realDb, collectionName, docId), (snap) => {
    callback({ id: snap.id, exists: () => snap.exists(), data: () => snap.data() });
  });
};

// Query Builders for real Firebase mapping in client code
export const queryWhere = (field, op, value) => ({ type: "where", field, op, value });
export const queryOrderBy = (field, direction = "asc") => ({ type: "orderBy", field, direction });
export const queryLimit = (value) => ({ type: "limit", value });

// Settings / Preferences helpers supporting both simulated and real modes
export const firebaseWipeUserData = async (uid) => {
  if (isSimulated) {
    const store = simulatedStore.getDb();
    if (store.users && store.users[uid]) {
      delete store.users[uid];
    }
    if (store.posts) {
      store.posts = store.posts.filter(p => p.userId !== uid);
    }
    if (store.connections) {
      Object.keys(store.connections).forEach(id => {
        if (store.connections[id].senderId === uid || store.connections[id].receiverId === uid) {
          delete store.connections[id];
        }
      });
    }
    if (store.chats) {
      Object.keys(store.chats).forEach(id => {
        if (store.chats[id].participants && store.chats[id].participants.includes(uid)) {
          delete store.chats[id];
        }
      });
    }
    simulatedStore.saveDb(store);
    return;
  }

  // Real Firebase Mode
  const { getFunctions, httpsCallable } = await import("firebase/functions");
  const fns = getFunctions();
  const fn = httpsCallable(fns, "wipeUserDataSecure");
  await fn({ uid });
};

export const firebaseUpdateEmail = async (newEmail) => {
  if (isSimulated) {
    if (!mockAuthInstance.currentUser) throw new Error("No authenticated user.");
    const uid = mockAuthInstance.currentUser.uid;
    const authPool = JSON.parse(localStorage.getItem("asl_auth_users") || "{}");
    const oldEmail = Object.keys(authPool).find(k => authPool[k].uid === uid);
    if (oldEmail) {
      const creds = authPool[oldEmail];
      delete authPool[oldEmail];
      authPool[newEmail] = creds;
      localStorage.setItem("asl_auth_users", JSON.stringify(authPool));
    }
    // Update simulated DB user doc
    const dbData = simulatedStore.getDb();
    if (dbData.users && dbData.users[uid]) {
      dbData.users[uid].email = newEmail;
      simulatedStore.saveDb(dbData);
    }
    // Update active session
    mockAuthInstance.currentUser.email = newEmail;
    mockAuthInstance.saveSession();
    return;
  }

  // Real Firebase Mode
  if (!realAuth.currentUser) throw new Error("No authenticated user.");
  await updateEmail(realAuth.currentUser, newEmail);
};

export const firebaseSendPasswordResetEmail = async (email) => {
  if (isSimulated) {
    // Simulated mode success
    console.log(`[Simulation] Password reset email sent to: ${email}`);
    return;
  }

  // Real Firebase Mode
  await sendPasswordResetEmail(realAuth, email);
};

export const firebaseDeleteAuthUser = async () => {
  if (isSimulated) {
    if (!mockAuthInstance.currentUser) return;
    const uid = mockAuthInstance.currentUser.uid;
    const authPool = JSON.parse(localStorage.getItem("asl_auth_users") || "{}");
    const oldEmail = Object.keys(authPool).find(k => authPool[k].uid === uid);
    if (oldEmail) {
      delete authPool[oldEmail];
      localStorage.setItem("asl_auth_users", JSON.stringify(authPool));
    }
    mockAuthInstance.currentUser = null;
    mockAuthInstance.saveSession();
    return;
  }

  // Real Firebase Mode
  if (!realAuth.currentUser) return;
  await deleteUser(realAuth.currentUser);
};

