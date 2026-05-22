import { initializeApp, getApps } from "firebase/app";
import { 
  getAuth, 
  signInAnonymously, 
  linkWithCredential, 
  EmailAuthProvider, 
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
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
  serverTimestamp 
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
    if (!localStorage.getItem("retroconnect_db")) {
      const initialDb = {
        users: {},
        posts: [
          {
            id: "post1",
            venueId: "venue_cobra",
            venueName: "Cobra Arcade Bar",
            venueAddress: "801 N 2nd St, Phoenix, AZ 85004",
            venueCity: "Phoenix",
            venueZone: "Downtown",
            text: "You were wearing a vintage Polaroid tee and playing the Galaga machine. We locked eyes when I beat your high score. Drinks on me next time?",
            userId: "user_polaroid",
            date: "May 20, 2026",
            timeRange: "10:00 PM - 11:30 PM",
            timestamp: Date.now() - 172800000 // 2 days ago
          },
          {
            id: "post2",
            venueId: "venue_caseys",
            venueName: "Casey Moore's Oyster House",
            venueAddress: "850 S Ash Ave, Tempe, AZ 85281",
            venueCity: "Phoenix",
            venueZone: "Tempe",
            text: "You had a green beanie and were drinking Guinness on the patio. I asked if the seat next to you was taken, but got too nervous to say more. Let's get a drink.",
            userId: "user_green",
            date: "May 21, 2026",
            timeRange: "9:00 PM - 10:30 PM",
            timestamp: Date.now() - 86400000 // 1 day ago
          },
          {
            id: "post3",
            venueId: "venue_valley",
            venueName: "Valley Bar",
            venueAddress: "130 N Central Ave, Phoenix, AZ 85004",
            venueCity: "Phoenix",
            venueZone: "Downtown",
            text: "Near the jukebox in the basement. You had neon blue eyeliner and a black leather jacket. You played 'Love Will Tear Us Apart' twice. Who are you?",
            userId: "user_jukebox",
            date: "May 22, 2026",
            timeRange: "11:30 PM - 1:00 AM",
            timestamp: Date.now() - 3600000 // 1 hour ago
          }
        ],
        connections: {},
        chats: {},
        messages: {},
        blacklisted_devices: {}
      };
      localStorage.setItem("retroconnect_db", JSON.stringify(initialDb));
    }
    
    if (!localStorage.getItem("retroconnect_auth_users")) {
      localStorage.setItem("retroconnect_auth_users", JSON.stringify({}));
    }
  }

  getDb() {
    return JSON.parse(localStorage.getItem("retroconnect_db") || "{}");
  }

  saveDb(dbData) {
    localStorage.setItem("retroconnect_db", JSON.stringify(dbData));
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
    const session = localStorage.getItem("retroconnect_auth_session");
    if (session) {
      this.currentUser = JSON.parse(session);
      // Verify ban status immediately on boot
      const db = simulatedStore.getDb();
      if (this.currentUser && db.users[this.currentUser.uid]) {
        const fullUser = db.users[this.currentUser.uid];
        this.currentUser.banned = fullUser.banned;
        this.currentUser.flag_count = fullUser.flag_count;
      }
    }
  }

  saveSession() {
    if (this.currentUser) {
      localStorage.setItem("retroconnect_auth_session", JSON.stringify(this.currentUser));
    } else {
      localStorage.removeItem("retroconnect_auth_session");
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
      uuid: localStorage.getItem("retroconnect_device_uuid") || ""
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
    const authPool = JSON.parse(localStorage.getItem("retroconnect_auth_users") || "{}");
    if (authPool[email]) {
      throw new Error("auth/email-already-in-use: The email address is already in use by another account.");
    }

    // Upgrade anonymous user
    authPool[email] = { uid: this.currentUser.uid, password };
    localStorage.setItem("retroconnect_auth_users", JSON.stringify(authPool));

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
    const authPool = JSON.parse(localStorage.getItem("retroconnect_auth_users") || "{}");
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
    const store = simulatedStore.getDb();
    if (!store[collectionName]) store[collectionName] = [];
    
    // Some collections are object maps, some are arrays in simulation. 
    // Let's standardise on arrays for posts, messages, and chats to support lists easily
    const newId = collectionName + "_" + Math.random().toString(36).slice(2, 11);
    const item = { ...data, id: newId, timestamp: Date.now() };
    
    if (Array.isArray(store[collectionName])) {
      store[collectionName].push(item);
    } else {
      store[collectionName][newId] = item;
    }
    
    simulatedStore.saveDb(store);
    return { id: newId };
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

export const dbOnSnapshot = (collectionName, queryConstraints = [], callback) => {
  if (isSimulated) {
    const runQuery = () => {
      const store = simulatedStore.getDb();
      let source = store[collectionName] || [];
      let list = Array.isArray(source) ? [...source] : Object.values(source);

      // Apply basic constraints
      queryConstraints.forEach(c => {
        if (c.type === "where") {
          const { field, op, value } = c;
          if (op === "==") {
            list = list.filter(item => item[field] === value);
          } else if (op === "array-contains") {
            list = list.filter(item => Array.isArray(item[field]) && item[field].includes(value));
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
