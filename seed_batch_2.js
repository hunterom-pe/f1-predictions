import { readFileSync } from 'fs';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, addDoc, getDocs, query, where, updateDoc } from 'firebase/firestore';
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
  venue_cobra:       { id: "venue_cobra",       name: "Cobra Arcade Bar",           address: "801 N 2nd St, Phoenix, AZ 85004",              city: "Phoenix", zone: "Downtown" },
  venue_valley:      { id: "venue_valley",      name: "Valley Bar",                 address: "130 N Central Ave, Phoenix, AZ 85004",          city: "Phoenix", zone: "Downtown" },
  venue_gracies:     { id: "venue_gracies",     name: "Gracies Tax Bar",            address: "711 N 7th Ave, Phoenix, AZ 85007",              city: "Phoenix", zone: "Downtown" },
  venue_linger:      { id: "venue_linger",      name: "Linger Longer Lounge",       address: "6522 N 16th St, Phoenix, AZ 85016",             city: "Phoenix", zone: "Downtown" },
  venue_caseys:      { id: "venue_caseys",      name: "Casey Moore's Oyster House",  address: "850 S Ash Ave, Tempe, AZ 85281",               city: "Phoenix", zone: "Tempe" },
  venue_yucca:       { id: "venue_yucca",       name: "Yucca Tap Room",             address: "29 W Southern Ave, Tempe, AZ 85282",            city: "Phoenix", zone: "Tempe" },
  venue_sunbar:      { id: "venue_sunbar",      name: "Sunbar Tempe",               address: "24 W 5th St, Tempe, AZ 85281",                  city: "Phoenix", zone: "Tempe" },
  venue_bottled:     { id: "venue_bottled",     name: "Bottled Blonde",             address: "7340 E Indian Plaza, Scottsdale, AZ 85251",      city: "Phoenix", zone: "Old Town" },
  venue_riot:        { id: "venue_riot",        name: "Riot House",                 address: "4425 N Saddlebag Trail, Scottsdale, AZ 85251",   city: "Phoenix", zone: "Old Town" },
  venue_coach:       { id: "venue_coach",       name: "Coach House",                address: "7011 E Indian School Rd, Scottsdale, AZ 85251", city: "Phoenix", zone: "Old Town" },
  venue_theodore:    { id: "venue_theodore",    name: "The Theodore",               address: "110 E Roosevelt St, Phoenix, AZ 85004",         city: "Phoenix", zone: "Downtown" },
  venue_thunderbird: { id: "venue_thunderbird", name: "Thunderbird Lounge",         address: "710 W Montecito Ave, Phoenix, AZ 85013",        city: "Phoenix", zone: "Midtown" }
};

