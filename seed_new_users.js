import { readFileSync } from 'fs';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, addDoc, getDocs, deleteDoc, updateDoc, query, where } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';

// Read config
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
const auth = getAuth(app);

// ── All Phoenix venues ──
const VENUES = {
  venue_cobra:   { id: "venue_cobra",   name: "Cobra Arcade Bar",          address: "801 N 2nd St, Phoenix, AZ 85004",              city: "Phoenix", zone: "Downtown" },
  venue_valley:  { id: "venue_valley",  name: "Valley Bar",                address: "130 N Central Ave, Phoenix, AZ 85004",          city: "Phoenix", zone: "Downtown" },
  venue_gracies: { id: "venue_gracies", name: "Gracies Tax Bar",           address: "711 N 7th Ave, Phoenix, AZ 85007",              city: "Phoenix", zone: "Downtown" },
  venue_linger:  { id: "venue_linger",  name: "Linger Longer Lounge",      address: "6522 N 16th St, Phoenix, AZ 85016",             city: "Phoenix", zone: "Downtown" },
  venue_caseys:  { id: "venue_caseys",  name: "Casey Moore's Oyster House", address: "850 S Ash Ave, Tempe, AZ 85281",               city: "Phoenix", zone: "Tempe" },
  venue_yucca:   { id: "venue_yucca",   name: "Yucca Tap Room",            address: "29 W Southern Ave, Tempe, AZ 85282",            city: "Phoenix", zone: "Tempe" },
  venue_sunbar:  { id: "venue_sunbar",  name: "Sunbar Tempe",              address: "24 W 5th St, Tempe, AZ 85281",                  city: "Phoenix", zone: "Tempe" },
  venue_bottled: { id: "venue_bottled", name: "Bottled Blonde",            address: "7340 E Indian Plaza, Scottsdale, AZ 85251",      city: "Phoenix", zone: "Old Town" },
  venue_riot:    { id: "venue_riot",    name: "Riot House",                address: "4425 N Saddlebag Trail, Scottsdale, AZ 85251",   city: "Phoenix", zone: "Old Town" },
  venue_coach:   { id: "venue_coach",   name: "Coach House",               address: "7011 E Indian School Rd, Scottsdale, AZ 85251", city: "Phoenix", zone: "Old Town" },
};

