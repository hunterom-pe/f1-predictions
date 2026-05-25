import { initializeApp, getApps } from "firebase/app";
import { 
  getAuth, 
  signInAnonymously, 
  linkWithCredential, 
  EmailAuthProvider, 
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateEmail,
  sendPasswordResetEmail,
  deleteUser
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
  getDocs
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
    realAuth = getAuth(firebaseApp);
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
            bio: "Co-founder of asl. Let me know if you have any questions!",
            profileTheme: "classic",
            emoji_avatar: "👥🥃💖",
            favorited_bars: ["venue_cobra", "venue_gracies"],
            createdAt: Date.now() - 10 * 24 * 60 * 60 * 1000 // 10 days ago
          },
          "sysop_admin": {
            uid: "sysop_admin",
            username: "SysOp",
            mood: "Monitoring 🖥️",
            bio: "System Operator admin console.",
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
            status: "active"
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
            status: "active"
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
            status: "active"
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
            status: "active"
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
            status: "active"
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
            status: "active"
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
          }
        ],
        connections: {},
        chats: {},
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
          "sysop_admin": { uid: "sysop_admin", username: "SysOp", mood: "Monitoring 🖥️", bio: "System Operator.", profileTheme: "cyberpunk", emoji_avatar: "🖥️💾⚡", favorited_bars: [], createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000 },
          "user_greenday": { uid: "user_greenday", username: "BillieJoe", mood: "Rockin' 🎸", bio: "Boulevard of broken dreams.", profileTheme: "classic", emoji_avatar: "🎸🥁😎", favorited_bars: ["venue_cobra", "venue_valley", "venue_yucca"], createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000 },
          "user_emo": { uid: "user_emo", username: "Sk8rBoi", mood: "Melancholy 🌧️", bio: "Can I make it any more obvious?", profileTheme: "sunset", emoji_avatar: "🛹🛹🌧️", favorited_bars: ["venue_caseys", "venue_yucca"], createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000 },
          "user_hiphop": { uid: "user_hiphop", username: "JayZFan", mood: "Chillin' 😎", bio: "99 problems.", profileTheme: "classic", emoji_avatar: "🎧🎤🔥", favorited_bars: ["venue_gracies", "venue_bottled"], createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000 },
          "user_coder": { uid: "user_coder", username: "AdaLovelace", mood: "Excited ⚡", bio: "Coding since 1999.", profileTheme: "cyberpunk", emoji_avatar: "💻📠⚡", favorited_bars: ["venue_valley", "venue_linger"], createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000 },
          "user_rave": { uid: "user_rave", username: "SpinMaster", mood: "Ready to Party 🍹", bio: "Warehouse rave.", profileTheme: "glitter", emoji_avatar: "🍹🎧✨", favorited_bars: ["venue_sunbar", "venue_riot"], createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000 },
          "user_retro": { uid: "user_retro", username: "NeonVibes", mood: "Chillin' 😎", bio: "Synthwave loop.", profileTheme: "sunset", emoji_avatar: "💡🌴🌅", favorited_bars: ["venue_cobra", "venue_linger", "venue_gracies"], createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000 },
          "user_indie": { uid: "user_indie", username: "VinylLover", mood: "Mellow 🎧", bio: "Vinyl collector.", profileTheme: "classic", emoji_avatar: "🎵📻🎧", favorited_bars: ["venue_valley", "venue_caseys"], createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000 },
          "user_metal": { uid: "user_metal", username: "IronMaiden", mood: "Goth Emo 🖤", bio: "Heavy metal.", profileTheme: "sunset", emoji_avatar: "⚡🎸🖤", favorited_bars: ["venue_yucca", "venue_cobra"], createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000 },
          "user_gamer": { uid: "user_gamer", username: "PixelKnight", mood: "Gaming 🎮", bio: "Galaga champ.", profileTheme: "cyberpunk", emoji_avatar: "🎮👾🏆", favorited_bars: ["venue_cobra", "venue_sunbar"], createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000 },
          "user_coffee": { uid: "user_coffee", username: "BeanQueen", mood: "Caffeinated ☕", bio: "Espresso lifer.", profileTheme: "classic", emoji_avatar: "☕🍩⏳", favorited_bars: ["venue_linger", "venue_caseys"], createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000 },
          "user_punk": { uid: "user_punk", username: "RiotGrrrl", mood: "Rebellious ✊", bio: "Support local zines.", profileTheme: "sunset", emoji_avatar: "✊🎸🖤", favorited_bars: ["venue_gracies", "venue_valley", "venue_yucca"], createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000 },
          "user_star": { uid: "user_star", username: "AstroBoy", mood: "Dreamy 🌌", bio: "Rooftop stargazing.", profileTheme: "cyberpunk", emoji_avatar: "🌌🌠🚀", favorited_bars: ["venue_riot", "venue_bottled"], createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000 }
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
      "astro@asl.com": { uid: "user_star", password: "password123" }
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
  if (isSimulated) {
    return mockAuthInstance.linkWithCredential({ email, password });
  }
  const credential = EmailAuthProvider.credential(email, password);
  return linkWithCredential(realAuth.currentUser, credential);
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

// Database operations wrapper
export const dbGetDoc = async (collectionName, docId) => {
  if (isSimulated) {
    const store = simulatedStore.getDb();
    const data = store[collectionName] ? store[collectionName][docId] : null;
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
    const item = { ...data, id: newId, timestamp: Date.now(), status: "active" };
    
    if (Array.isArray(store[collectionName])) {
      store[collectionName].push(item);
    } else {
      store[collectionName][newId] = item;
    }
    
    simulatedStore.saveDb(store);
    return { id: newId };
  }
  if (collectionName === "posts") {
    try {
      const { getFunctions, httpsCallable } = await import("firebase/functions");
      const functions = getFunctions();
      const createPostSecure = httpsCallable(functions, "createPostSecure");
      const result = await createPostSecure(data);
      return { id: result.data.id };
    } catch (err) {
      throw err;
    }
  }

  const colRef = collection(realDb, collectionName);
  return await addDoc(colRef, { ...data, timestamp: serverTimestamp() });
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
    let source = store[collectionName] || [];
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
      let source = store[collectionName] || [];
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
  const firestore = realDb;
  // 1. Delete user doc
  await deleteDoc(doc(firestore, "users", uid));

  // 2. Delete user's posts
  const postsQuery = query(collection(firestore, "posts"), where("userId", "==", uid));
  const postsSnap = await getDocs(postsQuery);
  for (const docObj of postsSnap.docs) {
    await deleteDoc(docObj.ref);
  }

  // 3. Delete user's connections (as sender)
  const connQuery1 = query(collection(firestore, "connections"), where("senderId", "==", uid));
  const connSnap1 = await getDocs(connQuery1);
  for (const docObj of connSnap1.docs) {
    await deleteDoc(docObj.ref);
  }

  // 4. Delete user's connections (as receiver)
  const connQuery2 = query(collection(firestore, "connections"), where("receiverId", "==", uid));
  const connSnap2 = await getDocs(connQuery2);
  for (const docObj of connSnap2.docs) {
    await deleteDoc(docObj.ref);
  }

  // 5. Delete chats user is participating in
  const chatsQuery = query(collection(firestore, "chats"), where("participants", "array-contains", uid));
  const chatsSnap = await getDocs(chatsQuery);
  for (const docObj of chatsSnap.docs) {
    await deleteDoc(docObj.ref);
  }
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