// ── 20 New Users (Batch 2) ──
const BATCH_2_USERS = [
  { key: "user_desertrose",   email: "desertrose@asl.com",   username: "DesertRose",   mood: "Reflective 📖",     bio: "Boho soul. Finding beauty in the desert sands.",      emoji_avatar: "🌹🌵✨",  theme: "sunset",   bars: ["venue_gracies", "venue_caseys", "venue_valley"] },
  { key: "user_neonrider",    email: "neonrider@asl.com",    username: "NeonRider",    mood: "Chillin' 😎",       bio: "Night rides, synthwave, and cold drinks.",            emoji_avatar: "🏍️😎🌌",  theme: "cyberpunk", bars: ["venue_cobra", "venue_sunbar", "venue_riot", "venue_yucca"] },
  { key: "user_miragemaker",  email: "miragemaker@asl.com",  username: "MirageMaker",  mood: "Creative 🎨",       bio: "Now you see me, now you don't. Magic lover.",        emoji_avatar: "🎩✨🔮",  theme: "classic",  bars: ["venue_valley", "venue_linger"] },
  { key: "user_dustytrail",   email: "dustytrail@asl.com",   username: "DustyTrail",   mood: "Happy 😊",          bio: "Hiker. Explorer. IPA enthusiast.",                    emoji_avatar: "🥾⛰️🍺",  theme: "classic",  bars: ["venue_caseys", "venue_coach", "venue_linger", "venue_yucca", "venue_thunderbird"] },
  { key: "user_pixelqueen",   email: "pixelqueen@asl.com",   username: "PixelQueen",   mood: "Excited ⚡",        bio: "Ruling the arcade cabinet ranks. Retro gaming ONLY.",  emoji_avatar: "👑🎮👾",  theme: "cyberpunk", bars: ["venue_cobra", "venue_sunbar", "venue_yucca", "venue_gracies", "venue_theodore", "venue_valley"] },
  { key: "user_canyonecho",   email: "canyonecho@asl.com",   username: "CanyonEcho",   mood: "Mellow 🎧",         bio: "Singer-songwriter. Acoustic sessions are my peace.",   emoji_avatar: "🎸🎤🍃",  theme: "sunset",   bars: ["venue_valley"] },
  { key: "user_pricklyheart", email: "pricklyheart@asl.com", username: "PricklyHeart", mood: "Crushing 😍",       bio: "A little prickly on the outside, soft on the inside.",emoji_avatar: "🌵💖🍸",  theme: "sunset",   bars: ["venue_caseys", "venue_gracies", "venue_linger"] },
  { key: "user_discoheat",    email: "discoheat@asl.com",    username: "DiscoHeat",    mood: "Ready to Party 🍹", bio: "Dancing is my cardio. Sparkles and bass lines.",       emoji_avatar: "🪩✨🕺",  theme: "glitter",  bars: ["venue_sunbar", "venue_bottled", "venue_riot", "venue_cobra"] },
  { key: "user_valleyvegan",  email: "valleyvegan@asl.com",  username: "ValleyVegan",  mood: "Vibing ✨",         bio: "Powered by plants and local craft drafts.",           emoji_avatar: "🌱🍺🥑",  theme: "classic",  bars: ["venue_theodore", "venue_gracies"] },
  { key: "user_starlitsky",   email: "starlitsky@asl.com",   username: "StarlitSky",   mood: "Spacey 🚀",         bio: "Goth stargazing on patio decks. Dreamy vibes.",       emoji_avatar: "🦇🌌🌙",  theme: "cyberpunk", bars: ["venue_yucca", "venue_linger", "venue_cobra"] },
  { key: "user_sunsalute",    email: "sunsalute@asl.com",    username: "SunSalute",    mood: "Happy 😊",          bio: "Yoga teacher. Morning person. Nighttime tea lover.",  emoji_avatar: "🧘‍♀️🌅🍵", theme: "classic",  bars: ["venue_caseys", "venue_theodore"] },
  { key: "user_haboobhunter", email: "haboobhunter@asl.com", username: "HaboobHunter", mood: "Excited ⚡",        bio: "Storm chaser. Dusty camera, clean shots.",            emoji_avatar: "⛈️📸🌪️", theme: "classic",  bars: ["venue_valley", "venue_yucca", "venue_thunderbird"] },
  { key: "user_neonneon",     email: "neonneon@asl.com",     username: "NeonNeon",     mood: "Creative 🎨",       bio: "Creating neon art. Glowing through life.",            emoji_avatar: "💡🎨🌆",  theme: "cyberpunk", bars: ["venue_cobra", "venue_sunbar", "venue_riot", "venue_theodore"] },
  { key: "user_mesquitesmoke",email: "mesquitesmoke@asl.com",username: "MesquiteSmoke",mood: "Chillin' 😎",       bio: "Barbecue critic. Simple tastes, strong drinks.",       emoji_avatar: "🍖🥃🤠",  theme: "classic",  bars: ["venue_coach", "venue_caseys"] },
  { key: "user_coyoteugly",   email: "coyoteugly@asl.com",   username: "CoyoteUgly",   mood: "Rebellious ✊",     bio: "A little wild, a lot of fun. Let's see what happens.", emoji_avatar: "🐺🤘🍹",  theme: "glitter",  bars: ["venue_bottled", "venue_riot", "venue_sunbar", "venue_cobra", "venue_yucca"] },
  { key: "user_saguarita",    email: "saguarita@asl.com",    username: "Saguarita",    mood: "Excited ⚡",        bio: "Latin jazz and hot summer nights.",                   emoji_avatar: "🎺💃🎶",  theme: "sunset",   bars: ["venue_valley", "venue_sunbar", "venue_gracies"] },
  { key: "user_agavedream",   email: "agavedream@asl.com",   username: "AgaveDream",   mood: "Reflective 📖",     bio: "Tequila connoisseur. Sipping slowly.",                emoji_avatar: "🥃🍋🌵",  theme: "classic",  bars: ["venue_coach", "venue_caseys", "venue_gracies", "venue_theodore"] },
  { key: "user_duststorm",    email: "duststorm@asl.com",    username: "DustStorm",    mood: "Emo 🖤",       bio: "Metalhead. Headbanging is my therapy.",               emoji_avatar: "🎸🖤🤘",  theme: "classic",  bars: ["venue_yucca", "venue_valley", "venue_cobra"] },
  { key: "user_sunsetchaser", email: "sunsetchaser@asl.com", username: "SunsetChaser", mood: "Nostalgic 📼",      bio: "Sunset chaser. Nostalgic film photographer.",         emoji_avatar: "📷🌅📼",  theme: "sunset",   bars: ["venue_caseys", "venue_linger", "venue_valley", "venue_coach"] },
  { key: "user_arcadelegend", email: "arcadelegend@asl.com", username: "ArcadeLegend", mood: "Chillin' 😎",       bio: "Pinball wizard. High score chasing is an art.",       emoji_avatar: "🕹️🔮👾",  theme: "cyberpunk", bars: ["venue_cobra", "venue_sunbar", "venue_yucca", "venue_theodore", "venue_gracies"] }
];

