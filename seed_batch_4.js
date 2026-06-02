import admin from "firebase-admin";
import { readFileSync } from "fs";

// Load Firebase credentials
const serviceAccount = JSON.parse(readFileSync("./functions/serviceAccount.json", "utf8"));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}
const db = admin.firestore();

// ── Phoenix Venues ──
const PHOENIX_VENUES = [
  { id: "venue_cobra",       name: "Cobra Arcade Bar",           address: "801 N 2nd St, Phoenix, AZ 85004",              city: "Phoenix", zone: "Downtown" },
  { id: "venue_valley",      name: "Valley Bar",                 address: "130 N Central Ave, Phoenix, AZ 85004",          city: "Phoenix", zone: "Downtown" },
  { id: "venue_gracies",     name: "Gracies Tax Bar",            address: "711 N 7th Ave, Phoenix, AZ 85007",              city: "Phoenix", zone: "Downtown" },
  { id: "venue_linger",      name: "Linger Longer Lounge",       address: "6522 N 16th St, Phoenix, AZ 85016",             city: "Phoenix", zone: "Downtown" },
  { id: "venue_caseys",      name: "Casey Moore's Oyster House",  address: "850 S Ash Ave, Tempe, AZ 85281",               city: "Phoenix", zone: "Tempe" },
  { id: "venue_yucca",       name: "Yucca Tap Room",             address: "29 W Southern Ave, Tempe, AZ 85282",            city: "Phoenix", zone: "Tempe" },
  { id: "venue_sunbar",      name: "Sunbar Tempe",               address: "24 W 5th St, Tempe, AZ 85281",                  city: "Phoenix", zone: "Tempe" },
  { id: "venue_bottled",     name: "Bottled Blonde",             address: "7340 E Indian Plaza, Scottsdale, AZ 85251",      city: "Phoenix", zone: "Old Town" },
  { id: "venue_riot",        name: "Riot House",                 address: "4425 N Saddlebag Trail, Scottsdale, AZ 85251",   city: "Phoenix", zone: "Old Town" },
  { id: "venue_coach",       name: "Coach House",                address: "7011 E Indian School Rd, Scottsdale, AZ 85251", city: "Phoenix", zone: "Old Town" },
  { id: "venue_theodore",    name: "The Theodore",               address: "110 E Roosevelt St, Phoenix, AZ 85004",         city: "Phoenix", zone: "Downtown" },
  { id: "venue_thunderbird", name: "Thunderbird Lounge",         address: "710 W Montecito Ave, Phoenix, AZ 85013",        city: "Phoenix", zone: "Midtown" }
];