// ── 15 New Users (all valid moods from the dropdown) ──
const NEW_USERS = [
  { key: "user_cactus",     email: "cactus@asl.com",     username: "CactusJack",    mood: "Chillin' 😎",       bio: "Desert nights and neon lights.",                      emoji_avatar: "🌵🔥🌙",  theme: "sunset",   bars: ["venue_cobra", "venue_valley", "venue_coach"] },
  { key: "user_luna",       email: "luna@asl.com",       username: "LunaMoth",      mood: "Mellow 🎧",         bio: "Listening to lo-fi on the patio at 2am.",              emoji_avatar: "🦋🌙🎧",  theme: "classic",  bars: ["venue_linger", "venue_gracies", "venue_caseys"] },
  { key: "user_salsa",      email: "salsa@asl.com",      username: "SalsaVerde",    mood: "Excited ⚡",        bio: "If the music is playing, I'm dancing.",                emoji_avatar: "💃🌶️🎶", theme: "sunset",   bars: ["venue_sunbar", "venue_bottled", "venue_riot"] },
  { key: "user_mesa",       email: "mesa@asl.com",       username: "MesaMike",      mood: "Nostalgic 📼",      bio: "Born and raised in the East Valley. Still here.",      emoji_avatar: "🏜️📼🍺", theme: "classic",  bars: ["venue_yucca", "venue_caseys"] },
  { key: "user_copper",     email: "copper@asl.com",     username: "CopperState",   mood: "Creative 🎨",       bio: "Tattoo artist by day, dive bar philosopher by night.", emoji_avatar: "🎨🖋️🍻", theme: "cyberpunk", bars: ["venue_gracies", "venue_yucca", "venue_cobra"] },
  { key: "user_phoenix",    email: "phx@asl.com",        username: "PhxRising",     mood: "Rebellious ✊",     bio: "This city raised me. I raise it back.",                emoji_avatar: "🔥🏙️✊",  theme: "sunset",   bars: ["venue_valley", "venue_cobra", "venue_gracies"] },
  { key: "user_dreamer",    email: "dreamer@asl.com",    username: "DayDreamer",    mood: "Spacey 🚀",         bio: "Head in the clouds, feet on Mill Ave.",                emoji_avatar: "☁️🚀💫",  theme: "cyberpunk", bars: ["venue_sunbar", "venue_caseys", "venue_linger"] },
  { key: "user_habanero",   email: "habanero@asl.com",   username: "Habanero",      mood: "Sassy 💅",          bio: "Hot takes and hotter salsa.",                          emoji_avatar: "🌶️💅✨",  theme: "sunset",   bars: ["venue_bottled", "venue_riot", "venue_coach"] },
  { key: "user_monsoon",    email: "monsoon@asl.com",    username: "MonsoonSzn",    mood: "Melancholy 🌧️",    bio: "I love this city most when it rains.",                 emoji_avatar: "🌧️⛈️🌈", theme: "classic",  bars: ["venue_linger", "venue_valley"] },
  { key: "user_roadrunner", email: "roadrunner@asl.com", username: "RoadRunner",    mood: "Hyper 🤪",          bio: "Beep beep. Can't catch me.",                           emoji_avatar: "🏃💨🤪",  theme: "cyberpunk", bars: ["venue_cobra", "venue_sunbar", "venue_yucca"] },
  { key: "user_saguaro",    email: "saguaro@asl.com",    username: "SaguaroSoul",   mood: "Reflective 📖",     bio: "Journaling at the bar. Don't judge.",                  emoji_avatar: "🌵📖🌅",  theme: "classic",  bars: ["venue_gracies", "venue_linger", "venue_caseys"] },
  { key: "user_scorpion",   email: "scorpion@asl.com",   username: "ScorpionQ",     mood: "Emo 🖤",       bio: "Nocturnal by choice. Scorpio by birth.",               emoji_avatar: "🦂🖤🌑",  theme: "cyberpunk", bars: ["venue_yucca", "venue_valley", "venue_cobra"] },
  { key: "user_turquoise",  email: "turquoise@asl.com",  username: "TurquoiseRing", mood: "Crushing 😍",       bio: "Collecting turquoise and bad decisions.",               emoji_avatar: "💎💙🌻",  theme: "sunset",   bars: ["venue_coach", "venue_bottled", "venue_gracies"] },
  { key: "user_prickly",    email: "prickly@asl.com",    username: "PricklyPear",   mood: "Ready to Party 🍹", bio: "Margarita in hand, always.",                            emoji_avatar: "🍹🌺🎉",  theme: "classic",  bars: ["venue_riot", "venue_sunbar", "venue_bottled"] },
  { key: "user_sidewinder", email: "sidewinder@asl.com", username: "Sidewinder",    mood: "Tired 😴",          bio: "Night shift nurse. Bar is my morning coffee.",          emoji_avatar: "🐍😴🌙",  theme: "classic",  bars: ["venue_caseys", "venue_gracies", "venue_linger"] },
];