// ── 10 New Posts to Bar Pages ──
const NEW_POSTS = [
  { userKey: "user_desertrose",    venueKey: "venue_cobra",       daysAgo: 0.05, text: "You were trying to win the giant plush frog from the claw machine and spent at least $20. I was cheering you on from the air hockey table. You finally got it and gave me a high five." },
  { userKey: "user_neonrider",     venueKey: "venue_valley",      daysAgo: 0.12, text: "You were wearing a vintage Harley Davidson leather jacket and sipping a whiskey sour alone near the back booths. We smiled when the jukebox played Fleetwood Mac." },
  { userKey: "user_mesquitesmoke",  venueKey: "venue_gracies",     daysAgo: 0.22, text: "You had a bright pink hair clip and were drawing caricatures of people on the back of beer coasters. You slid one over to me — it was a drawing of me wearing my cowboy hat." },
  { userKey: "user_starlitsky",    venueKey: "venue_linger",      daysAgo: 0.35, text: "You were wearing a holographic silver backpack and doing crazy spin moves on the dance floor. Everyone was circle-clapping." },
  { userKey: "user_sunsetchaser",  venueKey: "venue_caseys",      daysAgo: 0.45, text: "We sat at adjacent tables on the patio. You were feeding french fries to a stray cat when the server wasn't looking, laughing when it purred." },
  { userKey: "user_duststorm",     venueKey: "venue_yucca",       daysAgo: 0.55, text: "You were headbanging in the front row of the local punk show and lost your shoe in the pit. I found it and handed it back to you." },
  { userKey: "user_valleyvegan",   venueKey: "venue_sunbar",      daysAgo: 0.65, text: "You were buying a giant pretzel at the snack counter and offered me half because the line was so long. You had a green canvas backpack." },
  { userKey: "user_coyoteugly",    venueKey: "venue_riot",        daysAgo: 0.75, text: "You were wearing a sparkly silver cowboy hat and taking group selfies. You accidentally bumped into me and spilled some seltzer, then bought me a shot of tequila to apologize." },
  { userKey: "user_agavedream",    venueKey: "venue_theodore",    daysAgo: 0.85, text: "We were sitting at the window bar looking out at Roosevelt Row. You had a laptop with a giant 'Code Is Poetry' sticker and were drinking a sour beer." },
  { userKey: "user_haboobhunter",  venueKey: "venue_thunderbird", daysAgo: 0.95, text: "You were showing your friends a video of a dust storm rolling in on your phone, and got so excited you almost knocked over your IPA." }
];