// ── 30 Customized Users ──
const USERS_TO_SEED = [
  { key: "u1",  email: "neon_whisper@asl.com",     username: "neon_whisper",     theme: "classic",   avatar: "🌌✨📻", mood: "Chillin' 😎",       bio: "Listening to early 2000s indie rock. Vinyl collector." },
  { key: "u2",  email: "sk8r_luke@asl.com",         username: "sk8r_luke",         theme: "sunset",    avatar: "🛹🔥🎧", mood: "Vibing ✨",         bio: "Busting heels at the park, cooling down at Gracie's." },
  { key: "u3",  email: "pixel_dust_v4@asl.com",     username: "pixel_dust_v4",     theme: "cyberpunk", avatar: "👾🕹️⚡", mood: "Excited ⚡",        bio: "Beat my Galaga score if you dare." },
  { key: "u4",  email: "retro_cassette@asl.com",   username: "retro_cassette",   theme: "classic",   avatar: "放下❤️", mood: "Nostalgic 📼",      bio: "Still making mixtape cassettes for my friends." },
  { key: "u5",  email: "desert_dusk@asl.com",       username: "desert_dusk",       theme: "sunset",    avatar: "🌵🌅🍷", mood: "Reflective 📖",     bio: "Desert walks and cold IPAs at Casey Moore's." },
  { key: "u6",  email: "velvet_vibes@asl.com",      username: "velvet_vibes",      theme: "classic",   avatar: "🍷🕯️🎷", mood: "Reflective 📖",     bio: "Linger Longer Lounge regular. Jazz and red wine." },
  { key: "u7",  email: "sunbar_hustler@asl.com",    username: "sunbar_hustler",    theme: "glitter",   avatar: "☀️🕶️🍹", mood: "Ready to Party 🍹", bio: "Dancing in the Tempe heat." },
  { key: "u8",  email: "arcade_legend@asl.com",     username: "arcade_legend",     theme: "cyberpunk", avatar: "🏆🕹️🥋", mood: "Excited ⚡",        bio: "Street Fighter II master. Rematch?" },
  { key: "u9",  email: "bloody_mary_fan@asl.com",   username: "bloody_mary_fan",   theme: "glitter",   avatar: "🍹🌶️✨", mood: "Happy 😊",          bio: "Bloody Marys at Star Bar are my medicine." },
  { key: "u10", email: "bloomin_onion@asl.com",     username: "bloomin_onion",     theme: "classic",   avatar: "🧅🍻🧢", mood: "Chillin' 😎",       bio: "Dive bars and deep fried food." },
  { key: "u11", email: "goth_phoenix@asl.com",     username: "goth_phoenix",     theme: "classic",   avatar: "🦇🖤🕸️", mood: "Emo 🖤",            bio: "All black, all year. Tempe goth scene." },
  { key: "u12", email: "monsoon_dreamer@asl.com",   username: "monsoon_dreamer",   theme: "sunset",    avatar: "🌧️🌈☕", mood: "Happy 😊",          bio: "Monsoon season is the best season." },
  { key: "u13", email: "cactus_cool@asl.com",       username: "cactus_cool",       theme: "sunset",    avatar: "🌵🕶️🛹", mood: "Chillin' 😎",       bio: "Keep it cool, keep it local." },
  { key: "u14", email: "vintage_polaroid@asl.com",   username: "vintage_polaroid",   theme: "classic",   avatar: "📷🌾📼", mood: "Nostalgic 📼",      bio: "Capturing memories on expired Polaroid film." },
  { key: "u15", email: "neon_sign_guy@asl.com",     username: "neon_sign_guy",     theme: "cyberpunk", avatar: "💡⚡🌃", mood: "Excited ⚡",        bio: "I collect neon signs and bad ideas." },
  { key: "u16", email: "coffee_bean_queen@asl.com", username: "coffee_bean_queen", theme: "classic",   avatar: "☕🍩⏳", mood: "Reflective 📖",     bio: "Double espresso, straight up." },
  { key: "u17", email: "riot_grrrl_99@asl.com",     username: "riot_grrrl_99",     theme: "sunset",    avatar: "✊🎸🎤", mood: "Rebellious ✊",     bio: "Punk rock and local zines." },
  { key: "u18", email: "astro_girl@asl.com",       username: "astro_girl",       theme: "cyberpunk", avatar: "🌌🌠🚀", mood: "Spacey 🚀",         bio: "Looking for someone to watch the stars with." },
  { key: "u19", email: "salsa_sensation@asl.com",   username: "salsa_sensation",   theme: "sunset",    avatar: "💃🌶️🎶", mood: "Happy 😊",          bio: "Salsa dancing is my therapy." },
  { key: "u20", email: "mesa_mike_jr@asl.com",     username: "mesa_mike_jr",     theme: "classic",   avatar: "🏜️📼🍺", mood: "Chillin' 😎",       bio: "Tempe town lake regular. Draft beer only." },
  { key: "u21", email: "copper_tattoo@asl.com",     username: "copper_tattoo",     theme: "cyberpunk", avatar: "🎨🖋️🍻", mood: "Creative 🎨",       bio: "Inked and caffeinated." },
  { key: "u22", email: "day_dreamer_99@asl.com",     username: "day_dreamer_99",     theme: "cyberpunk", avatar: "☁️🚀💫", mood: "Spacey 🚀",         bio: "Always daydreaming about the 90s." },
  { key: "u23", email: "habanero_hot@asl.com",     username: "habanero_hot",     theme: "sunset",    avatar: "🌶️💅✨", mood: "Ready to Party 🍹", bio: "Hot take collector." },
  { key: "u24", email: "roadrunner_fast@asl.com",   username: "roadrunner_fast",   theme: "cyberpunk", avatar: "🏃💨🤪", mood: "Excited ⚡",        bio: "Catch me if you can." },
  { key: "u25", email: "saguaro_spirit@asl.com",   username: "saguaro_spirit",   theme: "classic",   avatar: "🌵📖🌅", mood: "Reflective 📖",     bio: "Journaling under the saguaros." },
  { key: "u26", email: "scorpion_bite@asl.com",     username: "scorpion_bite",     theme: "cyberpunk", avatar: "🦂🖤🌑", mood: "Emo 🖤",            bio: "Nocturnal creature." },
  { key: "u27", email: "turquoise_soul@asl.com",   username: "turquoise_soul",   theme: "sunset",    avatar: "💎💙🌻", mood: "Vibing ✨",         bio: "Vintage jewelry collector." },
  { key: "u28", email: "prickly_party@asl.com",     username: "prickly_party",     theme: "classic",   avatar: "🍹🌺🎉", mood: "Ready to Party 🍹", bio: "Margaritas and good vibes." },
  { key: "u29", email: "sidewinder_shift@asl.com",   username: "sidewinder_shift",   theme: "classic",   avatar: "🐍😴🌙", mood: "Chillin' 😎",       bio: "Night shift worker. Coffee is life." },
  { key: "u30", email: "aim_messenger@asl.com",     username: "aim_messenger",     theme: "classic",   avatar: "🖥️💬🍿", mood: "Chillin' 😎",       bio: "AIM user since the dial-up days." }
];