// ── Posts for each new user ──
const NEW_POSTS = [
  { userKey: "user_cactus",     venueKey: "venue_cobra",   date: "May 24, 2026", timeRange: "9:00 PM - 11:00 PM",  daysAgo: 0.01, text: "You were feeding quarters into Ms. Pac-Man like your life depended on it. Tank top, arm tattoos, huge smile every time you died. I was the one clapping from behind you. Should've said something." },
  { userKey: "user_luna",       venueKey: "venue_linger",  date: "May 24, 2026", timeRange: "7:00 PM - 9:00 PM",   daysAgo: 0.014, text: "You were the only person on the patio reading a book while everyone else was screaming at the game on TV. Glasses, messy bun, iced tea. I wanted to ask what you were reading but I'm a coward." },
  { userKey: "user_salsa",      venueKey: "venue_sunbar",  date: "May 23, 2026", timeRange: "11:00 PM - 1:00 AM",  daysAgo: 0.05, text: "You grabbed my hand during the DJ drop and we danced for three songs straight. Red lipstick, gold hoop earrings. You disappeared when your friends dragged you to the next bar. Come back." },
  { userKey: "user_mesa",       venueKey: "venue_yucca",   date: "May 22, 2026", timeRange: "10:00 PM - midnight", daysAgo: 0.42, text: "You were at the pinball machine wearing a faded Descendents shirt. We argued about whether Black Flag or Minor Threat was better. You won. I want a rematch over beers." },
  { userKey: "user_copper",     venueKey: "venue_gracies", date: "May 24, 2026", timeRange: "8:00 PM - 10:00 PM",  daysAgo: 0.007, text: "You were sketching on a napkin at the end of the bar. I peeked and it was a portrait of the bartender. Absolutely incredible. Denim vest, rings on every finger. I wanted to tell you it was beautiful." },
  { userKey: "user_phoenix",    venueKey: "venue_valley",  date: "May 23, 2026", timeRange: "10:00 PM - 12:30 AM", daysAgo: 0.058, text: "Basement show. You were moshing but in a respectful way — kept picking people up when they fell. Shaved sides, band tee, doc martens. You high-fived me after the encore. I should've asked for more than a high five." },
  { userKey: "user_dreamer",    venueKey: "venue_caseys",  date: "May 24, 2026", timeRange: "9:30 PM - 11:00 PM",  daysAgo: 0.017, text: "You told the ghost story about the house to a group of freshmen and they were TERRIFIED. Backwards cap, flannel tied around your waist. You caught me laughing and said 'believe it or not.' I believe you." },
  { userKey: "user_habanero",   venueKey: "venue_bottled", date: "May 23, 2026", timeRange: "11:30 PM - 1:00 AM",  daysAgo: 0.083, text: "You ordered a pizza and ate the entire thing alone at the bar with zero shame. White crop top, sunglasses on your head even though it was midnight. Iconic behavior. I need to know you." },
  { userKey: "user_monsoon",    venueKey: "venue_valley",  date: "May 22, 2026", timeRange: "9:00 PM - 11:00 PM",  daysAgo: 0.58, text: "It was raining and we both ran inside at the same time. You shook the water off your jacket onto me and apologized by buying me a shot. Curly hair, denim on denim. That shot tasted like destiny." },
  { userKey: "user_roadrunner", venueKey: "venue_cobra",   date: "May 24, 2026", timeRange: "8:00 PM - 10:30 PM",  daysAgo: 0.009, text: "You were speed-running Donkey Kong and a crowd formed. Bright green sneakers, energy drink in hand. When you beat the level you turned around and bowed. Absolutely unhinged. I'm in love." },
  { userKey: "user_saguaro",    venueKey: "venue_caseys",  date: "May 21, 2026", timeRange: "7:30 PM - 9:30 PM",   daysAgo: 1.16, text: "You were writing in a leather journal on the patio. It started raining and you didn't move — you just closed your eyes and smiled. White linen shirt, turquoise necklace. That moment was a painting." },
  { userKey: "user_scorpion",   venueKey: "venue_yucca",   date: "May 22, 2026", timeRange: "2:30 AM - 4:00 AM",   daysAgo: 0.83, text: "3 AM at Yucca. You were the only other person there. We didn't talk — just sat at opposite ends of the bar in complete silence. It was the most comfortable silence I've ever had with a stranger. All black outfit, silver chain." },
  { userKey: "user_turquoise",  venueKey: "venue_coach",   date: "May 24, 2026", timeRange: "6:00 PM - 8:00 PM",   daysAgo: 0.005, text: "Under the Christmas lights at Coach House, you were telling the bartender about how you make your own jewelry. Turquoise ring, straw hat, cowboy boots. Every ring had a story. I wanted to hear them all." },
  { userKey: "user_prickly",    venueKey: "venue_riot",    date: "May 23, 2026", timeRange: "10:30 PM - 1:00 AM",   daysAgo: 0.042, text: "VIP section. You snuck me past the rope because you said I 'looked like I needed better music.' Floral dress, combat boots. We lost each other when the lights dropped. Find me." },
  { userKey: "user_sidewinder", venueKey: "venue_gracies", date: "May 24, 2026", timeRange: "2:00 AM - close",     daysAgo: 0.002, text: "I just got off a twelve-hour shift and you could tell. You slid a beer down the bar to me without a word, just a nod. Scrubs under your jacket, tired eyes that still sparkled. Nurses stick together. What's your name?" },
];