// ── 10 Handshake replies (6 accepted, 4 pending) ──
const HANDSHAKES = [
  {
    senderKey: "user_arcadelegend",
    postTextSnippet: "win the giant plush frog from the claw machine",
    proofText: "OMG YES! That frog was worth every dollar. I named him Hubert. I remember you in the yellow dress!",
    status: "accepted"
  },
  {
    senderKey: "user_coyoteugly",
    postTextSnippet: "vintage Harley Davidson leather jacket",
    proofText: "That was me! I love that jukebox. We ended up nodding along to the guitar solo. Let's grab a real drink sometime.",
    status: "accepted"
  },
  {
    senderKey: "user_pixelqueen",
    postTextSnippet: "bright pink hair clip and were drawing caricatures",
    proofText: "Hahaha, I still have that cowboy hat drawing in my memory! Glad you liked the caricature. Let's do a follow-up!",
    status: "accepted"
  },
  {
    senderKey: "user_discoheat",
    postTextSnippet: "holographic silver backpack and doing crazy spin moves",
    proofText: "That was my birthday dance circle! The holographic backpack is my lucky charm. Let's dance again soon.",
    status: "accepted"
  },
  {
    senderKey: "user_sunsalute",
    postTextSnippet: "adjacent tables on the patio. You were feeding french fries",
    proofText: "Shhh, don't tell the staff! That kitty is a regular. You had a camera around your neck, right?",
    status: "accepted"
  },
  {
    senderKey: "user_canyonecho",
    postTextSnippet: "headbanging in the front row of the local punk show",
    proofText: "You are a lifesaver! Walking home with one shoe would have sucked. I was the one wearing the torn Ramones shirt.",
    status: "accepted"
  },
  {
    senderKey: "user_miragemaker",
    postTextSnippet: "pretzel at the snack counter and offered me half",
    proofText: "Haha, sharing is caring! I had the green canvas backpack with the Arizona flag patch. Did you ever get your pretzel?",
    status: "pending"
  },
  {
    senderEmail: "habanero@asl.com", // Query existing user by email
    postTextSnippet: "sparkly silver cowboy hat and taking group selfies",
    proofText: "Oops, sorry again for the spill! Yes, that sparkly silver hat is my pride and joy. Tequila makes everything better!",
    status: "pending"
  },
  {
    senderEmail: "downtowndweller@asl.com", // Query existing user by email
    postTextSnippet: "window bar looking out at Roosevelt Row. You had a laptop",
    proofText: "That was me! Roosevelt Row is my favorite place to get some work done. Let's code and drink beers sometime.",
    status: "pending"
  },
  {
    senderEmail: "desertdog@asl.com", // Query existing user by email
    postTextSnippet: "dust storm rolling in on your phone, and got so excited",
    proofText: "Guilty! Storm season is the best season. You were the one who saved my IPA from falling over — thank you!",
    status: "pending"
  }
];