// ── 26 Posts (linked to users u1 to u26) ──
const POSTS_TO_SEED = [
  { userKey: "u1",  venueIdx: 0,  text: "Saw you at Cobra Arcade. You were playing the retro X-Men cabinet and using Wolverine. I was watching from the coin exchange. We locked eyes when the game ended. Drink next time?" },
  { userKey: "u2",  venueIdx: 1,  text: "Valley Bar basement. You had a vintage Motorola Razr and were wearing a corduroy jacket. We both ordered Old Fashioneds at the same time and laughed. Let's dial up." },
  { userKey: "u3",  venueIdx: 2,  text: "Gracies Tax Bar. You were sitting on the patio feeding curds to a stray cat. I was wearing a faded green band shirt. You smiled when the cat purred. Chat soon?" },
  { userKey: "u4",  venueIdx: 3,  text: "Linger Longer Lounge. You were doing spin moves to Daft Punk. I was the one holding two plastic cups of draft beer trying not to spill them on you. Let's dance!" },
  { userKey: "u5",  venueIdx: 4,  text: "Casey Moore's. You were reading a vintage sci-fi paperback at the corner patio table. I accidentally knocked over my chair, and you asked if I was reading the future." },
  { userKey: "u6",  venueIdx: 5,  text: "Yucca Tap Room. You were standing in the front row of the ska show. You lost your silver bracelet in the mosh pit, I picked it up but lost you in the crowd." },
  { userKey: "u7",  venueIdx: 6,  text: "Sunbar Tempe line. We waited for 20 minutes in the heat and you shared your hand-held fan with me. You had a yellow visor and cool retro shades. Let's get that beer." },
  { userKey: "u8",  venueIdx: 7,  text: "Bottled Blonde. You had a sparkly cowboy hat and spilled your drink on my shoes, then bought me a shot of tequila to apologize. Let's hang!" },
  { userKey: "u9",  venueIdx: 8,  text: "Riot House. You were wearing a retro windbreaker and showing a storm video on your phone. You had an amazing laugh. Drink again?" },
  { userKey: "u10", venueIdx: 9,  text: "Coach House. You had a pink hair clip and slid a coaster caricature of me wearing a cowboy hat. I still have it! Let's get another." },
  { userKey: "u11", venueIdx: 10, text: "The Theodore. You had a laptop covered in stickers and a cool beanie. We both reached for the last oatmeal cookie. You let me have it. Let's share next time." },
  { userKey: "u12", venueIdx: 11, text: "Thunderbird Lounge. We played Pac-Man and you let me win. I loved your retro corduroy cap. Rematch over drafts?" },
  { userKey: "u13", venueIdx: 0,  text: "Cobra Arcade. You had a purple skateboard and a green hoodie. You were dominating the Galaga high score board. Let's practice together." },
  { userKey: "u14", venueIdx: 1,  text: "Valley Bar. We got stuck in the basement elevator for 5 minutes and laughed the entire time. You had blue sneakers. Let's take the stairs next time and grab a drink." },
  { userKey: "u15", venueIdx: 2,  text: "Gracies Tax Bar. You recommended the local draft cider and it was amazing. You were wearing a corduroy vest. Thanks for the tip, let me buy the next round." },
  { userKey: "u16", venueIdx: 3,  text: "Linger Longer Lounge. You were reading a cassette tape insert at the bar. We talked about how much we miss printed liner notes. Let's trade tapes." },
  { userKey: "u17", venueIdx: 4,  text: "Casey Moore's patio. You had a golden retriever named Buster and let me pet him. You were super friendly. Let's grab a coffee at a dog patio." },
  { userKey: "u18", venueIdx: 5,  text: "Yucca Tap Room. You wore Doc Martens and a plaid skirt, dancing right in front of the stage. I was the tall guy behind you. You stepped on my foot and smiled. No worries, let's chat!" },
  { userKey: "u19", venueIdx: 6,  text: "Sunbar Tempe. You were dancing by the DJ booth and gave me a neon green glow stick. We locked eyes but lost each other in the crowd. Thank you for the light." },
  { userKey: "u20", venueIdx: 7,  text: "Bottled Blonde. We shared a taxi outside and talked about 90s alternative rock bands like Sunny Day Real Estate. I should've asked for your AIM screenname." },
  { userKey: "u21", venueIdx: 8,  text: "Riot House. You had neon eyeliner and were drinking Red Bull by the bar. You looked like you were waiting for someone. I wanted to say hi but chickened out." },
  { userKey: "u22", venueIdx: 9,  text: "Coach House. We locked eyes under the Christmas lights. You were wearing a yellow knitted scarf. You smiled and walked away. Was that you?" },
  { userKey: "u23", venueIdx: 10, text: "The Theodore. You were writing lyrics in a black notebook. You looked so focused. I wanted to ask if you write for a band. Drink on me next time?" },
  { userKey: "u24", venueIdx: 11, text: "Thunderbird Lounge. You wore a corduroy shirt and ordered a whiskey sour. We shared a bowl of popcorn and talked about 80s synth-pop. Connect?" },
  { userKey: "u25", venueIdx: 3,  text: "Linger Longer Lounge. We bumped into each other by the retro jukebox. You had an amazing smile and black eyeliner. Let's pick some songs together." },
  { userKey: "u26", venueIdx: 4,  text: "Casey Moore's patio. You were wearing a blue sundress and round glasses, drinking a white wine. You looked so peaceful in the warm night. Let's connect." }
];

