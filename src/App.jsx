import { useState, useEffect, useRef } from "react";
import TitleBar from "./components/TitleBar";
import AuthDialog from "./components/AuthDialog";
import Wizard from "./components/Wizard";
import ProofDialog from "./components/ProofDialog";
import OutlookInbox from "./components/OutlookInbox";
import AIMChat from "./components/AIMChat";
import BSOD from "./components/BSOD";
import MySpaceProfileDialog from "./components/MySpaceProfileDialog";
import SettingsPanel from "./components/SettingsPanel";
import { Geolocation } from "@capacitor/geolocation";


import { 
  firebaseSignInAnonymously, 
  firebaseOnAuthStateChanged, 
  firebaseSignOut,
  firebaseSignInWithEmailAndPassword,
  dbOnSnapshot, 
  dbSetDoc, 
  dbGetDoc,
  dbAddDoc,
  dbUpdateDoc,
  dbDeleteDoc,
  dbGetDocs,
  queryWhere
} from "./firebase";
import { searchVenues } from "./services/foursquare";
import { getDeviceUuid, moderateTextWithGemini } from "./services/security";
import { parseBBCode } from "./services/bbcode";

const SPAM_ROASTS = [
  "You sure you want to post that, fam?",
  "This ain't it, chief. The server admin caught you lacking.",
  "Bestie, the validation check failed. Let’s try that again.",
  "Cooked by the system daemon. Post discarded.",
  "Who hurt you? Keep the bad vibes off the local node."
];

const DOXXING_ROASTS = [
  "Bro tried to sneak a social handle in. We don’t do that here.",
  "Unc, no phone numbers or real names allowed. Keep it anonymous.",
  "Gatekeeping is a feature, not a bug. Remove the external links.",
  "Not the @ link... Secure portal validation failed."
];

const RETRO_TAGLINES = [
  "because dating apps suck",
  "find your bathroom line bestie",
  "who did you share a lighter with?",
  "reconnect with that 10/10 you met last night",
  "not a dating app, a digital bulletin board",
  "making local nightlife personal again",
  "reconnect with the bathroom line hero",
  "find the one who vanished into the smoke",
  "neon connections, dial-up speeds",
  "that Galaga high score wasn't a dream",
  "find your bathroom line soulmate",
  "keep the bad vibes off the local node"
];