async function seed() {
  console.log('🌵 Starting Batch 2 seeding (20 new users, 10 posts, 10 handshakes)...\n');

  const uidMap = {}; // key -> real firebase uid
  const emailToUidMap = {}; // email -> real firebase uid
  const emailToUsernameMap = {}; // email -> username
  const emailToAvatarMap = {}; // email -> avatar

  // ── Step 1: Create or fetch Firebase Auth accounts + Firestore user docs for Batch 2 ──
  for (const user of BATCH_2_USERS) {
    try {
      const cred = await createUserWithEmailAndPassword(auth, user.email, 'password123');
      const uid = cred.user.uid;
      uidMap[user.key] = uid;
      emailToUidMap[user.email] = uid;
      emailToUsernameMap[user.email] = user.username;
      emailToAvatarMap[user.email] = user.emoji_avatar;

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
        uuid: "seed_batch2_" + user.key,
        createdAt: Date.now() - Math.floor(Math.random() * 3 * 24 * 60 * 60 * 1000)
      });

      console.log(`✅ ${user.username} (${user.email}) → uid: ${uid}`);
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        console.log(`⏭️  ${user.email} already exists, skipping auth creation...`);
        const snap = await getDocs(query(collection(db, "users"), where("email", "==", user.email)));
        if (!snap.empty) {
          const uid = snap.docs[0].id;
          uidMap[user.key] = uid;
          emailToUidMap[user.email] = uid;
          emailToUsernameMap[user.email] = snap.docs[0].data().username || user.username;
          emailToAvatarMap[user.email] = snap.docs[0].data().emoji_avatar || user.emoji_avatar;
          console.log(`   Found existing uid: ${uid}`);
        }
      } else {
        console.error(`❌ Error creating ${user.email}:`, err.message);
      }
    }
  }

  // ── Step 2: Helper for dynamic email lookup (for existing/original users in connections) ──
  async function resolveUserByEmail(email) {
    if (emailToUidMap[email]) {
      return {
        uid: emailToUidMap[email],
        username: emailToUsernameMap[email],
        emoji_avatar: emailToAvatarMap[email]
      };
    }

    const snap = await getDocs(query(collection(db, "users"), where("email", "==", email)));
    if (!snap.empty) {
      const uDoc = snap.docs[0];
      const uData = uDoc.data();
      emailToUidMap[email] = uDoc.id;
      emailToUsernameMap[email] = uData.username;
      emailToAvatarMap[email] = uData.emoji_avatar;
      return {
        uid: uDoc.id,
        username: uData.username,
        emoji_avatar: uData.emoji_avatar
      };
    }
    return null;
  }

  // Populate map for Batch 2 users in resolver map
  for (const user of BATCH_2_USERS) {
    const uid = uidMap[user.key];
    if (uid) {
      emailToUidMap[user.email] = uid;
      emailToUsernameMap[user.email] = user.username;
      emailToAvatarMap[user.email] = user.emoji_avatar;
    }
  }

  // ── Step 3: Create the 10 Missed Connection Posts ──
  console.log('\n📝 Creating 10 new bar posts...\n');
  const postDocsMap = {}; // userKey -> post document data (including id)

  for (const post of NEW_POSTS) {
    const uid = uidMap[post.userKey];
    if (!uid) {
      console.log(`⏭️  Skipping post for ${post.userKey} — no uid found`);
      continue;
    }

    const user = BATCH_2_USERS.find(u => u.key === post.userKey);
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
      date: "May 28, 2026",
      timeRange: "Evening",
      status: "active",
      thumbsUpCount: Math.floor(Math.random() * 5)
    });

    postDocsMap[post.userKey] = {
      id: postRef.id,
      userId: uid,
      username: user.username,
      emoji_avatar: user.emoji_avatar,
      venueName: venue.name,
      text: post.text
    };

    console.log(`📝 Post by ${user.username} at ${venue.name} → ${postRef.id}`);
  }

  // ── Step 4: Create the 10 Handshakes ──
  console.log('\n🤝 Creating 10 handshake connections...\n');

  // Load all posts created in this run
  const createdPosts = Object.values(postDocsMap);

  for (const hs of HANDSHAKES) {
    let senderDetails = null;

    if (hs.senderKey) {
      const u = BATCH_2_USERS.find(user => user.key === hs.senderKey);
      if (u) {
        senderDetails = await resolveUserByEmail(u.email);
      }
    } else if (hs.senderEmail) {
      senderDetails = await resolveUserByEmail(hs.senderEmail);
    }

    if (!senderDetails) {
      console.log(`⚠️  Could not resolve sender details for: ${hs.senderKey || hs.senderEmail}`);
      continue;
    }

    // Find the target post created in this run matching the snippet
    const targetPost = createdPosts.find(p => p.text && p.text.includes(hs.postTextSnippet));
    if (!targetPost) {
      console.log(`⚠️  Could not find post matching snippet: "${hs.postTextSnippet.substring(0, 40)}..."`);
      continue;
    }

    // Create the connection
    const connRef = await addDoc(collection(db, "connections"), {
      postId: targetPost.id,
      postText: targetPost.text,
      venueName: targetPost.venueName,
      senderId: senderDetails.uid,
      receiverId: targetPost.userId,
      proofText: hs.proofText,
      status: hs.status
    });

    console.log(`🤝 Connection: ${senderDetails.username} claimed "${hs.postTextSnippet.substring(0, 30)}..." [${hs.status}] → ${connRef.id}`);

    // If accepted, update the post and create a chat room
    if (hs.status === "accepted") {
      await updateDoc(doc(db, "posts", targetPost.id), {
        status: "connected",
        connectedWithId: senderDetails.uid,
        connectedWithUsername: senderDetails.username,
        connectedProofText: hs.proofText
      });

      const chatRef = await addDoc(collection(db, "chats"), {
        connectionId: connRef.id,
        participants: [senderDetails.uid, targetPost.userId],
        lastMessage: "System: Connection accepted. Start chatting!",
        lastTimestamp: Date.now() - Math.floor(Math.random() * 500000),
        venueName: targetPost.venueName
      });

      console.log(`   💬 Chat created → ${chatRef.id}`);
      console.log(`   📌 Post "${targetPost.id}" marked as connected`);
    }
  }

  console.log('\n\n═══════════════════════════════════════');
  console.log('  🌵 BATCH 2 SEEDING COMPLETE');
  console.log('═══════════════════════════════════════\n');

  process.exit(0);
}

seed().catch(err => {
  console.error("Batch 2 Seeding error:", err);
  process.exit(1);
});