// ── 6 Connections (Handshakes) ──
const CONNECTIONS_TO_SEED = [
  // 3 Accepted Handshakes (Active Chats)
  { senderKey: "u7",  postIdx: 0, status: "accepted", proofText: "I was indeed playing Wolverine at Cobra! I saw you by the coin exchange. Let's get that drink rematch." },
  { senderKey: "u8",  postIdx: 1, status: "accepted", proofText: "Haha yes, Motorola Razr is my retro jam! I loved the corduroy jacket. Old Fashioneds on me next time." },
  { senderKey: "u9",  postIdx: 2, status: "accepted", proofText: "Yes! That stray cat is super friendly. I was wearing my Gracie's hat. Let's grab some cheese curds." },
  // 3 Pending Handshakes (Outbound claims)
  { senderKey: "u10", postIdx: 3, status: "pending",  proofText: "I was spinning to Daft Punk! I remember bumping into someone with two cups of beer. Let's dance again!" },
  { senderKey: "u11", postIdx: 4, status: "pending",  proofText: "Yes! I was reading Dune at Casey Moore's. I was so surprised when you knocked your chair over! Let's get a drink." },
  { senderKey: "u12", postIdx: 5, status: "pending",  proofText: "Oh my god! I was looking everywhere for my silver bracelet! Thank you so much for picking it up. Let's meet." }
];