// ── Handshake connections to create against EXISTING posts in Firestore ──
// These reference posts by their text snippet so we can find them by querying
const HANDSHAKES = [
  {
    // CactusJack claims AlexP's post (playing Galaga)
    senderKey: "user_cactus",
    postTextSnippet: "playing Galaga and I couldn't stop watching",
    proofText: "I WAS playing Galaga! I was trying to beat the local high score but failed miserably. Thanks for watching, let's grab that drink!",
    status: "accepted"
  },
  {
    // ScorpionQ claims Sarah_Smiles's post (red beanie)
    senderKey: "user_scorpion",
    postTextSnippet: "locked eyes across the room while the band was playing",
    proofText: "I was indeed wearing my red beanie! I remember locking eyes with you near the stage. The band was awesome. Let's meet up!",
    status: "accepted"
  },
  {
    // SalsaVerde claims NeonNights's post (messed up tab)
    senderKey: "user_salsa",
    postTextSnippet: "bought my drink because the bartender messed up",
    proofText: "Haha yes! The bartender was so confused that night. Glad I could help out. I'd love to cash in on that drink you owe me!",
    status: "accepted"
  },
  {
    // RoadRunner claims DesertDog's post (vintage denim jacket)
    senderKey: "user_roadrunner",
    postTextSnippet: "girl in the vintage denim jacket",
    proofText: "Oh my gosh, thank you! That vintage denim jacket is my absolute favorite piece. I'd love to chat more!",
    status: "accepted"
  },
  {
    // TurquoiseRing claims MusicLover99's post (reading book)
    senderKey: "user_turquoise",
    postTextSnippet: "reading a book at the bar",
    proofText: "Guilty as charged! I always bring a paperback to bars when I want to unwind. Let's get together and talk about books.",
    status: "accepted"
  },
  {
    // SaguaroSoul claims PHX_Foodie's post (80s movies)
    senderKey: "user_saguaro",
    postTextSnippet: "favorite 80s movies for 20 minutes",
    proofText: "I had to run to catch the light rail, sorry for vanishing! We were talking about The Breakfast Club and Aliens, right? Let's finish that convo.",
    status: "pending"
  },
  {
    // PricklyPear claims NightOwl's post (spilled drink)
    senderKey: "user_prickly",
    postTextSnippet: "spilled your drink on my shoes",
    proofText: "I am still so incredibly sorry about your shoes! Let me buy you a new drink to make up for my clumsiness.",
    status: "pending"
  },
  {
    // LunaMoth claims RetroGamer's post (Tainted Love)
    senderKey: "user_luna",
    postTextSnippet: "requested 'Tainted Love' on the jukebox",
    proofText: "Soft Cell is a classic, couldn't resist! Glad you appreciated the selection. What's your favorite synth track?",
    status: "pending"
  },
  {
    // DayDreamer claims LocalLegend's post (amazing smile)
    senderKey: "user_dreamer",
    postTextSnippet: "too shy to say hi, but you have the most amazing smile",
    proofText: "Aww, that is so sweet of you to post! You should have said hi, I don't bite. Let's change that next time.",
    status: "pending"
  },
  {
    // PhxRising claims CactusFlower's post (talking about dog)
    senderKey: "user_phoenix",
    postTextSnippet: "talking about your dog the whole time",
    proofText: "My golden retriever Buster is indeed the best boy! You'd love him. Let's meet at a dog-friendly patio sometime.",
    status: "accepted"
  },
];