export default function App() {
  // Device & Auth State
  const [deviceUuid, setDeviceUuid] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [userDoc, setUserDoc] = useState(null);
  const [deviceBanned, setDeviceBanned] = useState(false);
  const [booting, setBooting] = useState(true);

  const isLoggedIn = currentUser && !currentUser.isAnonymous;

  // App Layout State
  const [venues, setVenues] = useState([]);
  const [selectedVenue, setSelectedVenue] = useState(null);
  const [venuePosts, setVenuePosts] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [activeChatConnection, setActiveChatConnection] = useState(null);
  const [navigationScreen, _setNavigationScreen] = useState("home");
  const [navigationHistory, setNavigationHistory] = useState(["home"]);
  const navigationHistoryRef = useRef(navigationHistory);

  useEffect(() => {
    navigationHistoryRef.current = navigationHistory;
  }, [navigationHistory]);

  const setNavigationScreen = (target) => {
    const screen = typeof target === "function" ? target(navigationScreen) : target;
    if (screen === navigationScreen) return;
    
    if (screen === "home") {
      setNavigationHistory(["home"]);
    } else {
      setNavigationHistory(prev => {
        // Filter out transient screens from the prior history
        const cleaned = prev.filter(s => !["login", "proof", "post", "sysop", "chat"].includes(s));
        if (cleaned[cleaned.length - 1] === screen) return cleaned;
        return [...cleaned, screen];
      });
    }
    _setNavigationScreen(screen);
  };

  const handleNavigateBack = () => {
    const history = navigationHistoryRef.current;
    if (history.length <= 1) return;
    
    const newHistory = [...history];
    const currentScreen = newHistory.pop();
    const prevScreen = newHistory[newHistory.length - 1];
    
    // Perform cleanup for specific screens
    if (currentScreen === "profile") {
      setSelectedProfileUser(null);
    } else if (currentScreen === "chat") {
      setActiveChatId(null);
    } else if (currentScreen === "proof") {
      setShowProofDialog(false);
    }
    
    setNavigationHistory(newHistory);
    _setNavigationScreen(prevScreen);
  };
  const [selectedCity, setSelectedCity] = useState("");
  const [hideWelcome, setHideWelcome] = useState(() => {
    return localStorage.getItem("asl_hide_welcome") === "true";
  });

  // Active Data States
  const [showProofDialog, setShowProofDialog] = useState(null); // stores the post object being claimed
  const [selectedProfileUser, setSelectedProfileUser] = useState(null);

  // Interceptor State
  const [authActionCallback, setAuthActionCallback] = useState(null);
  const [moderationError, setModerationError] = useState("");

  // Connection throttle & lockout states
  const [pendingClaims, setPendingClaims] = useState([]);
  const [showCertaintyModal, setShowCertaintyModal] = useState(null);
  const [certaintyCountdown, setCertaintyCountdown] = useState(3);
  const [acceptedConnections, setAcceptedConnections] = useState([]);

  // Safety / strike warning states
  const [hasShownStrike2, setHasShownStrike2] = useState(false);
  const [showStrike2Warning, setShowStrike2Warning] = useState(false);

  // SysOp developer console states
  const [allSysopPosts, setAllSysopPosts] = useState([]);
  const [sysopAppeals, setSysopAppeals] = useState([]);
  const [sysopEmail, setSysopEmail] = useState("");
  const [sysopPassword, setSysopPassword] = useState("");
  const [sysopLoginError, setSysopLoginError] = useState("");

  // Homepage live data states
  const [coolNewPeople, setCoolNewPeople] = useState([]);
  const [allPostsCount, setAllPostsCount] = useState(0);
  const [activeBuddiesCount, setActiveBuddiesCount] = useState(0);
  const [globalActivePosts, setGlobalActivePosts] = useState([]);
  const [feedTab, setFeedTab] = useState("radar");
  const [inboundClaimsCount, setInboundClaimsCount] = useState(0);
  const [favoriters, setFavoriters] = useState([]);
  const [showPostSuccess, setShowPostSuccess] = useState(false);
  const [successTargetVenue, setSuccessTargetVenue] = useState(null);

  // Bar search states
  const [barSearchQuery, setBarSearchQuery] = useState("");
  const [barSearchResults, setBarSearchResults] = useState(null);
  const [isBarSearching, setIsBarSearching] = useState(false);
  const [activeTagline] = useState(() => RETRO_TAGLINES[Math.floor(Math.random() * RETRO_TAGLINES.length)]);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  // Swipe to go back gesture (from left edge)
  useEffect(() => {
    let touchStartX = 0;
    let touchStartY = 0;

    const handleTouchStart = (e) => {
      if (e.touches.length === 1) {
        const clientX = e.touches[0].clientX;
        // Check if the touch starts near the left edge (within 40px)
        if (clientX < 40) {
          touchStartX = clientX;
          touchStartY = e.touches[0].clientY;
        } else {
          touchStartX = 0;
          touchStartY = 0;
        }
      }
    };

    const handleTouchEnd = (e) => {
      if (touchStartX === 0) return;
      
      if (e.changedTouches.length === 1) {
        const deltaX = e.changedTouches[0].clientX - touchStartX;
        const deltaY = e.changedTouches[0].clientY - touchStartY;
        
        // Swipe to the right: deltaX > 100px and mostly horizontal (|deltaY| < 0.6 * deltaX)
        if (deltaX > 100 && Math.abs(deltaY) < deltaX * 0.6) {
          handleNavigateBack();
        }
      }
      touchStartX = 0;
      touchStartY = 0;
    };

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, []);

  // 1. App Startup: Load Device UUID, sign in anonymously, and fetch venues
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Retrieve Capacitor Device UUID or localstorage Web UUID fallback
        const uuid = await getDeviceUuid();
        setDeviceUuid(uuid);

        // Check if device UUID is blacklisted
        const blacklistSnap = await dbGetDoc("blacklisted_devices", uuid);
        if (blacklistSnap.exists() && blacklistSnap.data().banned) {
          setDeviceBanned(true);
          setBooting(false);
          return;
        }

        // Check for App Store Reviewer Mode (Cupertino coordinates or developer override)
        const isOverride = localStorage.getItem("asl_dev_override") === "true";
        let isCupertino = false;
        try {
          const permission = await Geolocation.checkPermissions();
          if (permission.location === "granted") {
            const coordinates = await Geolocation.getCurrentPosition({
              enableHighAccuracy: false,
              timeout: 3000
            });
            const lat = coordinates.coords.latitude;
            const lng = coordinates.coords.longitude;
            if (lat >= 37.30 && lat <= 37.35 && lng >= -122.06 && lng <= -122.01) {
              isCupertino = true;
            }
          }
        } catch (e) {
          console.warn("Cupertino geofence load check failed:", e);
        }

        if (isOverride || isCupertino) {
          console.log("App Store Reviewer Mode Active! Setting city to Cupertino.");
          localStorage.setItem("asl_reviewer_mode", "true");
          setSelectedCity("Cupertino");
        } else {
          localStorage.removeItem("asl_reviewer_mode");
        }

        // Load all venues for folder tree structure
        const allVenues = await searchVenues("");
        setVenues(allVenues);
      } catch (err) {
        console.error("Initialization error:", err);
      } finally {
        setBooting(false);
      }
    };

    initializeApp();
  }, []);

  // 2. Auth Listener and Firestore User Record binding
  useEffect(() => {
    const unsubAuth = firebaseOnAuthStateChanged((user) => {
      if (!user) {
        // Only sign in anonymously if there is no persistent session found
        firebaseSignInAnonymously().catch(e => console.error("Anon sign in failed", e));
        return;
      }

      setCurrentUser(user);
      if (user && !user.isAnonymous) {
        // Sync user device registration in background
        dbSetDoc("users", user.uid, {
          uid: user.uid,
          email: user.email || "",
          uuid: deviceUuid,
          lastLogin: Date.now(),
          unlockedThemes: ["classic", "glitter", "cyberpunk", "sunset", "goth", "pokemon"]
        }, true);

        // Reviewer Mode Mock Data Injection
        const injectReviewerMockData = async () => {
          const isReviewer = localStorage.getItem("asl_reviewer_mode") === "true" || localStorage.getItem("asl_dev_override") === "true";
          if (isReviewer) {
            // 1. Inject Cupertino into user's profile and selectedCity
            await dbSetDoc("users", user.uid, {
              selectedCity: "Cupertino",
              homeCity: "Cupertino"
            }, true);
            
            // 2. Create mock posts for Cupertino venues if they don't exist
            const postsSnap = await dbGetDocs("posts", [queryWhere("venueId", "==", "venue_cafemacs")]);
            if (postsSnap.empty) {
              console.log("Injecting reviewer mock posts...");
              // Create mock author "tom"
              await dbSetDoc("users", "tom", {
                username: "tom",
                emoji_avatar: "👨",
                bio: "Your first friend. I like music.",
                homeCity: "Cupertino",
                selectedCity: "Cupertino"
              }, true);
              
              await dbAddDoc("posts", {
                userId: "tom",
                username: "tom",
                emoji_avatar: "👨",
                mood: "nostalgic",
                bio: "Your first friend.",
                venueId: "venue_cafemacs",
                venueName: "Caffe Macs",
                venueCity: "Cupertino",
                text: "Saw someone with a classic rainbow Apple logo shirt here. Are you a legacy developer? Let's connect!",
                timestamp: Date.now() - 3600000,
                encounterDate: "Today",
                encounterTime: "Lunchtime",
                uniquenessPrompt: "What color was the shirt?",
                proofAnswer: "rainbow",
                status: "active",
                thumbsUpCount: 2
              });
              
              await dbAddDoc("posts", {
                userId: "tom",
                username: "tom",
                emoji_avatar: "👨",
                mood: "chill",
                bio: "Your first friend.",
                venueId: "venue_applepark",
                venueName: "Apple Park Visitor Center Cafe",
                venueCity: "Cupertino",
                text: "Sitting by the olive trees. Let's chat about dial-up portals.",
                timestamp: Date.now() - 7200000,
                encounterDate: "Today",
                encounterTime: "Morning",
                uniquenessPrompt: "What trees were they?",
                proofAnswer: "olive",
                status: "active",
                thumbsUpCount: 5
              });
            }

            // 3. Create a mock connection/claim from Tom to the reviewer if none exists
            const connSnap = await dbGetDocs("connections", [
              queryWhere("receiverId", "==", user.uid),
              queryWhere("senderId", "==", "tom")
            ]);
            if (connSnap.empty) {
              console.log("Injecting reviewer mock connection...");
              await dbAddDoc("connections", {
                senderId: "tom",
                senderUsername: "tom",
                senderEmoji: "👨",
                receiverId: user.uid,
                receiverUsername: "Reviewer",
                receiverEmoji: "🍎",
                postId: "mock_post_reviewer",
                postText: "Saw you at Caffe Macs looking at code.",
                status: "pending",
                encounterDetails: "We locked eyes near the espresso machine.",
                timestamp: Date.now(),
                venueName: "Caffe Macs",
                proofText: "I was wearing a classic rainbow Apple logo shirt!"
              });
            }
          }
        };

        injectReviewerMockData();

        // Subscribe to user flags and ban status in real-time
        const unsubUserDoc = dbOnSnapshot("users", [], (snapshot) => {
          const userRecord = snapshot.docs.find(d => d.id === user.uid);
          if (userRecord) {
            const data = userRecord.data();
            setUserDoc(data);
            if (!data.homeCity) {
              dbSetDoc("users", user.uid, {
                homeCity: data.selectedCity || selectedCity || "Phoenix",
                selectedCity: data.selectedCity || selectedCity || "Phoenix"
              }, true);
            }
            if (data.selectedCity) {
              const isReviewer = localStorage.getItem("asl_reviewer_mode") === "true" || localStorage.getItem("asl_dev_override") === "true";
              setSelectedCity(isReviewer ? "Cupertino" : data.selectedCity);
            }
            if (data.banned || data.flag_count >= 3) {
              setDeviceBanned(true);
              if (deviceUuid) {
                dbSetDoc("blacklisted_devices", deviceUuid, { banned: true, userId: user.uid, timestamp: Date.now() }, true);
              }
              firebaseSignOut();
            }
          }
        });

        return () => unsubUserDoc();
      } else {
        setUserDoc(null);
      }
    });

    return () => unsubAuth();
  }, [deviceUuid]);

  // 2.5. Active Presence Heartbeat Update
  useEffect(() => {
    if (!currentUser || currentUser.isAnonymous) return;

    const sendHeartbeat = () => {
      dbSetDoc("users", currentUser.uid, {
        lastActiveAt: Date.now()
      }, true).catch(err => console.error("Heartbeat update failed:", err));
    };

    // Initial heartbeat
    sendHeartbeat();

    // Heartbeat every 2 minutes
    const interval = setInterval(sendHeartbeat, 120000);

    // Heartbeat when window/tab gains focus
    window.addEventListener("focus", sendHeartbeat);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", sendHeartbeat);
    };
  }, [currentUser]);


  // Strike 2 Warning Alert Trigger
  useEffect(() => {
    if (userDoc && userDoc.flag_count === 2 && !hasShownStrike2) {
      setTimeout(() => {
        setShowStrike2Warning(true);
        setHasShownStrike2(true);
      }, 0);
    }
  }, [userDoc, hasShownStrike2]);

  // Track pending outbound connection claims for the One-and-Done limit
  // Also runs a client-side TTL sweep: auto-deletes claims older than 48 hours
  useEffect(() => {
    if (!currentUser || currentUser.isAnonymous) {
      setTimeout(() => setPendingClaims([]), 0);
      return;
    }
    const TTL_MS = 48 * 60 * 60 * 1000; // 48 hours
    const unsub = dbOnSnapshot("connections", [
      queryWhere("senderId", "==", currentUser.uid),
      queryWhere("status", "==", "pending")
    ], (snapshot) => {
      const claims = [];
      const now = Date.now();
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const ts = data.timestamp || data.encounterTimestamp || 0;
        // Auto-expire pending claims older than 48 hours
        if (ts && (now - ts) > TTL_MS) {
          dbDeleteDoc("connections", doc.id).catch(err =>
            console.warn("TTL sweep: could not delete expired claim", doc.id, err)
          );
        } else {
          claims.push({ id: doc.id, ...data });
        }
      });
      setPendingClaims(claims);
    });
    return () => unsub();
  }, [currentUser]);

  // 3-second countdown when Certainty Modal opens
  useEffect(() => {
    if (!showCertaintyModal) {
      setTimeout(() => setCertaintyCountdown(3), 0);
      return;
    }
    setTimeout(() => setCertaintyCountdown(3), 0);
    const interval = setInterval(() => {
      setCertaintyCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [showCertaintyModal]);

  // Subscribe to accepted connections for the Friend Space
  useEffect(() => {
    if (!currentUser || currentUser.isAnonymous) {
      setTimeout(() => setAcceptedConnections([]), 0);
      return;
    }
    const unsub = dbOnSnapshot("connections", [], (snapshot) => {
      const accepted = [];
      snapshot.docs.forEach(doc => {
        const d = doc.data();
        if (
          d.status === "accepted" &&
          (d.senderId === currentUser.uid || d.receiverId === currentUser.uid)
        ) {
          const friendId = d.senderId === currentUser.uid ? d.receiverId : d.senderId;
          if (!accepted.find(a => a.userId === friendId)) {
            accepted.push({ userId: friendId, connectionId: doc.id, ...d });
          }
        }
      });
      setAcceptedConnections(accepted);
    });
    return () => unsub();
  }, [currentUser]);

  // Detect /sysop developer backdoor path
  useEffect(() => {
    if (window.location.pathname === "/sysop") {
      setTimeout(() => setNavigationScreen("sysop"), 0);
    }
  }, []);

  // SysOp console database loader
  useEffect(() => {
    if (navigationScreen !== "sysop" || currentUser?.uid !== "sysop_admin") return;

    const unsubPosts = dbOnSnapshot("posts", [], (snapshot) => {
      const posts = [];
      snapshot.docs.forEach(doc => {
        posts.push({ id: doc.id, ...doc.data() });
      });
      setAllSysopPosts(posts);
    });

    const unsubAppeals = dbOnSnapshot("appeals", [], (snapshot) => {
      const appealsList = [];
      snapshot.docs.forEach(doc => {
        appealsList.push({ id: doc.id, ...doc.data() });
      });
      setSysopAppeals(appealsList);
    });

    return () => {
      unsubPosts();
      unsubAppeals();
    };
  }, [navigationScreen, currentUser]);

  // Live statistics and dynamic homepage users subscriptions
  useEffect(() => {
    // Total posts count
    const unsubPosts = dbOnSnapshot("posts", [], (snapshot) => {
      setAllPostsCount(snapshot.size);
    });

    // Active buddies (logged in/registered in the last 7 days) and dynamic new users list
    const unsubUsers = dbOnSnapshot("users", [], (snapshot) => {
      const now = Date.now();
      const list = [];
      let activeCount = 0;

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const time = data.lastLogin || data.createdAt || 0;
        
        // Count active buddies (7-day threshold to capture mock profiles too)
        if (now - time < 7 * 24 * 60 * 60 * 1000) {
          activeCount++;
        }

        // Add to cool new people list if not SysOp or Tom
        if (doc.id !== "sysop_admin" && doc.id !== "tom") {
          list.push({ uid: doc.id, ...data });
        }
      });

      // Sort by createdAt descending
      list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setCoolNewPeople(list.slice(0, 3));
      setActiveBuddiesCount(activeCount);
    });

    return () => {
      unsubPosts();
      unsubUsers();
    };
  }, []);

  // Favorites feed: subscribe to all posts and filter by the logged-in user's favorited bars
  // 2. Subscribe to all active Posts globally
  useEffect(() => {
    const unsub = dbOnSnapshot("posts", [], (snapshot) => {
      const posts = [];
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.status !== "suppressed") {
          posts.push({ id: doc.id, ...data });
        }
      });
      posts.sort((a, b) => (b.timestamp || b.encounterTimestamp || 0) - (a.timestamp || a.encounterTimestamp || 0));
      setGlobalActivePosts(posts);
    });
    return () => unsub();
  }, []);

  // 2a. Background sync for offline posts when network re-establishes
  useEffect(() => {
    const handleOnline = async () => {
      const queuedStr = localStorage.getItem("asl_offline_posts");
      if (!queuedStr) return;
      try {
        const queuedPosts = JSON.parse(queuedStr);
        if (!Array.isArray(queuedPosts) || queuedPosts.length === 0) return;
        
        console.log("Device is back online! Syncing offline posts in background:", queuedPosts);
        for (const postData of queuedPosts) {
          // Add post to Firestore
          await dbAddDoc("posts", {
            ...postData,
            timestamp: Date.now()
          });

          // Also update the user's profile card
          if (currentUser) {
            await dbSetDoc("users", currentUser.uid, {
              username: postData.username,
              mood: postData.mood,
              bio: postData.bio,
              profileTheme: postData.profileTheme,
              emoji_avatar: postData.emoji_avatar,
              lastPostAt: Date.now()
            }, true);
          }
        }
        
        localStorage.removeItem("asl_offline_posts");
        alert("Sync Complete: Your queued offline posts have been successfully transmitted to the server!");
      } catch (err) {
        console.error("Error background-syncing offline posts:", err);
      }
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [currentUser]);

  // 2b. Subscribe to inbound connection claims (pending mail)
  useEffect(() => {
    if (!currentUser || currentUser.isAnonymous) {
      setTimeout(() => setInboundClaimsCount(0), 0);
      return;
    }
    const unsub = dbOnSnapshot("connections", [], (snapshot) => {
      let count = 0;
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.receiverId === currentUser.uid && data.status === "pending") {
          count++;
        }
      });
      setInboundClaimsCount(count);
    });
    return () => unsub();
  }, [currentUser]);

  // 2c. Subscribe to users who recently favorited the selected venue
  useEffect(() => {
    if (!selectedVenue) {
      setTimeout(() => setFavoriters([]), 0);
      return;
    }

    const unsub = dbOnSnapshot("users", [], (snapshot) => {
      const list = [];
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.favorited_bars && data.favorited_bars.includes(selectedVenue.fsq_id)) {
          list.push({ uid: doc.id, ...data });
        }
      });
      // Sort by activity/login/createdAt proxy to show recently active fans
      list.sort((a, b) => (b.lastLogin || b.createdAt || 0) - (a.lastLogin || a.createdAt || 0));
      setFavoriters(list.slice(0, 4));
    });

    return () => unsub();
  }, [selectedVenue]);



  // 3. Subscribe to Posts for the selected Venue
  useEffect(() => {
    if (!selectedVenue) {
      setTimeout(() => setVenuePosts([]), 0);
      return;
    }

    const unsubPosts = dbOnSnapshot(
      "posts",
      [],
      (snapshot) => {
        const posts = [];
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          const isBlocked = userDoc?.blockedUsers?.includes(data.userId);
          const isReported = data.reported || data.status === "reported";
          if (data.venueId === selectedVenue.fsq_id && !isBlocked && !isReported) {
            posts.push({ id: doc.id, ...data });
          }
        });
        // Sort descending by timestamp
        posts.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        setVenuePosts(posts);
      }
    );

    return () => unsubPosts();
  }, [selectedVenue, userDoc]);



  // 5. Intercept checks for Auth Wall
  const runWithAuthenticationCheck = (action) => {
    if (!currentUser || currentUser.isAnonymous) {
      // User is guest/anonymous, launch Auth Wall
      setAuthActionCallback(() => action);
      setNavigationScreen("login");
    } else {
      // User is already logged in, run action directly
      action();
    }
  };

  const handleAuthSuccess = () => {
    if (authActionCallback) {
      authActionCallback(); // Resume action
      setAuthActionCallback(null);
    } else {
      setNavigationScreen("home");
    }
  };

  // Post wizard submit handler
  const handleWizardSubmit = async (postData) => {
    try {
      // Offline detection and queuing
      if (!navigator.onLine) {
        const offlineQueue = JSON.parse(localStorage.getItem("asl_offline_posts") || "[]");
        offlineQueue.push({
          ...postData,
          userId: currentUser.uid,
          timestamp: Date.now()
        });
        localStorage.setItem("asl_offline_posts", JSON.stringify(offlineQueue));
        
        alert("Offline Mode: Your post has been saved locally and queued. It will automatically upload once a connection is re-established.");
        
        // Auto-navigate to the venue's feed or home
        const matchedVenue = venues.find(v => v.fsq_id === postData.venueId);
        if (matchedVenue) {
          setSelectedVenue(matchedVenue);
          setSelectedCity(matchedVenue.city);
          setNavigationScreen("feed");
        } else {
          setNavigationScreen("home");
        }
        return;
      }

      // Ensure userDoc has homeCity set in Firestore before writing post to satisfy security rules
      if (userDoc && !userDoc.homeCity) {
        const defaultCity = selectedCity || "Phoenix";
        await dbSetDoc("users", currentUser.uid, {
          homeCity: defaultCity,
          selectedCity: defaultCity
        }, true);
        userDoc.homeCity = defaultCity;
      }

      // Check metropolitan portal validation constraints (bypass if Reviewer Mode is active)
      const isReviewerMode = localStorage.getItem("asl_reviewer_mode") === "true" || localStorage.getItem("asl_dev_override") === "true";
      const userHomeCity = userDoc?.homeCity || userDoc?.selectedCity || selectedCity || "Phoenix";
      const postCity = postData.venueCity || "Phoenix";
      if (!isReviewerMode && postCity.toLowerCase() !== userHomeCity.toLowerCase()) {
        const funnyMessages = [
          `Wrong city, bro. Stick to your own turf in ${userHomeCity}!`,
          `Nice try, traveler. The server admin caught you trying to post in ${postCity} from your home node in ${userHomeCity}.`,
          `Error: Metropolitan mismatch. You are registered in ${userHomeCity}. No cross-posting allowed!`,
          `You sure you're there, fam? The database daemon says you're posting in ${postCity} but your account is based in ${userHomeCity}.`,
          `Bzzzt! Portal mismatch. You cannot post to ${postCity} while logged into the ${userHomeCity} node.`,
          `Geographic lock engaged. Go back to your own ${userHomeCity} node, bestie.`
        ];
        const randomMsg = funnyMessages[Math.floor(Math.random() * funnyMessages.length)];
        throw new Error(randomMsg);
      }

      // ── Post Creation Cooldown (15 minutes) ─────────────────────────────
      const COOLDOWN_MS = 15 * 60 * 1000;
      const lastPostAt = userDoc?.lastPostAt || 0;
      const timeSinceLast = Date.now() - lastPostAt;
      if (timeSinceLast < COOLDOWN_MS) {
        const minutesLeft = Math.ceil((COOLDOWN_MS - timeSinceLast) / 60000);
        const cooldownMessages = [
          `Whoa, slow down. The server daemon is still processing your last post. Try again in ${minutesLeft} minute${minutesLeft > 1 ? "s" : ""}.`,
          `Error 429: Too Many Posts. The database is still catching its breath. Wait ${minutesLeft} more minute${minutesLeft > 1 ? "s" : ""}, chief.`,
          `Signal cooldown active. You posted too recently. The node enforces a 15-minute buffer between transmissions. ${minutesLeft} minute${minutesLeft > 1 ? "s" : ""} remaining.`,
          `Post rate limit exceeded. Even dial-up has a cooldown. Come back in ${minutesLeft} minute${minutesLeft > 1 ? "s" : ""}.`
        ];
        throw new Error(cooldownMessages[Math.floor(Math.random() * cooldownMessages.length)]);
      }

      // ── Daily Post Limit Check (max 3 posts per 24 hours) ───────────────
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      const postsSnap = await dbGetDocs("posts", [
        queryWhere("userId", "==", currentUser.uid)
      ]);
      const recentPostsCount = postsSnap.docs.filter(doc => {
        const data = doc.data();
        const timestamp = data.timestamp || data.encounterTimestamp || 0;
        return timestamp >= oneDayAgo;
      }).length;
      if (recentPostsCount >= 3) {
        const rateLimitMsg = "Rate Limit: You have exceeded the daily limit of 3 posts per 24 hours. Keep the node clean!";
        alert(rateLimitMsg);
        throw new Error(rateLimitMsg);
      }

      await dbAddDoc("posts", {
        ...postData,
        userId: currentUser.uid
      });

      // Also update the user's profile card in the users collection
      // Write lastPostAt timestamp for cooldown enforcement
      await dbSetDoc("users", currentUser.uid, {
        username: postData.username,
        mood: postData.mood,
        bio: postData.bio,
        profileTheme: postData.profileTheme,
        emoji_avatar: postData.emoji_avatar,
        lastPostAt: Date.now()
      }, true);

      // Set success modal states
      const matchedVenue = venues.find(v => v.fsq_id === postData.venueId);
      setSuccessTargetVenue(matchedVenue || null);
      setShowPostSuccess(true);
      setNavigationScreen("home"); // Close the wizard modal in the background
    } catch (err) {
      console.error("Error creating post:", err);
      setModerationError(err.message || String(err));
    }
  };

  const handleSuccessThanks = () => {
    setShowPostSuccess(false);
    if (successTargetVenue) {
      setSelectedVenue(successTargetVenue);
      setSelectedCity(successTargetVenue.city);
      setNavigationScreen("feed");
    } else {
      setNavigationScreen("home");
    }
    setSuccessTargetVenue(null);
  };

  const handleThatWasMe = (post) => {
    if (userDoc?.handshake_cooldown && userDoc.handshake_cooldown > Date.now()) {
      alert("Handshake Denied. The user confirmed that was definitely not you. You are locked out of outbound signals for 12 hours. Stop guessing, it's embarrassing.");
      return;
    }

    if (pendingClaims.length > 0) {
      alert("One-and-Done Throttle: You already have an active pending claim. You cannot submit another claim until your current claim is resolved.");
      return;
    }

    setShowCertaintyModal(post);
  };

  const isPostLiked = (postId) => {
    try {
      const likedStr = localStorage.getItem("asl_liked_posts") || "[]";
      return JSON.parse(likedStr).includes(postId);
    } catch {
      return false;
    }
  };

  const handleDeletePost = async (post) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this missed connection post forever?");
    if (!confirmDelete) return;
    try {
      await dbDeleteDoc("posts", post.id);
      alert("Post deleted successfully.");
    } catch (err) {
      console.error("Error deleting post:", err);
      alert("Failed to delete post.");
    }
  };

  const handleReportPost = async (post) => {
    const confirmReport = window.confirm("Are you sure you want to report this post for safety violations?");
    if (!confirmReport) return;
    try {
      // 1. Mark reported: true on the post document
      await dbUpdateDoc("posts", post.id, { reported: true });

      // 2. Increment poster's flag_count in their users document
      const posterSnap = await dbGetDoc("users", post.userId);
      if (posterSnap.exists()) {
        const posterData = posterSnap.data();
        const currentFlags = posterData.flag_count || 0;
        await dbUpdateDoc("users", post.userId, { flag_count: currentFlags + 1 });
      }

      alert("Thank you. The post has been flagged and removed from your feed.");
    } catch (err) {
      console.error("Error reporting post:", err);
    }
  };

  const handleThumbsUp = async (post) => {
    if (post.userId === currentUser?.uid) {
      alert("Self-approvals aren't supported, bestie. You cannot thumbs up your own post!");
      return;
    }
    try {
      const likedStr = localStorage.getItem("asl_liked_posts") || "[]";
      let likedArray = JSON.parse(likedStr);
      let newCount = post.thumbsUpCount || 0;

      if (likedArray.includes(post.id)) {
        newCount = Math.max(0, newCount - 1);
        likedArray = likedArray.filter(id => id !== post.id);
      } else {
        newCount = newCount + 1;
        likedArray.push(post.id);
      }

      localStorage.setItem("asl_liked_posts", JSON.stringify(likedArray));
      await dbUpdateDoc("posts", post.id, { thumbsUpCount: newCount });
    } catch (err) {
      console.error("Error liking/unliking post:", err);
    }
  };

  const handleSysopLogin = async (e) => {
    e.preventDefault();
    setSysopLoginError("");
    try {
      await firebaseSignInWithEmailAndPassword(sysopEmail, sysopPassword);
      setSysopEmail("");
      setSysopPassword("");
    } catch (err) {
      setSysopLoginError(err.message || String(err));
    }
  };

  const handleSysopRestorePost = async (postId) => {
    try {
      await dbUpdateDoc("posts", postId, { status: "active" });
      // SysOp Audit Trail — write every operator action
      await dbAddDoc("admin_audit_log", {
        action: "restore_post",
        targetId: postId,
        operatorUid: currentUser?.uid || "unknown",
        // eslint-disable-next-line react-hooks/purity
        timestamp: Date.now()
      });
      alert("Post status restored to active.");
    } catch (err) {
      alert("Error restoring post: " + err.message);
    }
  };

  const handleSysopResolveAppeal = async (appeal) => {
    try {
      // 1. Reset user flag count and banned status
      await dbUpdateDoc("users", appeal.userId, {
        flag_count: 0,
        banned: false,
        isBanned: false,
        reporterIds: []
      });

      // 2. Delete device UUID from blacklisted_devices if it's there
      const userSnap = await dbGetDoc("users", appeal.userId);
      if (userSnap.exists()) {
        const uuid = userSnap.data().uuid;
        if (uuid) {
          await dbDeleteDoc("blacklisted_devices", uuid);
        }
      }

      // 3. Delete the appeal document itself
      await dbDeleteDoc("appeals", appeal.id);

      // SysOp Audit Trail — write every operator action
      await dbAddDoc("admin_audit_log", {
        action: "resolve_appeal",
        targetId: appeal.userId,
        appealId: appeal.id,
        operatorUid: currentUser?.uid || "unknown",
        // eslint-disable-next-line react-hooks/purity
        timestamp: Date.now(),
        details: { username: appeal.username || "unknown" }
      });
      
      alert("User unbanned, flags reset, device unblacklisted.");
    } catch (err) {
      alert("Error resolving appeal: " + err.message);
    }
  };

  const handleSelectVenue = (venue) => {
    setSelectedVenue(venue);
    setNavigationScreen("feed");
  };

  const handleBarSearch = async (e) => {
    if (e) e.preventDefault();
    if (!barSearchQuery.trim()) {
      setBarSearchResults(null);
      return;
    }
    setIsBarSearching(true);
    try {
      const results = await searchVenues(barSearchQuery, ""); // No city filter to search nationwide
      setBarSearchResults(results);
    } catch (err) {
      console.error("Error searching nationwide bars:", err);
    } finally {
      setIsBarSearching(false);
    }
  };

  const handleOpenMyProfile = async () => {
    if (!currentUser) return;
    setNavigationScreen("profile");
    try {
      const userSnap = await dbGetDoc("users", currentUser.uid);
      if (userSnap.exists()) {
        const userData = userSnap.data();
        setSelectedProfileUser({
          userId: currentUser.uid,
          username: userData.username || "My Alias",
          mood: userData.mood || "Chillin' 😎",
          bio: userData.bio || "Welcome to my profile!",
          profileTheme: userData.profileTheme || "classic",
          emoji_avatar: userData.emoji_avatar || "👥🥃💖",
          spotify_track_uri: userData.spotify_track_uri || "spotify:track:4PTG3Z6ehGkBF3zI7YSp6g",
          spotify_song_title: userData.spotify_song_title || "",
          spotify_artist_name: userData.spotify_artist_name || "",
          favorited_bars: userData.favorited_bars || [],
          headline: userData.headline || "Everyone's favorite dial-up partner",
          lastActiveAt: userData.lastActiveAt || Date.now()
        });
      } else {
        setSelectedProfileUser({
          userId: currentUser.uid,
          username: "My Alias",
          mood: "Chillin' 😎",
          bio: "Welcome to my profile!",
          profileTheme: "classic",
          emoji_avatar: "👥🥃💖",
          spotify_track_uri: "spotify:track:4PTG3Z6ehGkBF3zI7YSp6g",
          spotify_song_title: "",
          spotify_artist_name: "",
          favorited_bars: [],
          headline: "Everyone's favorite dial-up partner",
          lastActiveAt: Date.now()
        });
      }
    } catch (err) {
      console.error("Error opening my profile:", err);
    }
  };
 
  const handleOpenProfile = async (userId, fallbackData) => {
    setNavigationScreen("profile");
    try {
      const userSnap = await dbGetDoc("users", userId);
      if (userSnap.exists()) {
        const userData = userSnap.data();
        setSelectedProfileUser({
          userId: userId,
          username: userData.username || fallbackData.username || "Anonymous Connection",
          mood: userData.mood || fallbackData.mood || "Chillin' 😎",
          bio: userData.bio || fallbackData.bio || "Just browsing the local spots.",
          profileTheme: userData.profileTheme || fallbackData.profileTheme || "classic",
          emoji_avatar: userData.emoji_avatar || fallbackData.emoji_avatar || "👥🥃💖",
          spotify_track_uri: userData.spotify_track_uri || fallbackData.spotify_track_uri || "spotify:track:4PTG3Z6ehGkBF3zI7YSp6g",
          spotify_song_title: userData.spotify_song_title || fallbackData.spotify_song_title || "",
          spotify_artist_name: userData.spotify_artist_name || fallbackData.spotify_artist_name || "",
          favorited_bars: userData.favorited_bars || [],
          headline: userData.headline || fallbackData.headline || "Everyone's favorite dial-up partner",
          lastActiveAt: userData.lastActiveAt || fallbackData.lastActiveAt || null
        });
      } else {
        setSelectedProfileUser({
          userId: userId,
          username: fallbackData.username || "Anonymous Connection",
          mood: fallbackData.mood || "Chillin' 😎",
          bio: fallbackData.bio || "Just browsing the local spots.",
          profileTheme: fallbackData.profileTheme || fallbackData.profileTheme || "classic",
          emoji_avatar: fallbackData.emoji_avatar || "👥🥃💖",
          spotify_track_uri: fallbackData.spotify_track_uri || "spotify:track:4PTG3Z6ehGkBF3zI7YSp6g",
          spotify_song_title: fallbackData.spotify_song_title || "",
          spotify_artist_name: fallbackData.spotify_artist_name || "",
          favorited_bars: [],
          headline: fallbackData.headline || "Everyone's favorite dial-up partner",
          lastActiveAt: fallbackData.lastActiveAt || null
        });
      }
    } catch (err) {
      console.error("Error opening profile:", err);
      setSelectedProfileUser({
        userId: userId,
        username: fallbackData.username || "Anonymous Connection",
        mood: fallbackData.mood || "Chillin' 😎",
        bio: fallbackData.bio || "Just browsing the local spots.",
        profileTheme: fallbackData.profileTheme || fallbackData.profileTheme || "classic",
        emoji_avatar: fallbackData.emoji_avatar || "👥🥃💖",
        spotify_track_uri: fallbackData.spotify_track_uri || "spotify:track:4PTG3Z6ehGkBF3zI7YSp6g",
        spotify_song_title: fallbackData.spotify_song_title || "",
        spotify_artist_name: fallbackData.spotify_artist_name || "",
        favorited_bars: [],
        headline: fallbackData.headline || "Everyone's favorite dial-up partner",
        lastActiveAt: fallbackData.lastActiveAt || null
      });
    }
  };


  const handleSaveProfile = async (updatedData) => {
    if (!currentUser) return;
    try {
      await dbSetDoc("users", currentUser.uid, {
        ...updatedData,
        uid: currentUser.uid,
        email: currentUser.email || "",
        uuid: deviceUuid || "unknown_uuid",
        lastLogin: Date.now()
      }, true);
      setSelectedProfileUser(prev => prev ? {
        ...prev,
        ...updatedData
      } : null);
    } catch (err) {
      console.error("Error saving profile:", err);
      alert("Error saving profile: " + err.message);
    }
  };

  const handleToggleFavorite = async (venue) => {
    if (!currentUser || currentUser.isAnonymous) {
      alert("Please log in to add venues to favorites.");
      return;
    }
    try {
      const currentFavorites = userDoc?.favorited_bars || [];
      let updatedFavorites;
      if (currentFavorites.includes(venue.fsq_id)) {
        updatedFavorites = currentFavorites.filter(id => id !== venue.fsq_id);
      } else {
        updatedFavorites = [...currentFavorites, venue.fsq_id];
      }
      await dbSetDoc("users", currentUser.uid, {
        favorited_bars: updatedFavorites
      }, true);
      alert(currentFavorites.includes(venue.fsq_id) ? "Removed from favorites." : "Added to favorites!");
    } catch (err) {
      console.error("Error toggling favorite:", err);
      alert("Failed to update favorites.");
    }
  };

  // Claim post ("That was me!") proof submit handler
  const handleProofSubmit = async (proofText) => {
    try {
      const moderation = await moderateTextWithGemini(proofText, "proof");
      if (!moderation.approved) {
        const roasts = moderation.category === "doxxing" ? DOXXING_ROASTS : SPAM_ROASTS;
        const randomRoast = roasts[Math.floor(Math.random() * roasts.length)];
        throw new Error(randomRoast);
      }

      // ── Daily Claim Throttle (max 3 signal claims per 24 hours) ──────────
      const todayStr = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
      const claimDate = userDoc?.dailyClaimDate || "";
      const claimCount = claimDate === todayStr ? (userDoc?.dailyClaimCount || 0) : 0;

      if (claimCount >= 3) {
        throw new Error(
          "Daily Signal Limit Reached: You've already fired off 3 outbound claims today. " +
          "The network enforces a 24-hour cooldown to keep the feed authentic. Try again tomorrow."
        );
      }

      await dbAddDoc("connections", {
        postId: showProofDialog.id,
        postText: showProofDialog.text,
        venueName: showProofDialog.venueName,
        senderId: currentUser.uid,
        receiverId: showProofDialog.userId,
        proofText,
        status: "pending"
      });

      // Increment the user's daily claim counter
      await dbSetDoc("users", currentUser.uid, {
        dailyClaimCount: claimCount + 1,
        dailyClaimDate: todayStr
      }, true);

      setShowProofDialog(null);
      setNavigationScreen(selectedVenue ? "feed" : "home");
      alert("Verification sent. Poster will review details.");
    } catch (err) {
      console.error("Error submitting proof:", err);
      setModerationError(err.message || String(err));
    }
  };

  // Open Chat Room from Inbox or MySpace Profile handler
  const handleOpenChat = async (chatId, connection) => {
    const normalizedConnection = {
      ...connection,
      receiverId: connection.receiverId === "me" ? currentUser?.uid : connection.receiverId
    };

    if (chatId) {
      setActiveChatId(chatId);
      setActiveChatConnection(normalizedConnection);
      return;
    }

    // Find or create chat for connection
    const unsub = dbOnSnapshot("chats", [], async (snapshot) => {
      unsub();
      const chat = snapshot.docs.find(d => d.data().connectionId === normalizedConnection.id);
      if (chat) {
        setActiveChatId(chat.id);
      } else {
        try {
          const chatRef = await dbAddDoc("chats", {
            connectionId: normalizedConnection.id,
            participants: [normalizedConnection.senderId, normalizedConnection.receiverId],
            lastMessage: "System: Profile chat started.",
            lastTimestamp: Date.now(),
            venueName: normalizedConnection.venueName || "Profile Link"
          });
          setActiveChatId(chatRef.id);
        } catch (err) {
          console.error("Error creating profile chat:", err);
        }
      }
    });

    setActiveChatConnection(normalizedConnection);
  };

  const handleLogout = async () => {
    if (window.confirm("Are you sure you want to disconnect from asl?")) {
      await firebaseSignOut();
      window.location.reload(); // Re-trigger guest onboarding
    }
  };



  // Lock user into BSOD if marked banned
  if (deviceBanned || (userDoc && (userDoc.banned || userDoc.flag_count >= 3))) {
    return <BSOD currentUser={currentUser} deviceUuid={deviceUuid} />;
  }

  if (showSplash) {
    return (
      <div className="myspace-splash">
        <div className="myspace-splash-logo">asl</div>
        <div className="myspace-splash-tagline">{activeTagline}</div>
      </div>
    );
  }

  if (booting) {
    return (
      <div 
        style={{ 
          backgroundColor: "#008080", 
          color: "white", 
          display: "flex", 
          flexDirection: "column",
          justifyContent: "center", 
          alignItems: "center", 
          width: "100vw", 
          height: "100vh",
          fontFamily: "Tahoma, sans-serif"
        }}
      >
        <img src="/logo.png" alt="asl" style={{ width: "64px", height: "64px", marginBottom: "15px", imageRendering: "pixelated" }} />
        <h2 style={{ fontWeight: "normal" }}>asl v1.0</h2>
        <p style={{ fontSize: "11px", color: "#ccc" }}>Starting background networking services . . .</p>
      </div>
    );
  }

  if (navigationScreen === "sysop") {
    return (
      <div className="sysop-terminal">
        <div className="sysop-header">
          <h1>asl.com - Secure System Operator Terminal v2.1</h1>
          <p>Device UUID: {deviceUuid || "UNKNOWN_NODE"}</p>
        </div>
        
        {currentUser?.uid === "sysop_admin" ? (
          /* SysOp Console */
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2>WELCOME, SYSOP ADMINISTRATOR</h2>
              <button className="sysop-btn" onClick={() => { firebaseSignOut(); window.location.reload(); }}>
                [ TERMINATE SESSION ]
              </button>
            </div>
            
            <div className="sysop-section">
              <h3>🚨 SUBMITTED USER APPEALS</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "10px" }}>
                {sysopAppeals.length === 0 ? (
                  <p style={{ color: "#888", fontStyle: "italic" }}>No pending unban appeals found in database.</p>
                ) : (
                  sysopAppeals.map(appeal => (
                    <div key={appeal.id} className="sysop-item" style={{ paddingBottom: "15px" }}>
                      <p><strong>Appeal ID:</strong> {appeal.id}</p>
                      <p><strong>User ID:</strong> {appeal.userId}</p>
                      <p><strong>User Email:</strong> {appeal.email || "N/A"}</p>
                      <p><strong>Reason:</strong> "{appeal.reason}"</p>
                      <p><strong>Submitted:</strong> {new Date(appeal.timestamp).toLocaleString()}</p>
                      <button 
                        className="sysop-btn" 
                        style={{ marginTop: "10px" }}
                        onClick={() => handleSysopResolveAppeal(appeal)}
                      >
                        [ OVERRIDE BAN / RESTORE USER ]
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="sysop-section">
              <h3>📝 SYSTEM POST REGISTRY (SUPPRESSED & INACTIVE POSTS)</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "10px" }}>
                {(() => {
                  const suppressed = allSysopPosts.filter(p => p.status !== "active");
                  if (suppressed.length === 0) {
                    return <p style={{ color: "#888", fontStyle: "italic" }}>No suppressed/inactive posts found.</p>;
                  }
                  return suppressed.map(post => (
                    <div key={post.id} className="sysop-item" style={{ paddingBottom: "15px" }}>
                      <p><strong>Post ID:</strong> {post.id}</p>
                      <p><strong>User ID:</strong> {post.userId}</p>
                      <p><strong>Venue:</strong> {post.venueName}</p>
                      <p><strong>Date/Time:</strong> {post.date} @ {post.timeRange}</p>
                      <p><strong>Text Content:</strong> "{post.text}"</p>
                      <p><strong>Current Status:</strong> <span style={{ color: "red", fontWeight: "bold" }}>{post.status}</span></p>
                      <button 
                        className="sysop-btn" 
                        style={{ marginTop: "10px" }}
                        onClick={() => handleSysopRestorePost(post.id)}
                      >
                        [ OVERRIDE / ACTIVATE POST ]
                      </button>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>
        ) : (
          /* SysOp Login Panel */
          <div className="sysop-section" style={{ maxWidth: "400px", margin: "40px auto" }}>
            <h2 style={{ marginBottom: "15px", borderBottom: "1px solid #00ff00", paddingBottom: "5px" }}>
              SYSOP BACKDOOR LOGIN
            </h2>
            {sysopLoginError && (
              <p style={{ color: "red", fontWeight: "bold", marginBottom: "15px" }}>
                AUTHENTICATION FAILED: {sysopLoginError}
              </p>
            )}
            <form onSubmit={handleSysopLogin} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                <label>OPERATOR EMAIL:</label>
                <input 
                  type="email" 
                  className="sysop-input" 
                  value={sysopEmail} 
                  onChange={(e) => setSysopEmail(e.target.value)} 
                  placeholder="e.g. sysop@asl.com"
                  required
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                <label>SECURE SECURITY KEY:</label>
                <input 
                  type="password" 
                  className="sysop-input" 
                  value={sysopPassword} 
                  onChange={(e) => setSysopPassword(e.target.value)} 
                  placeholder="••••••••"
                  required
                />
              </div>
              <button type="submit" className="sysop-btn" style={{ fontWeight: "bold" }}>
                [ ESTABLISH SECURE LINK ]
              </button>
            </form>
          </div>
        )}
      </div>
    );
  }


  const radarPosts = globalActivePosts.filter(p => userDoc?.favorited_bars?.includes(p.venueId));
  const myPosts = globalActivePosts.filter(p => p.userId === currentUser?.uid);
  const currentFeedPosts = feedTab === "radar" 
    ? radarPosts 
    : feedTab === "my_posts" 
      ? myPosts 
      : globalActivePosts;


  return (
    <div className="myspace-layout">
      {/* Global asl Header */}
      <header className="myspace-nav-header">
        <div className="myspace-nav-top" style={{ justifyContent: "center", gap: "15px" }}>
          <div className="myspace-logo" onClick={() => setNavigationScreen("home")}>
            <div className="myspace-logo-icons" style={{ fontSize: "20px", color: "#ff66cc" }}>⚡</div>
            <span>asl.com</span>
          </div>
          <div style={{ fontStyle: "italic", fontSize: "14px", color: "#ff66cc" }}>
            {activeTagline}
          </div>
        </div>
        <div className="myspace-nav-links-row">
          <span 
            className={`myspace-nav-link ${navigationScreen === "home" ? "active" : ""}`} 
            onClick={() => {
              setNavigationScreen("home");
              setSelectedProfileUser(null);
            }}
          >
            Home
          </span>
          <span 
            className={`myspace-nav-link ${["city", "bar", "feed", "post"].includes(navigationScreen) ? "active" : ""}`} 
            onClick={() => {
              setNavigationScreen("city");
              setSelectedProfileUser(null);
            }}
          >
            Post
          </span>
          {isLoggedIn ? (
            <>
              <span 
                className={`myspace-nav-link ${navigationScreen === "profile" && selectedProfileUser?.userId === currentUser?.uid ? "active" : ""}`} 
                onClick={handleOpenMyProfile}
              >
                Profile
              </span>
              <span 
                className={`myspace-nav-link ${["mail", "chat"].includes(navigationScreen) ? "active" : ""}`} 
                onClick={() => {
                  setNavigationScreen("mail");
                  setSelectedProfileUser(null);
                }}
                style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
              >
                Mail
                {inboundClaimsCount > 0 && (
                  <span style={{ backgroundColor: "#ff007f", color: "#ffffff", padding: "1px 5px", borderRadius: "10px", fontSize: "10px", fontWeight: "bold", lineHeight: "1" }}>
                    {inboundClaimsCount}
                  </span>
                )}
              </span>
              <span 
                className={`myspace-nav-link ${navigationScreen === "settings" ? "active" : ""}`}
                onClick={() => {
                  setNavigationScreen("settings");
                  setSelectedProfileUser(null);
                }}
              >
                Settings
              </span>
              <span className="myspace-nav-link" onClick={handleLogout}>Logout</span>
            </>
          ) : (
            <span 
              className={`myspace-nav-link ${navigationScreen === "login" ? "active" : ""}`} 
              onClick={() => {
                setNavigationScreen("login");
                setSelectedProfileUser(null);
              }}
            >
              Login
            </span>
          )}
        </div>
      </header>

      {/* Main Container */}
      <div className="myspace-container">
        
        {/* HOMEPAGE SCREEN */}
        {navigationScreen === "home" && (
          <div style={{ maxWidth: "450px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "16px", width: "100%" }}>
            {(!hideWelcome || !currentUser || currentUser.isAnonymous) && (
              <div 
                className="window" 
                style={{ 
                  borderRadius: 0, 
                  boxShadow: "none", 
                  border: "2px outset #ffffff", 
                  backgroundColor: "#c0c0c0", 
                  padding: "2px" 
                }}
              >
                <div 
                  className="title-bar" 
                  style={{ 
                    borderRadius: 0, 
                    backgroundColor: "#000080", 
                    padding: "3px 5px", 
                    display: "flex", 
                    justifyContent: "space-between", 
                    alignItems: "center", 
                    color: "#fff", 
                    fontWeight: "bold", 
                    fontSize: "12px", 
                    fontFamily: "MS Sans Serif, sans-serif" 
                  }}
                >
                  <span className="title-bar-text">Welcome.exe</span>
                  <div className="title-bar-controls">
                    {currentUser && !currentUser.isAnonymous && (
                      <button 
                        aria-label="Close" 
                        onClick={() => {
                          localStorage.setItem("asl_hide_welcome", "true");
                          setHideWelcome(true);
                        }}
                        style={{ borderRadius: 0, cursor: "pointer" }}
                      />
                    )}
                  </div>
                </div>
                <div className="window-body" style={{ margin: "10px", textAlign: "left" }}>
                  <div className="myspace-welcome-text" style={{ marginBottom: "15px", lineHeight: "1.4" }}>
                    asl is for missed connections:<br />
                    like that friend you made in the bathroom line, or that 10/10 you met sharing a lighter outside the venue. This isn't just another generic dating app, it's a digital bulletin board to reconnect with the people who crossed your path last night.
                  </div>
                  <button 
                    onClick={() => setNavigationScreen("city")}
                    style={{ 
                      width: "100%", 
                      minHeight: "52px", 
                      fontSize: "17px", 
                      fontWeight: "bold",
                      borderRadius: 0,
                      border: "2px outset",
                      boxShadow: "inset -1px -1px #0a0a0a, inset 1px 1px #dfdfdf, 1px 1px 0 0 #000",
                      backgroundColor: "#c0c0c0",
                      cursor: "pointer"
                    }}
                  >
                    🌵 Enter Regional Portal
                  </button>
                </div>
              </div>
            )}

            {isLoggedIn ? (
              /* LOGGED-IN HOME EXPERIENCE */
              <>
                {/* 1. MySpace-style User Dashboard Widget */}
                <div className="window" style={{ width: "100%", boxSizing: "border-box", borderRadius: 0 }}>
                  <div className="window-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderRadius: 0 }}>
                    <span>👤 My Dashboard</span>
                    <span>asl // v2.0</span>
                  </div>
                  <div className="window-body" style={{ display: "flex", gap: "12px", padding: "10px", alignItems: "center", backgroundColor: "#ffffff", margin: 0, borderRadius: 0 }}>
                    <div 
                      onClick={handleOpenMyProfile}
                      style={{ 
                        fontSize: "24px", 
                        cursor: "pointer", 
                        padding: "6px", 
                        border: "2px inset", 
                        backgroundImage: "radial-gradient(#ff007f 15%, transparent 15%), radial-gradient(#ff007f 15%, transparent 15%)",
                        backgroundSize: "6px 6px",
                        backgroundPosition: "0 0, 3px 3px",
                        backgroundColor: "#fff0f5",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        borderRadius: 0,
                        width: "90px",
                        height: "50px",
                        flexShrink: 0,
                        whiteSpace: "nowrap"
                      }}
                      title="View my profile"
                    >
                      {userDoc?.emoji_avatar || "👥"}
                    </div>
                    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "4px" }}>
                      <h2 style={{ margin: 0, fontSize: "15px", color: "#003399", fontWeight: "bold", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "left" }}>
                        Yo, {userDoc?.username || currentUser.email?.split("@")[0] || "User"}!
                      </h2>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ fontSize: "11px", color: "#000", fontWeight: "bold" }}>Mood:</span>
                        <select
                          className="retro-select"
                          value={userDoc?.mood || "Chillin' 😎"}
                          onChange={(e) => handleSaveProfile({ mood: e.target.value })}
                          style={{
                            width: "150px"
                          }}
                        >
                          <option>Chillin' 😎</option>
                          <option>Excited ⚡</option>
                          <option>Crushing 😍</option>
                          <option>Mellow 🎧</option>
                          <option>Melancholy 🌧️</option>
                          <option>Emo 🖤</option>
                          <option>Gay 🌈</option>
                          <option>Ready to Party 🍹</option>
                          <option>Hyper 🤪</option>
                          <option>Sassy 💅</option>
                          <option>Pissed 😡</option>
                          <option>Bored 😑</option>
                          <option>Creative 🎨</option>
                          <option>Spacey 🚀</option>
                          <option>Tired 😴</option>
                          <option>Reflective 📖</option>
                          <option>Rebellious ✊</option>
                          <option>Nostalgic 📼</option>
                        </select>
                      </div>
                      <p style={{ margin: "2px 0 6px 0", fontSize: "11px", color: "#666", fontStyle: "italic", textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", width: "100%" }}>
                        "{userDoc?.headline || "everyone's favorite dial-up partner"}"
                      </p>
                      <div style={{ display: "flex", gap: "6px", width: "100%", marginTop: "4px" }}>
                        <button 
                          onClick={handleOpenMyProfile} 
                          style={{ flex: 1, padding: "2px 6px", fontSize: "11px", minHeight: "24px", cursor: "pointer", borderRadius: 0 }}
                        >
                          ✏️ Profile
                        </button>
                        <button 
                          onClick={() => setNavigationScreen("city")} 
                          style={{ flex: 1, padding: "2px 6px", fontSize: "11px", minHeight: "24px", cursor: "pointer", borderRadius: 0 }}
                        >
                          🌵 Find Bars
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Rich Aggregated Feed with Tabs */}
                <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                  {/* Tab Headers */}
                  <div style={{ display: "flex", gap: "4px", marginBottom: "0", position: "relative", zIndex: 1 }}>
                    <button 
                      onClick={() => setFeedTab("radar")}
                      style={{
                        flex: 1,
                        borderRadius: "4px 4px 0 0",
                        backgroundColor: feedTab === "radar" ? "#ffffff" : "#e5e5e5",
                        color: feedTab === "radar" ? "#003399" : "#666",
                        border: "1px solid #003399",
                        borderBottom: feedTab === "radar" ? "1px solid #ffffff" : "1px solid #003399",
                        fontWeight: "bold",
                        fontSize: "10px",
                        minHeight: "38px",
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "2px",
                        lineHeight: "1.1"
                      }}
                    >
                      <span>📡 Radar</span>
                      <span style={{ fontSize: "9px", fontWeight: "normal", opacity: 0.8 }}>({radarPosts.length})</span>
                    </button>
                    <button 
                      onClick={() => setFeedTab("global")}
                      style={{
                        flex: 1,
                        borderRadius: "4px 4px 0 0",
                        backgroundColor: feedTab === "global" ? "#ffffff" : "#e5e5e5",
                        color: feedTab === "global" ? "#003399" : "#666",
                        border: "1px solid #003399",
                        borderBottom: feedTab === "global" ? "1px solid #ffffff" : "1px solid #003399",
                        fontWeight: "bold",
                        fontSize: "10px",
                        minHeight: "38px",
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "2px",
                        lineHeight: "1.1"
                      }}
                    >
                      <span>🌍 Global</span>
                      <span style={{ fontSize: "9px", fontWeight: "normal", opacity: 0.8 }}>({globalActivePosts.length})</span>
                    </button>
                    <button 
                      onClick={() => setFeedTab("my_posts")}
                      style={{
                        flex: 1,
                        borderRadius: "4px 4px 0 0",
                        backgroundColor: feedTab === "my_posts" ? "#ffffff" : "#e5e5e5",
                        color: feedTab === "my_posts" ? "#003399" : "#666",
                        border: "1px solid #003399",
                        borderBottom: feedTab === "my_posts" ? "1px solid #ffffff" : "1px solid #003399",
                        fontWeight: "bold",
                        fontSize: "10px",
                        minHeight: "38px",
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "2px",
                        lineHeight: "1.1"
                      }}
                    >
                      <span>📝 My Posts</span>
                      <span style={{ fontSize: "9px", fontWeight: "normal", opacity: 0.8 }}>({myPosts.length})</span>
                    </button>
                  </div>

                  {/* Tab Body */}
                  {feedTab === "radar" && radarPosts.length === 0 ? (
                    /* Radar Suggestions if empty */
                    <div style={{ border: "1px solid #003399", borderTop: "none", backgroundColor: "#fff", padding: "12px", borderRadius: "0 0 4px 4px" }}>
                      <div style={{ textAlign: "center", marginBottom: "12px", padding: "8px", backgroundColor: "#f9fbfd", border: "1px dashed #6699cc" }}>
                        <div style={{ fontSize: "24px", marginBottom: "4px" }}>📡</div>
                        <h3 style={{ margin: "0 0 4px 0", fontSize: "13px", color: "#003399" }}>Radar is Empty</h3>
                        <p style={{ margin: 0, fontSize: "11px", color: "#666", lineHeight: "1.4" }}>
                          Favorite some local bars to populate your customized radar!
                        </p>
                      </div>
                      
                      <div style={{ fontSize: "11px", fontWeight: "bold", marginBottom: "6px", color: "#333" }}>
                        🔥 Quick-Favorite Popular Venues:
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "6px" }}>
                        {venues.slice(0, 4).map(venue => {
                          const isFav = userDoc?.favorited_bars?.includes(venue.fsq_id);
                          return (
                            <div 
                              key={venue.fsq_id} 
                              style={{ 
                                border: "1px solid #ccc", 
                                padding: "6px", 
                                borderRadius: "4px", 
                                backgroundColor: "#fcfcfc",
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "space-between",
                                gap: "4px"
                              }}
                            >
                              <div>
                                <div style={{ fontWeight: "bold", fontSize: "10px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  🍹 {venue.name}
                                </div>
                                <div style={{ fontSize: "8px", color: "#888" }}>{venue.zone}</div>
                              </div>
                              <button 
                                onClick={() => handleToggleFavorite(venue)}
                                style={{
                                  width: "100%",
                                  minHeight: "22px",
                                  fontSize: "9px",
                                  padding: "2px",
                                  cursor: "pointer",
                                  backgroundColor: isFav ? "#ffccd8" : "#f0f0f0",
                                  color: isFav ? "#b30059" : "#333",
                                  fontWeight: isFav ? "bold" : "normal"
                                }}
                              >
                                {isFav ? "⭐ Added" : "⭐ Favorite"}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    /* Display Posts List */
                    <div style={{ border: "1px solid #003399", borderTop: "none", backgroundColor: "#fff", display: "flex", flexDirection: "column", borderRadius: "0 0 4px 4px" }}>
                      {currentFeedPosts.length === 0 ? (
                        <div style={{ padding: "30px 20px", textAlign: "center", fontSize: "13px", color: "#666", fontStyle: "italic", lineHeight: "1.5" }}>
                          <div style={{ fontSize: "28px", marginBottom: "8px" }}>📭</div>
                          {feedTab === "my_posts" 
                            ? "You haven't posted any missed connections yet." 
                            : "No active missed connection reports in this feed."}
                        </div>
                      ) : (
                        currentFeedPosts.map((post, idx, currentArr) => {
                          const timeAgo = (() => {
                            const diff = Date.now() - (post.timestamp || post.encounterTimestamp || 0);
                            const mins = Math.floor(diff / 60000);
                            const hrs = Math.floor(diff / 3600000);
                            const days = Math.floor(diff / 86400000);
                            if (mins < 2) return "just now";
                            if (mins < 60) return `${mins}m ago`;
                            if (hrs < 24) return `${hrs}h ago`;
                            return `${days}d ago`;
                          })();
                          
                          return (
                            <div 
                              key={post.id}
                              style={{
                                borderBottom: idx < currentArr.length - 1 ? "1px solid #e0e8f5" : "none",
                                padding: "12px",
                                cursor: "pointer"
                              }}
                              onClick={() => {
                                const venue = venues.find(v => v.fsq_id === post.venueId);
                                if (venue) handleSelectVenue(venue);
                              }}
                            >
                              {/* Header: User avatar + name + mood */}
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                  <span style={{ fontSize: "16px" }}>{post.emoji_avatar || "👥"}</span>
                                  <span style={{ fontWeight: "bold", fontSize: "12px", color: "#003399", textDecoration: "underline" }}>
                                    {post.username || "Anonymous"}
                                  </span>
                                  <span style={{ fontSize: "10px", color: "#b30059", backgroundColor: "#ffccd8", padding: "1px 5px", borderRadius: "8px", fontWeight: "bold" }}>
                                    {post.mood || "Chillin'"}
                                  </span>
                                </div>
                                <span style={{ fontSize: "10px", color: "#999" }}>{timeAgo}</span>
                              </div>

                              {/* Speech Bubble / Message Content */}
                              <div style={{ 
                                backgroundColor: "#f7f9fc", 
                                border: "1px solid #dcdcdc", 
                                borderRadius: "6px", 
                                padding: "8px 10px", 
                                fontSize: "12px", 
                                color: "#333", 
                                lineHeight: "1.4",
                                marginBottom: "6px"
                              }}>
                                {parseBBCode(post.text)}
                              </div>

                              {/* Footer details: Venue name & timestamp */}
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "10px", color: "#888" }}>
                                <span style={{ color: "#003399", fontWeight: "bold" }}>
                                  📍 {post.venueName} ({post.venueZone})
                                </span>
                                <span>
                                  🕐 {post.date} · {post.timeRange}
                                </span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>

                {/* 3. Cool New People (also available when logged in!) */}
                <div className="myspace-orange-box" style={{ marginTop: "8px" }}>
                  <div className="section-header-orange" style={{ margin: 0, backgroundColor: "#003399", color: "#fff", borderLeft: "4px solid #ff007f" }}>Cool New People</div>
                  <div style={{ display: "flex", justifyContent: "space-around", padding: "15px", gap: "10px" }}>
                    {coolNewPeople.length === 0 ? (
                      <div 
                        style={{ textAlign: "center", fontSize: "14px", cursor: "pointer", width: "100%" }}
                        onClick={() => handleOpenProfile("tom", {
                          username: "Tom",
                          mood: "Friendly 🙂",
                          bio: "Co-founder of asl. Let me know if you have any questions!",
                          profileTheme: "classic",
                          emoji_avatar: "👥🥃💖"
                        })}
                      >
                        <div style={{ fontSize: "24px", marginBottom: "8px" }}>👥🥃💖</div>
                        <div style={{ fontWeight: "bold", textDecoration: "underline", color: "#003399" }}>Tom</div>
                        <div style={{ color: "#666", fontStyle: "italic" }}>"Your first friend."</div>
                      </div>
                    ) : (
                      coolNewPeople.map(person => (
                        <div 
                          key={person.uid}
                          style={{ textAlign: "center", fontSize: "13px", cursor: "pointer", flex: 1, maxWidth: "120px" }}
                          onClick={() => handleOpenProfile(person.uid, person)}
                        >
                          <div style={{ fontSize: "24px", marginBottom: "5px", display: "flex", justifyContent: "center" }}>
                            {person.emoji_avatar || "👥"}
                          </div>
                          <div style={{ fontWeight: "bold", textDecoration: "underline", color: "#003399", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {person.username}
                          </div>
                          <div style={{ color: "#666", fontSize: "11px", fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            "{person.mood || "Chillin'"}"
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* 4. asl Status Dashboard (telemetry dashboard) */}
                <div className="myspace-orange-box" style={{ backgroundColor: "#f2f6ff", border: "1px solid #6699ff", borderRadius: "4px", padding: 0 }}>
                  <div className="section-header-orange" style={{ margin: 0, backgroundColor: "#6699ff", color: "#fff", borderLeft: "4px solid #003399" }}>
                    asl Status Dashboard
                  </div>
                  <div style={{ padding: "12px 15px", fontSize: "13px", lineHeight: "1.5" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                      <span>📬 Total Encounters:</span>
                      <strong>{allPostsCount} encounters</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                      <span>📡 Active Users Online:</span>
                      <strong>{activeBuddiesCount} online</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                      <span>🛡️ Safety Shield Guard:</span>
                      <span style={{ color: "green", fontWeight: "bold" }}>● ACTIVE</span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              /* GUEST: Cool New People + asl Status */
              <>
                <div className="myspace-orange-box">
                  <div className="section-header-orange" style={{ margin: 0 }}>Cool New People</div>
                  <div style={{ display: "flex", justifyContent: "space-around", padding: "15px", gap: "10px" }}>
                    {coolNewPeople.length === 0 ? (
                      <div 
                        style={{ textAlign: "center", fontSize: "14px", cursor: "pointer", width: "100%" }}
                        onClick={() => handleOpenProfile("tom", {
                          username: "Tom",
                          mood: "Friendly 🙂",
                          bio: "Co-founder of asl. Let me know if you have any questions!",
                          profileTheme: "classic",
                          emoji_avatar: "👥🥃💖"
                        })}
                      >
                        <div style={{ fontSize: "24px", marginBottom: "8px" }}>👥🥃💖</div>
                        <div style={{ fontWeight: "bold", textDecoration: "underline", color: "#003399" }}>Tom</div>
                        <div style={{ color: "#666", fontStyle: "italic" }}>"Your first friend."</div>
                      </div>
                    ) : (
                      coolNewPeople.map(person => (
                        <div 
                          key={person.uid}
                          style={{ textAlign: "center", fontSize: "13px", cursor: "pointer", flex: 1, maxWidth: "120px" }}
                          onClick={() => handleOpenProfile(person.uid, person)}
                        >
                          <div style={{ fontSize: "24px", marginBottom: "5px", display: "flex", justifyContent: "center" }}>
                            {person.emoji_avatar || "👥"}
                          </div>
                          <div style={{ fontWeight: "bold", textDecoration: "underline", color: "#003399", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {person.username}
                          </div>
                          <div style={{ color: "#666", fontSize: "11px", fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            "{person.mood || "Chillin'"}"
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* GUEST: Global Feed */}
                <div className="myspace-orange-box" style={{ display: "flex", flexDirection: "column", padding: 0, borderRadius: "4px" }}>
                  <div className="section-header-orange" style={{ margin: 0, backgroundColor: "#003399", color: "#fff", borderLeft: "4px solid #ff007f", fontWeight: "bold" }}>
                    🌍 Global Feed ({globalActivePosts.length})
                  </div>
                  <div style={{ backgroundColor: "#fff", display: "flex", flexDirection: "column", borderRadius: "0 0 4px 4px" }}>
                    {globalActivePosts.length === 0 ? (
                      <div style={{ padding: "30px 20px", textAlign: "center", fontSize: "13px", color: "#666", fontStyle: "italic", lineHeight: "1.5" }}>
                        <div style={{ fontSize: "28px", marginBottom: "8px" }}>📭</div>
                        No active missed connection reports in this feed.
                      </div>
                    ) : (
                      globalActivePosts.map((post, idx, currentArr) => {
                        const timeAgo = (() => {
                          const diff = Date.now() - (post.timestamp || post.encounterTimestamp || 0);
                          const mins = Math.floor(diff / 60000);
                          const hrs = Math.floor(diff / 3600000);
                          const days = Math.floor(diff / 86400000);
                          if (mins < 2) return "just now";
                          if (mins < 60) return `${mins}m ago`;
                          if (hrs < 24) return `${hrs}h ago`;
                          return `${days}d ago`;
                        })();
                        
                        return (
                          <div 
                            key={post.id}
                            style={{
                              borderBottom: idx < currentArr.length - 1 ? "1px solid #e0e8f5" : "none",
                              padding: "12px",
                              cursor: "pointer"
                            }}
                            onClick={() => {
                              const venue = venues.find(v => v.fsq_id === post.venueId);
                              if (venue) handleSelectVenue(venue);
                            }}
                          >
                            {/* Header: User avatar + name + mood */}
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <span style={{ fontSize: "16px" }}>{post.emoji_avatar || "👥"}</span>
                                <span 
                                  style={{ fontWeight: "bold", fontSize: "12px", color: "#003399", textDecoration: "underline" }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenProfile(post.userId, {
                                      username: post.username || "Anonymous Connection",
                                      mood: post.mood || "Chillin' 😎",
                                      bio: post.bio || "Just browsing the local spots.",
                                      profileTheme: post.profileTheme || "classic",
                                      emoji_avatar: post.emoji_avatar || "👥🥃💖"
                                    });
                                  }}
                                >
                                  {post.username || "Anonymous"}
                                </span>
                                <span style={{ fontSize: "10px", color: "#b30059", backgroundColor: "#ffccd8", padding: "1px 5px", borderRadius: "8px", fontWeight: "bold" }}>
                                  {post.mood || "Chillin'"}
                                </span>
                              </div>
                              <span style={{ fontSize: "10px", color: "#999" }}>{timeAgo}</span>
                            </div>

                            {/* Speech Bubble / Message Content */}
                            <div style={{ 
                              backgroundColor: "#f7f9fc", 
                              border: "1px solid #dcdcdc", 
                              borderRadius: "6px", 
                              padding: "8px 10px", 
                              fontSize: "12px", 
                              color: "#333", 
                              lineHeight: "1.4",
                              marginBottom: "6px"
                            }}>
                              {parseBBCode(post.text)}
                            </div>

                            {/* Footer details: Venue name & timestamp */}
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "10px", color: "#888" }}>
                              <span style={{ color: "#003399", fontWeight: "bold" }}>
                                📍 {post.venueName} ({post.venueZone})
                              </span>
                              <span>
                                🕐 {post.date} · {post.timeRange}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* asl Status Dashboard */}
                <div className="myspace-orange-box" style={{ backgroundColor: "#f2f6ff", border: "1px solid #6699ff", borderRadius: "4px", padding: 0 }}>
                  <div className="section-header-orange" style={{ margin: 0, backgroundColor: "#6699ff", color: "#fff", borderLeft: "4px solid #003399" }}>
                    asl Status
                  </div>
                  <div style={{ padding: "15px", fontSize: "14px", lineHeight: "1.5" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                      <span>📬 Missed Connections:</span>
                      <strong>{allPostsCount} encounters</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                      <span>📡 Active Buddies Online:</span>
                      <strong>{activeBuddiesCount} users</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                      <span>🔒 Safe-Area Guard:</span>
                      <span style={{ color: "green", fontWeight: "bold" }}>● Enabled</span>
                    </div>
                    <hr style={{ border: "none", borderTop: "1px solid #ccc", margin: "12px 0" }} />
                    <div style={{ fontSize: "12px", color: "#666", textAlign: "center", fontStyle: "italic" }}>
                      "Connecting souls across the Phoenix area via secure, image-free dial-up portals."
                    </div>
                  </div>
                </div>
              </>
            )}

          </div>
        )}

        {/* CITY SELECTION SCREEN */}
        {navigationScreen === "city" && (
          <div style={{ maxWidth: "500px", margin: "0 auto", width: "100%" }}>
            <div className="myspace-orange-box" style={{ backgroundColor: "#f5f5f5", border: "1px solid #ff99cc", borderRadius: "4px", padding: 0 }}>
              <div className="section-header-orange" style={{ margin: 0, backgroundColor: "#003399", color: "#fff", borderLeft: "4px solid #ff007f", fontWeight: "bold" }}>
                Select Regional Database Portal
              </div>
              <div style={{ padding: "20px" }}>
                <p style={{ margin: "0 0 20px 0", fontSize: "13px", color: "#555", lineHeight: "1.4" }}>
                  Choose your metropolitan neighborhood database hub to scan local venue walls for missed connection reports.
                </p>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                  {/* Phoenix Area Option */}
                  <div 
                    className="city-portal-card"
                    onClick={() => {
                      setSelectedCity("Phoenix");
                      setNavigationScreen("bar");
                      if (currentUser) {
                        const updates = { selectedCity: "Phoenix" };
                        if (!userDoc?.homeCity) {
                          updates.homeCity = "Phoenix";
                        }
                        dbSetDoc("users", currentUser.uid, updates, true);
                      }
                    }}
                  >
                    <div className="city-portal-icon">🌵</div>
                    <div style={{ flex: 1 }}>
                      <div className="city-portal-title">Phoenix Area Node</div>
                      <div className="city-portal-desc">Desert Valley Hub — Active venue boards & chats</div>
                      <div className="city-portal-status">📡 Network Status: ONLINE (100%)</div>
                    </div>
                    <div className="city-portal-arrow">➡️</div>
                  </div>

                  {/* New York Area Option */}
                  <div 
                    className="city-portal-card"
                    onClick={() => {
                      setSelectedCity("New York");
                      setNavigationScreen("bar");
                      if (currentUser) {
                        const updates = { selectedCity: "New York" };
                        if (!userDoc?.homeCity) {
                          updates.homeCity = "New York";
                        }
                        dbSetDoc("users", currentUser.uid, updates, true);
                      }
                    }}
                  >
                    <div className="city-portal-icon">🗽</div>
                    <div style={{ flex: 1 }}>
                      <div className="city-portal-title">New York Area Node</div>
                      <div className="city-portal-desc">East Coast Hub — Metropolitan area venues</div>
                      <div className="city-portal-status" style={{ color: "#d0a000" }}>📡 Network Status: ONLINE (BETA)</div>
                    </div>
                    <div className="city-portal-arrow">➡️</div>
                  </div>
                  
                  {/* Cupertino Area Option (App Store Reviewer Mode) */}
                  {(localStorage.getItem("asl_reviewer_mode") === "true" || localStorage.getItem("asl_dev_override") === "true") && (
                    <div 
                      className="city-portal-card"
                      style={{ border: "2px solid #003399", backgroundColor: "#e6f2ff" }}
                      onClick={() => {
                        setSelectedCity("Cupertino");
                        setNavigationScreen("bar");
                        if (currentUser) {
                          const updates = { selectedCity: "Cupertino" };
                          if (!userDoc?.homeCity) {
                            updates.homeCity = "Cupertino";
                          }
                          dbSetDoc("users", currentUser.uid, updates, true);
                        }
                      }}
                    >
                      <div className="city-portal-icon">🍎</div>
                      <div style={{ flex: 1 }}>
                        <div className="city-portal-title" style={{ color: "#003399", fontWeight: "bold" }}>Cupertino Area Node</div>
                        <div className="city-portal-desc">Silicon Valley Hub — Bypassed geofence & debug mode</div>
                        <div className="city-portal-status" style={{ color: "#006600" }}>📡 Network Status: ACTIVE (REVIEWER OVERRIDE)</div>
                      </div>
                      <div className="city-portal-arrow">➡️</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* BAR SELECTION SCREEN */}
        {navigationScreen === "bar" && (
          <div style={{ maxWidth: "500px", margin: "0 auto", width: "100%" }}>
            <div className="myspace-orange-box" style={{ backgroundColor: "#f5f5f5", border: "1px solid #ff99cc", borderRadius: "4px", padding: 0 }}>
              <div className="section-header-orange" style={{ margin: 0, backgroundColor: "#003399", color: "#fff", borderLeft: "4px solid #ff007f", fontWeight: "bold", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>📍 {selectedCity} Metropage Directory</span>
                <button 
                  onClick={() => setNavigationScreen("city")}
                  className="auth-btn-primary"
                  style={{ fontSize: "10px", padding: "4px 8px", minHeight: "24px", minWidth: "80px", cursor: "pointer", marginLeft: "10px" }}
                >
                  Change City
                </button>
              </div>
              <div style={{ padding: "12px" }}>
                {/* Nationwide search bar */}
                <form onSubmit={handleBarSearch} style={{ display: "flex", gap: "6px", marginBottom: "12px" }}>
                  <input 
                    type="text" 
                    placeholder="Search bars nationwide (e.g. Cobra, PDT)..." 
                    value={barSearchQuery}
                    onChange={(e) => {
                      setBarSearchQuery(e.target.value);
                      if (!e.target.value.trim()) {
                        setBarSearchResults(null);
                      }
                    }}
                    style={{ flex: 1, minHeight: "36px", padding: "0 8px", border: "1px solid #ff99cc", borderRadius: "2px" }}
                  />
                  <button type="submit" disabled={isBarSearching} style={{ minHeight: "36px", cursor: "pointer", padding: "0 12px", border: "1px solid #ff99cc", backgroundColor: "#ffe6f2", color: "#b30059", fontWeight: "bold" }}>
                    {isBarSearching ? "..." : "Search"}
                  </button>
                  {barSearchResults !== null && (
                    <button 
                      type="button" 
                      onClick={() => {
                        setBarSearchQuery("");
                        setBarSearchResults(null);
                      }} 
                      style={{ minHeight: "36px", cursor: "pointer", padding: "0 12px", border: "1px solid #ccc", backgroundColor: "#f0f0f0" }}
                    >
                      Clear
                    </button>
                  )}
                </form>

                {(() => {
                  const showSearchResults = barSearchResults !== null;
                  const displayList = showSearchResults ? barSearchResults : venues.filter(v => 
                    (v.city || "").toLowerCase() === selectedCity.toLowerCase()
                  );

                  if (displayList.length === 0) {
                    return (
                      <div style={{ padding: "40px 10px", textAlign: "center", color: "#808080", fontStyle: "italic", fontSize: "13px" }}>
                        {showSearchResults ? "No venues found matching search." : "No matching venues found."}
                      </div>
                    );
                  }

                  const groups = {};
                  displayList.forEach(v => {
                    const groupKey = showSearchResults ? v.city : (v.zone || "Downtown");
                    if (!groups[groupKey]) groups[groupKey] = [];
                    groups[groupKey].push(v);
                  });

                  return Object.keys(groups).map(groupName => (
                    <div key={groupName} style={{ marginBottom: "15px" }}>
                      <div style={{ fontWeight: "bold", backgroundColor: "#ffccd8", padding: "6px 10px", fontSize: "13px", borderBottom: "1px solid #ff99bb", color: "#99004d", display: "flex", alignItems: "center", gap: "6px", borderRadius: "2px" }}>
                        <span>{showSearchResults ? "🌐" : "📁"}</span>
                        <span>{groupName} ({groups[groupName].length})</span>
                      </div>
                      <ul style={{ listStyle: "none", padding: 0, margin: "6px 0 0 0", display: "flex", flexDirection: "column", gap: "6px" }}>
                        {groups[groupName].map(venue => (
                          <li 
                            key={venue.fsq_id}
                            onClick={() => handleSelectVenue(venue)}
                            className="city-portal-card"
                            style={{
                              padding: "10px 12px",
                              cursor: "pointer",
                              display: "flex",
                              flexDirection: "row",
                              alignItems: "center",
                              gap: "12px",
                              backgroundColor: "#ffffff",
                              border: "1px solid #ffe6f2"
                            }}
                          >
                            <div className="city-portal-icon" style={{ fontSize: "18px", width: "32px", height: "32px" }}>📍</div>
                            <div style={{ flex: 1 }}>
                              <div className="city-portal-title" style={{ fontSize: "14px" }}>
                                {venue.name}
                              </div>
                              <div className="city-portal-desc" style={{ fontSize: "11px", margin: 0 }}>
                                {venue.formatted_address} {showSearchResults && `(${venue.zone})`}
                              </div>
                            </div>
                            <div className="city-portal-arrow">➡️</div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>
        )}


        {/* FEED / VENUE PROFILE PAGE */}
        {navigationScreen === "feed" && selectedVenue && (
          <div className="myspace-columns">
            {/* Left Profile Column */}
            <div className="myspace-left-col">
              <h2 style={{ margin: "0 0 6px 0", color: "#000", fontSize: "36px", fontWeight: "bold", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", lineHeight: "1.1" }}>
                <span>{selectedVenue.name}</span>
                <span style={{ fontSize: "32px" }}>🍹</span>
              </h2>

              <div className="profile-details-table" style={{ fontSize: "11px", lineHeight: "1.4" }}>
                <p><strong>Region:</strong> {selectedVenue.city || selectedCity}</p>
                <p><strong>Category:</strong> {selectedVenue.categories && selectedVenue.categories.length > 0 ? selectedVenue.categories.join(", ") : "Local Spot / Venue"}</p>
                <p><strong>Address:</strong> {selectedVenue.formatted_address}</p>
                {selectedVenue.rating && <p><strong>Rating:</strong> ⭐ {selectedVenue.rating}/10</p>}
                {selectedVenue.price && <p><strong>Price:</strong> {"$".repeat(selectedVenue.price)}</p>}
                {selectedVenue.hours_display && <p><strong>Hours:</strong> {selectedVenue.hours_display}</p>}
                {selectedVenue.open_now !== null && selectedVenue.open_now !== undefined && (
                  <p>
                    <strong>Status:</strong>{" "}
                    <span style={{ color: selectedVenue.open_now ? "green" : "red", fontWeight: "bold" }}>
                      {selectedVenue.open_now ? "🟢 OPEN NOW" : "🔴 CLOSED"}
                    </span>
                  </p>
                )}
                {selectedVenue.amenities && selectedVenue.amenities.length > 0 && (
                  <div style={{ marginTop: "6px" }}>
                    <strong>Highlights:</strong>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "4px" }}>
                      {selectedVenue.amenities.map(a => (
                        <span key={a} style={{ backgroundColor: "#e1e1e1", border: "1px solid #c0c0c0", padding: "1px 5px", borderRadius: "3px", fontSize: "9px", color: "#333", fontWeight: "bold" }}>
                          {a}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Contact Links Box */}
              <div className="contact-box">
                <div className="contact-box-header">Contacting {selectedVenue.name}</div>
                <div style={{ display: "flex", gap: "6px", padding: "6px" }}>
                  <div 
                    className="contact-action" 
                    style={{ flex: 1, minHeight: "36px", display: "flex", alignItems: "center", justifyContent: "center" }}
                    onClick={() => {
                      const userHomeCity = userDoc?.homeCity || userDoc?.selectedCity || selectedCity || "Phoenix";
                      const venueCity = selectedVenue.city || "Phoenix";
                      const isReviewerMode = localStorage.getItem("asl_reviewer_mode") === "true" || localStorage.getItem("asl_dev_override") === "true";
                      if (!isReviewerMode && venueCity.toLowerCase() !== userHomeCity.toLowerCase()) {
                        const funnyMessages = [
                          `Wrong city, bro. Stick to your own turf in ${userHomeCity}!`,
                          `Nice try, traveler. The server admin caught you trying to post in ${venueCity} from your home node in ${userHomeCity}.`,
                          `Error: Metropolitan mismatch. You are registered in ${userHomeCity}. No cross-posting allowed!`,
                          `You sure you're there, fam? The database daemon says you're posting in ${venueCity} but your account is based in ${userHomeCity}.`,
                          `Bzzzt! Portal mismatch. You cannot post to ${venueCity} while logged into the ${userHomeCity} node.`,
                          `Geographic lock engaged. Go back to your own ${userHomeCity} node, bestie.`
                        ];
                        const randomMsg = funnyMessages[Math.floor(Math.random() * funnyMessages.length)];
                        setModerationError(randomMsg);
                        return;
                      }
                      runWithAuthenticationCheck(() => setNavigationScreen("post"));
                    }}
                  >
                    📝 Post
                  </div>
                  <div 
                    className="contact-action" 
                    style={{ flex: 1, minHeight: "36px", display: "flex", alignItems: "center", justifyContent: "center" }}
                    onClick={() => runWithAuthenticationCheck(() => handleToggleFavorite(selectedVenue))}
                  >
                    ⭐ {userDoc?.favorited_bars?.includes(selectedVenue.fsq_id) ? "Favorited" : "Add to Favorites"}
                  </div>
                </div>
              </div>

              {/* Dynamic list of people who favorited the bar */}
              <div className="top8-container" style={{ marginTop: "10px" }}>
                <div className="section-header-orange" style={{ margin: 0 }}>
                  People Who Favorite {selectedVenue.name}
                </div>
                <div style={{ fontSize: "12px", margin: "4px 0", fontWeight: "bold" }}>
                  {selectedVenue.name} has {favoriters.length} fan{favoriters.length !== 1 ? "s" : ""}.
                </div>
                {favoriters.length === 0 ? (
                  <div style={{ padding: "12px", fontSize: "11px", fontStyle: "italic", color: "#666", backgroundColor: "#fff", border: "1px solid #ddd", borderRadius: "2px" }}>
                    No one has favorited this bar yet. Be the first!
                  </div>
                ) : (
                  <div className="top8-grid">
                    {favoriters.map(person => (
                      <div 
                        key={person.uid} 
                        className="top8-friend" 
                        onClick={() => handleOpenProfile(person.uid, person)}
                      >
                        <div className="friend-avatar-wrapper" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span className="friend-avatar" style={{ fontSize: "16px" }}>{person.emoji_avatar || "👥🥃💖"}</span>
                        </div>
                        <span className="friend-name">{person.username || "Anon"}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Profile Column */}
            <div className="myspace-right-col">
              <div className="section-header-orange" style={{ margin: 0 }}>
                {selectedVenue.name}'s Missed Connections Wall
              </div>

              <div className="myspace-comments-list">
                {venuePosts.length === 0 ? (
                  <div style={{ padding: "40px 10px", textAlign: "center", color: "#808080", fontStyle: "italic", fontSize: "13px" }}>
                    No missed connections reported yet. Be the first to leave a comment!
                  </div>
                ) : (
                  venuePosts.map(post => (
                    <div key={post.id} className="myspace-comment-card">
                      <div className="myspace-comment-left">
                        <div 
                          className="myspace-comment-author-avatar"
                          onClick={() => handleOpenProfile(post.userId, {
                            username: post.username || "Anonymous Connection",
                            mood: post.mood || "Chillin' 😎",
                            bio: post.bio || "Just browsing the local spots.",
                            profileTheme: post.profileTheme || "classic",
                            emoji_avatar: post.emoji_avatar || "👥🥃💖"
                          })}
                          style={{ display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px" }}
                        >
                          {post.emoji_avatar || "👥🥃💖"}
                        </div>
                        <span 
                          className="myspace-comment-author-name"
                          onClick={() => handleOpenProfile(post.userId, {
                            username: post.username || "Anonymous Connection",
                            mood: post.mood || "Chillin' 😎",
                            bio: post.bio || "Just browsing the local spots.",
                            profileTheme: post.profileTheme || "classic",
                            emoji_avatar: post.emoji_avatar || "👥🥃💖"
                          })}
                        >
                          {post.username || "Anonymous"}
                        </span>
                        <div style={{ fontSize: "10px", color: "#666", marginTop: "4px" }}>
                          Mood: <strong>{post.mood ? post.mood.split(" ").slice(-1)[0] : "😎"}</strong>
                        </div>
                      </div>

                      <div className="myspace-comment-right">
                        <div>
                          {post.status === "connected" && (
                            <div style={{ backgroundColor: "#e2fbe2", border: "2px outset #4CAF50", padding: "8px", marginBottom: "12px", textAlign: "center", fontWeight: "bold", color: "#006400", fontSize: "14px", textShadow: "1px 1px 0px #fff" }}>
                              ✨ CONNECTION MADE: {post.username || "Anonymous"} found {post.connectedWithUsername || "someone"} ✨
                            </div>
                          )}
                          <div className="myspace-comment-date">
                            📅 Encountered: <strong>{post.date}</strong> ({post.timeRange})
                          </div>
                          <p 
                            className="myspace-comment-text"
                            dangerouslySetInnerHTML={{ __html: `"${parseBBCode(post.text)}"` }}
                          />
                          {post.status === "connected" && post.connectedProofText && (
                            <div style={{ marginTop: "12px", padding: "8px", backgroundColor: "#f0f0f0", borderLeft: "4px solid #000080", fontStyle: "italic", fontSize: "12px", color: "#333" }}>
                              <strong>{post.connectedWithUsername || "Response"}:</strong> "{post.connectedProofText}"
                            </div>
                          )}
                        </div>

                        <div className="myspace-comment-actions" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                          <button 
                            onClick={() => runWithAuthenticationCheck(() => handleThumbsUp(post))}
                            style={{ 
                              cursor: "pointer", 
                              minHeight: "24px",
                              padding: "2px 6px",
                              backgroundColor: isPostLiked(post.id) ? "#ffccd8" : "#dfdfdf",
                              color: isPostLiked(post.id) ? "#ff0055" : "#000000",
                              border: isPostLiked(post.id) ? "1px solid #ff0055" : "1px solid #808080",
                              fontWeight: "bold",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px"
                            }}
                          >
                            👍 {post.thumbsUpCount || 0}
                          </button>
                          
                          <div style={{ display: "flex", gap: "6px" }}>
                            {post.status === "connected" ? (
                              <button 
                                disabled
                                style={{ minHeight: "24px", padding: "2px 8px", color: "#888", border: "1px solid #aaa", backgroundColor: "#e0e0e0" }}
                              >
                                🔒 Already Connected
                              </button>
                            ) : post.userId !== currentUser?.uid ? (
                              <>
                                <button 
                                  onClick={() => runWithAuthenticationCheck(() => handleThatWasMe(post))}
                                  style={{ minHeight: "24px", padding: "2px 8px" }}
                                >
                                  🤝 That Was Me!
                                </button>
                                <button 
                                  onClick={() => runWithAuthenticationCheck(() => handleReportPost(post))}
                                  style={{ 
                                    minHeight: "24px", 
                                    padding: "2px 8px", 
                                    backgroundColor: "#ffcccc", 
                                    color: "#b22222", 
                                    border: "1px solid #b22222",
                                    fontWeight: "bold"
                                  }}
                                >
                                  ⚠️ Report
                                </button>
                              </>
                            ) : (
                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <span style={{ fontSize: "11px", color: "#808080", fontStyle: "italic" }}>
                                  (Your post)
                                </span>
                                <button 
                                  onClick={() => handleDeletePost(post)}
                                  style={{ 
                                    minHeight: "24px", 
                                    padding: "2px 8px", 
                                    backgroundColor: "#ffcccc", 
                                    color: "#b22222", 
                                    border: "1px solid #b22222",
                                    fontWeight: "bold"
                                  }}
                                >
                                  🗑️ Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* PROFILE SCREEN */}
        {navigationScreen === "profile" && selectedProfileUser && (
          <MySpaceProfileDialog
            key={selectedProfileUser.userId}
            userId={selectedProfileUser.userId}
            username={selectedProfileUser.username}
            mood={selectedProfileUser.mood}
            bio={selectedProfileUser.bio}
            profileTheme={selectedProfileUser.profileTheme}
            emoji_avatar={selectedProfileUser.emoji_avatar}
            headline={selectedProfileUser.headline}
            spotify_track_uri={selectedProfileUser.spotify_track_uri}
            spotify_song_title={selectedProfileUser.spotify_song_title}
            spotify_artist_name={selectedProfileUser.spotify_artist_name}
            lastActiveAt={selectedProfileUser.lastActiveAt}
            onClose={() => {
              setSelectedProfileUser(null);
              setNavigationScreen("home");
            }}
            onOpenChat={handleOpenChat}

            currentUserId={currentUser?.uid}
            onSaveProfile={handleSaveProfile}
            unlockedThemes={
              selectedProfileUser.userId === currentUser?.uid 
                ? (userDoc?.unlockedThemes || []) 
                : (selectedProfileUser.unlockedThemes || [])
            }
            favorited_bars={
              selectedProfileUser.userId === currentUser?.uid 
                ? (userDoc?.favorited_bars || []) 
                : (selectedProfileUser.favorited_bars || [])
            }
            venues={venues}
            acceptedConnections={acceptedConnections}
            onOpenProfile={handleOpenProfile}
            onSelectVenue={(venueId) => {
              const matchedVenue = venues.find(v => v.fsq_id === venueId);
              if (matchedVenue) {
                setSelectedVenue(matchedVenue);
                setSelectedCity(matchedVenue.city);
                setNavigationScreen("feed");
                setSelectedProfileUser(null);
              }
            }}
          />
        )}

        {/* MAIL SCREEN */}
        {navigationScreen === "mail" && (
          <OutlookInbox 
            currentUser={currentUser}
            userDoc={userDoc}
            onClose={() => setNavigationScreen("home")}
            onOpenChat={handleOpenChat}
          />
        )}

        {/* POST SCREEN */}
        {navigationScreen === "post" && (
          <Wizard 
            onClose={() => setNavigationScreen(selectedVenue ? "feed" : "home")}
            onSubmit={handleWizardSubmit}
            preselectedVenue={selectedVenue}
            currentUserProfile={userDoc}
            onModerationError={setModerationError}
            city={selectedCity || userDoc?.selectedCity || "Phoenix"}
          />
        )}

        {/* SETTINGS SCREEN */}
        {navigationScreen === "settings" && (
          <SettingsPanel 
            currentUser={currentUser}
            userDoc={userDoc}
            onLogout={handleLogout}
            onNavigateBack={() => setNavigationScreen("home")}
          />
        )}

        {/* LOGIN SCREEN */}
        {navigationScreen === "login" && (
          <AuthDialog 
            onClose={() => setNavigationScreen("home")} 
            onSuccess={handleAuthSuccess}
          />
        )}

        {/* CLAIM PROOF SCREEN */}
        {navigationScreen === "proof" && showProofDialog && (
          <ProofDialog 
            post={showProofDialog}
            onClose={() => {
              setShowProofDialog(null);
              setNavigationScreen(selectedVenue ? "feed" : "home");
            }}
            onSubmit={handleProofSubmit}
          />
        )}

        {/* AIM CHAT SCREEN */}
        {navigationScreen === "chat" && activeChatId && (
          <AIMChat 
            chatId={activeChatId}
            connection={activeChatConnection}
            currentUser={currentUser}
            userDoc={userDoc}
            onClose={() => {
              setActiveChatId(null);
              setActiveChatConnection(null);
              setNavigationScreen("mail");
            }}
          />
        )}

      </div>

      {/* Absolute Certainty Checkpoint Modal */}
      {showCertaintyModal && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: "400px" }}>
            <div className="window">
              <TitleBar title="Absolute Certainty Checkpoint" onClose={() => setShowCertaintyModal(null)} />
              <div className="window-body" style={{ gap: "12px", padding: "10px" }}>
                <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                  <span style={{ fontSize: "36px" }}>⚠️</span>
                  <div>
                    <h4 style={{ margin: "0 0 4px 0", fontSize: "13px", color: "red" }}>Are you absolutely sure?</h4>
                    <p style={{ margin: 0, fontSize: "12px", lineHeight: "1.4" }}>
                      If the poster rejects this claim by purging it, you will be penalized with a 12-hour lockout from outbound connections.
                    </p>
                  </div>
                </div>
                {certaintyCountdown > 0 && (
                  <p style={{ margin: "8px 0 0 0", fontSize: "11px", color: "#808080", textAlign: "center" }}>
                    Please read the above carefully… ({certaintyCountdown})
                  </p>
                )}
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "10px" }}>
                  <button 
                    onClick={() => setShowCertaintyModal(null)} 
                    style={{ minWidth: "120px", minHeight: "36px" }}
                  >
                    [ ABORT / MY FAULT ]
                  </button>
                  <button 
                    className="default"
                    disabled={certaintyCountdown > 0}
                    onClick={() => {
                      setShowProofDialog(showCertaintyModal);
                      setShowCertaintyModal(null);
                      setNavigationScreen("proof");
                    }} 
                    style={{ 
                      minWidth: "120px", 
                      minHeight: "36px", 
                      fontWeight: "bold",
                      opacity: certaintyCountdown > 0 ? 0.45 : 1,
                      cursor: certaintyCountdown > 0 ? "not-allowed" : "pointer"
                    }}
                  >
                    {certaintyCountdown > 0 ? `[ WAIT... ${certaintyCountdown} ]` : "[ ABSOLUTELY SURE ]"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Strike 2 Warning Dialog */}
      {showStrike2Warning && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: "400px" }}>
            <div className="window">
              <TitleBar title="SYSTEM WARNING" onClose={() => setShowStrike2Warning(false)} />
              <div className="window-body" style={{ gap: "12px", padding: "10px" }}>
                <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                  <span style={{ fontSize: "36px" }}>⚠️</span>
                  <div>
                    <h4 style={{ margin: "0 0 4px 0", fontSize: "13px", color: "red" }}>Warning</h4>
                    <p style={{ margin: 0, fontSize: "12px", lineHeight: "1.4" }}>
                      SYSTEM WARNING: Your account has been flagged multiple times for text violations. Any further complaints will result in an immediate system crash and hardware lockout.
                    </p>
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "10px" }}>
                  <button 
                    onClick={() => setShowStrike2Warning(false)} 
                    style={{ width: "80px", fontWeight: "bold", minHeight: "36px" }}
                  >
                    OK
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Moderation Error/Roast Dialog */}
      {moderationError && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: "360px" }}>
            <div className="window">
              <TitleBar title="System Warning" onClose={() => setModerationError("")} />
              <div className="window-body" style={{ gap: "12px", padding: "10px" }}>
                <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                  <span style={{ fontSize: "36px" }}>⚠️</span>
                  <div>
                    <h4 style={{ margin: "0 0 4px 0", fontSize: "13px", color: "red" }}>Post Denied</h4>
                    <p style={{ margin: 0, fontSize: "12px", lineHeight: "1.4" }}>
                      {moderationError}
                    </p>
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "10px" }}>
                  <button 
                    onClick={() => setModerationError("")} 
                    style={{ width: "80px", fontWeight: "bold", minHeight: "36px" }}
                  >
                    OK
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Post Success Dialog */}
      {showPostSuccess && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: "320px" }}>
            <div className="window">
              <TitleBar title="System Message" onClose={handleSuccessThanks} />
              <div className="window-body" style={{ gap: "12px", padding: "12px" }}>
                <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                  <span style={{ fontSize: "32px" }}>📬</span>
                  <div>
                    <h4 style={{ margin: "0 0 4px 0", fontSize: "13px", color: "#003399" }}>Success</h4>
                    <p style={{ margin: 0, fontSize: "12px", lineHeight: "1.4", fontWeight: "bold" }}>
                      Posted! Good luck
                    </p>
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "12px" }}>
                  <button 
                    onClick={handleSuccessThanks} 
                    style={{ width: "80px", fontWeight: "bold", minHeight: "36px", cursor: "pointer" }}
                  >
                    Thanks!
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <footer style={{
        textAlign: "center",
        padding: "12px 10px",
        fontSize: "11px",
        fontFamily: "Arial, sans-serif",
        color: "#888888",
        backgroundColor: "#e5e5e5",
        borderTop: "1px solid #ff99cc",
        marginTop: "auto",
        width: "100%",
        boxSizing: "border-box",
        fontSmooth: "never",
        WebkitFontSmoothing: "none",
        MozOsxFontSmoothing: "none"
      }}>
        asl - built on pure nostalgia - 2026
      </footer>
    </div>
  );
}