async function run() {
  console.log("🚀 Seeding 30 customized users, 26 posts, and 6 handshakes...\n");
  
  const uidMap = {}; // key -> Firebase auth uid
  
  // ── Step 1: Create or Get Auth Users and set User profile documents ──
  for (const u of USERS_TO_SEED) {
    try {
      let uid;
      try {
        const userRecord = await admin.auth().createUser({
          email: u.email,
          password: "password123",
          displayName: u.username
        });
        uid = userRecord.uid;
        console.log(`Created Auth account: ${u.email} → uid: ${uid}`);
      } catch (err) {
        if (err.code === "auth/email-already-in-use") {
          const userRecord = await admin.auth().getUserByEmail(u.email);
          uid = userRecord.uid;
          console.log(`Auth account already exists: ${u.email} → uid: ${uid}`);
        } else {
          throw err;
        }
      }
      uidMap[u.key] = uid;
      
      // Save User Doc
      await db.collection("users").doc(uid).set({
        uid,
        email: u.email,
        username: u.username,
        mood: u.mood,
        bio: u.bio,
        emoji_avatar: u.avatar,
        profileTheme: u.theme,
        unlockedThemes: ["classic", "glitter", "cyberpunk", "sunset"],
        favorited_bars: ["venue_cobra", "venue_caseys"],
        homeCity: "Phoenix",
        selectedCity: "Phoenix",
        isAnonymous: false,
        flag_count: 0,
        banned: false,
        uuid: "seed_" + u.key,
        createdAt: Date.now() - Math.floor(Math.random() * 5 * 24 * 60 * 60 * 1000)
      });
      
      // Save Public Profile Doc (must exist so OutlookInbox lookup doesn't fail)
      await db.collection("profiles").doc(uid).set({
        userId: uid,
        username: u.username,
        emoji_avatar: u.avatar,
        mood: u.mood,
        bio: u.bio,
        profileTheme: u.theme,
        homeCity: "Phoenix",
        selectedCity: "Phoenix",
        headline: "Welcome to my ASL profile!"
      });
      
      console.log(`   Public Profile sync completed for ${u.username}`);
    } catch (err) {
      console.error(`❌ Error seeding user ${u.username}:`, err);
    }
  }

  // ── Step 2: Create 26 posts (assigned to users u1 to u26) ──
  console.log("\n📝 Creating 26 missed connection posts...");
  const createdPosts = [];

  for (let idx = 0; idx < POSTS_TO_SEED.length; idx++) {
    const postData = POSTS_TO_SEED[idx];
    const uid = uidMap[postData.userKey];
    if (!uid) {
      console.log(`   Skipping post idx ${idx} - user uid not found`);
      continue;
    }
    const user = USERS_TO_SEED.find(u => u.key === postData.userKey);
    const venue = PHOENIX_VENUES[postData.venueKeyIdx || postData.venueIdx];

    const postDocRef = await db.collection("posts").add({
      userId: uid,
      username: user.username,
      emoji_avatar: user.avatar,
      mood: user.mood,
      profileTheme: user.theme,
      venueId: venue.id,
      venueName: venue.name,
      venueCity: venue.city,
      venueZone: venue.zone,
      venueAddress: venue.address,
      text: postData.text,
      timestamp: Date.now() - Math.floor(Math.random() * 4 * 24 * 60 * 60 * 1000), // within 4 days
      date: "Jun 2, 2026",
      timeRange: "10:30 PM",
      status: "active",
      thumbsUpCount: Math.floor(Math.random() * 5)
    });

    createdPosts.push({
      id: postDocRef.id,
      userId: uid,
      username: user.username,
      venueName: venue.name,
      text: postData.text
    });
    console.log(`   Created post ${postDocRef.id} by ${user.username} at ${venue.name}`);
  }

  // ── Step 3: Create 6 handshakes (connections) ──
  console.log("\n🤝 Creating 6 connections (3 accepted, 3 pending)...");
  for (let idx = 0; idx < CONNECTIONS_TO_SEED.length; idx++) {
    const connData = CONNECTIONS_TO_SEED[idx];
    const senderUid = uidMap[connData.senderKey];
    const senderUser = USERS_TO_SEED.find(u => u.key === connData.senderKey);
    const targetPost = createdPosts[connData.postIdx];

    if (!senderUid || !targetPost) {
      console.log(`   Skipping connection idx ${idx} - sender or target post not resolved`);
      continue;
    }

    // Add connection record
    const connDocRef = await db.collection("connections").add({
      postId: targetPost.id,
      postText: targetPost.text,
      venueName: targetPost.venueName,
      senderId: senderUid,
      senderUsername: senderUser.username,
      receiverId: targetPost.userId,
      receiverUsername: targetPost.username,
      proofText: connData.proofText,
      status: connData.status,
      timestamp: Date.now() - Math.floor(Math.random() * 12 * 60 * 60 * 1000) // within 12 hours
    });

    console.log(`   Created connection ${connDocRef.id} [${connData.status}] from ${senderUser.username} to ${targetPost.username}`);

    if (connData.status === "accepted") {
      // 1. Update the original post to "connected" status
      await db.collection("posts").doc(targetPost.id).update({
        status: "connected",
        connectedWithId: senderUid,
        connectedWithUsername: senderUser.username,
        connectedProofText: connData.proofText
      });
      console.log(`      Updated post ${targetPost.id} status to connected`);

      // 2. Add an associated chat document
      const chatDocRef = await db.collection("chats").add({
        connectionId: connDocRef.id,
        participants: [senderUid, targetPost.userId],
        lastMessage: "System: Connection accepted. Start chatting!",
        lastTimestamp: Date.now(),
        venueName: targetPost.venueName
      });
      console.log(`      Created AIM chat ${chatDocRef.id} for participants`);
    }
  }

  console.log("\n🌱 Database seed completed successfully.");
  process.exit(0);
}

run().catch(err => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