async function seed() {
  console.log('🌵 Starting Phoenix user seed...\n');

  // ── Step 1: Create or fetch Firebase Auth accounts + Firestore user docs ──
  const uidMap = {}; // key -> real firebase uid

  for (const user of NEW_USERS) {
    try {
      const cred = await createUserWithEmailAndPassword(auth, user.email, 'password123');
      const uid = cred.user.uid;
      uidMap[user.key] = uid;

      await setDoc(doc(db, "users", uid), {
        uid,
        email: user.email,
        username: user.username,
        mood: user.mood,
        bio: user.bio,
        emoji_avatar: user.emoji_avatar,
        profileTheme: user.theme,
        unlockedThemes: ["classic", "glitter", "cyberpunk", "sunset"],
        favorited_bars: user.bars,
        homeCity: "Phoenix",
        selectedCity: "Phoenix",
        isAnonymous: false,
        flag_count: 0,
        banned: false,
        uuid: "seed_" + user.key,
        createdAt: Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)
      });

      console.log(`✅ ${user.username} (${user.email}) → uid: ${uid}`);
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        console.log(`⏭️  ${user.email} already exists, skipping auth creation...`);
        // Find the existing uid from Firestore by querying email
        const snap = await getDocs(query(collection(db, "users"), where("email", "==", user.email)));
        if (!snap.empty) {
          uidMap[user.key] = snap.docs[0].id;
          console.log(`   Found existing uid: ${uidMap[user.key]}`);
          
          // Re-write user profile just in case fields need refreshing
          await setDoc(doc(db, "users", uidMap[user.key]), {
            uid: uidMap[user.key],
            email: user.email,
            username: user.username,
            mood: user.mood,
            bio: user.bio,
            emoji_avatar: user.emoji_avatar,
            profileTheme: user.theme,
            unlockedThemes: ["classic", "glitter", "cyberpunk", "sunset"],
            favorited_bars: user.bars,
            homeCity: "Phoenix",
            selectedCity: "Phoenix",
            isAnonymous: false,
            flag_count: 0,
            banned: false,
            uuid: "seed_" + user.key,
            createdAt: snap.docs[0].data().createdAt || (Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000))
          }, { merge: true });
        }
      } else {
        console.error(`❌ Error creating ${user.email}:`, err.message);
      }
    }
  }

  // ── Step 2: Cleanup duplicate posts, previous connections, and chats ──
  console.log('\n🧹 Cleaning up old posts, connections, and chats...\n');
  
  // Clean posts created by our 15 new UIDs in previous runs
  const postsSnap = await getDocs(collection(db, "posts"));
  const newUids = Object.values(uidMap);
  for (const postDoc of postsSnap.docs) {
    const postData = postDoc.data();
    if (newUids.includes(postData.userId)) {
      console.log(`🗑️ Deleting old post: ${postDoc.id} by ${postData.username}`);
      await deleteDoc(doc(db, "posts", postDoc.id));
    } else if (postData.status === "connected") {
      // Reset original posts back to active (clearing connected status/info)
      console.log(`🔄 Resetting post status: ${postDoc.id} by ${postData.username}`);
      await updateDoc(doc(db, "posts", postDoc.id), {
        status: "active",
        connectedWithId: null,
        connectedWithUsername: null,
        connectedProofText: null
      });
    }
  }

  // Delete all connections
  const connectionsSnap = await getDocs(collection(db, "connections"));
  for (const connDoc of connectionsSnap.docs) {
    console.log(`🗑️ Deleting connection: ${connDoc.id}`);
    await deleteDoc(doc(db, "connections", connDoc.id));
  }

  // Delete all chats
  const chatsSnap = await getDocs(collection(db, "chats"));
  for (const chatDoc of chatsSnap.docs) {
    console.log(`🗑️ Deleting chat: ${chatDoc.id}`);
    await deleteDoc(doc(db, "chats", chatDoc.id));
  }

  // ── Step 3: Create fresh posts for the 15 new users ──
  console.log('\n📝 Creating posts for new users...\n');
  const postIdMap = {}; // userKey -> firestore post doc id

  for (const post of NEW_POSTS) {
    const uid = uidMap[post.userKey];
    if (!uid) {
      console.log(`⏭️  Skipping post for ${post.userKey} — no uid found`);
      continue;
    }

    const user = NEW_USERS.find(u => u.key === post.userKey);
    const venue = VENUES[post.venueKey];

    const postRef = await addDoc(collection(db, "posts"), {
      userId: uid,
      username: user.username,
      emoji_avatar: user.emoji_avatar,
      mood: user.mood,
      profileTheme: user.theme,
      venueId: venue.id,
      venueName: venue.name,
      venueCity: venue.city,
      venueZone: venue.zone,
      venueAddress: venue.address,
      text: post.text,
      timestamp: Date.now() - Math.floor(post.daysAgo * 24 * 60 * 60 * 1000),
      date: post.date,
      timeRange: post.timeRange,
      status: "active",
      thumbsUpCount: Math.floor(Math.random() * 8)
    });

    postIdMap[post.userKey] = postRef.id;
    console.log(`📝 Post by ${user.username} at ${venue.name} → ${postRef.id}`);
  }

  // ── Step 4: Create handshake connections against EXISTING posts ──
  console.log('\n🤝 Creating handshake connections against original posts...\n');

  // Reload all remaining posts (the original ones) to match by text snippet
  const remainingPostsSnap = await getDocs(collection(db, "posts"));
  const allPosts = [];
  remainingPostsSnap.docs.forEach(d => {
    allPosts.push({ id: d.id, ...d.data() });
  });

  for (const hs of HANDSHAKES) {
    const senderUid = uidMap[hs.senderKey];
    if (!senderUid) {
      console.log(`⏭️  Skipping handshake for ${hs.senderKey} — no uid`);
      continue;
    }

    // Find the target post by text snippet
    const targetPost = allPosts.find(p => p.text && p.text.includes(hs.postTextSnippet));
    if (!targetPost) {
      console.log(`⚠️  Could not find post matching: "${hs.postTextSnippet.substring(0, 40)}..."`);
      continue;
    }

    const senderUser = NEW_USERS.find(u => u.key === hs.senderKey);

    // Create the connection
    const connRef = await addDoc(collection(db, "connections"), {
      postId: targetPost.id,
      postText: targetPost.text,
      venueName: targetPost.venueName,
      senderId: senderUid,
      receiverId: targetPost.userId,
      proofText: hs.proofText,
      status: hs.status
    });

    console.log(`🤝 Connection: ${senderUser.username} claimed "${hs.postTextSnippet.substring(0, 30)}..." [${hs.status}] → ${connRef.id}`);

    // If accepted, update the post to "connected" and create a chat
    if (hs.status === "accepted") {
      // Update post status
      await updateDoc(doc(db, "posts", targetPost.id), {
        status: "connected",
        connectedWithId: senderUid,
        connectedWithUsername: senderUser.username,
        connectedProofText: hs.proofText
      });

      // Create AIM chat
      const chatRef = await addDoc(collection(db, "chats"), {
        connectionId: connRef.id,
        participants: [senderUid, targetPost.userId],
        lastMessage: "System: Connection accepted. Start chatting!",
        lastTimestamp: Date.now() - Math.floor(Math.random() * 1000000),
        venueName: targetPost.venueName
      });

      console.log(`   💬 Chat created → ${chatRef.id}`);
      console.log(`   📌 Post "${targetPost.id}" marked as connected`);
    }
  }

  console.log('\n\n═══════════════════════════════════════');
  console.log('  🌵 SEED COMPLETE — LOGIN CREDENTIALS');
  console.log('═══════════════════════════════════════\n');
  
  for (const user of NEW_USERS) {
    const uid = uidMap[user.key] || '(skipped)';
    console.log(`  ${user.emoji_avatar}  ${user.username.padEnd(14)} │ ${user.email.padEnd(22)} │ password123 │ ${uid}`);
  }
  
  console.log('\n═══════════════════════════════════════\n');

  process.exit(0);
}

seed().catch(err => {
  console.error("Seed error:", err);
  process.exit(1);
});
