import { useState, useEffect } from "react";
import TitleBar from "./components/TitleBar";
import AuthDialog from "./components/AuthDialog";
import Wizard from "./components/Wizard";
import ProofDialog from "./components/ProofDialog";
import OutlookInbox from "./components/OutlookInbox";
import AIMChat from "./components/AIMChat";
import BSOD from "./components/BSOD";
import MySpaceMusicPlayer from "./components/MySpaceMusicPlayer";
import MySpaceProfileDialog from "./components/MySpaceProfileDialog";

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
  const [navigationScreen, setNavigationScreen] = useState("home");
  const [selectedCity, setSelectedCity] = useState("");

  // Active Data States
  const [showProofDialog, setShowProofDialog] = useState(null); // stores the post object being claimed
  const [selectedProfileUser, setSelectedProfileUser] = useState(null);

  // Interceptor State
  const [authActionCallback, setAuthActionCallback] = useState(null);
  const [moderationError, setModerationError] = useState("");

  // Connection throttle & lockout states
  const [pendingClaims, setPendingClaims] = useState([]);
  const [showCertaintyModal, setShowCertaintyModal] = useState(null);
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
  const [favoriteFeedPosts, setFavoriteFeedPosts] = useState([]);

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

        // Initialize Anonymous Onboarding
        await firebaseSignInAnonymously();

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
      setCurrentUser(user);
      if (user) {
        // Sync user device registration in background
        dbSetDoc("users", user.uid, {
          uid: user.uid,
          email: user.email || "",
          uuid: deviceUuid,
          lastLogin: Date.now()
        }, true);

        // Subscribe to user flags and ban status in real-time
        const unsubUserDoc = dbOnSnapshot("users", [], (snapshot) => {
          const userRecord = snapshot.docs.find(d => d.id === user.uid);
          if (userRecord) {
            const data = userRecord.data();
            setUserDoc(data);
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

  // Strike 2 Warning Alert Trigger
  useEffect(() => {
    if (userDoc && userDoc.flag_count === 2 && !hasShownStrike2) {
      setShowStrike2Warning(true);
      setHasShownStrike2(true);
    }
  }, [userDoc, hasShownStrike2]);

  // Track pending outbound connection claims for the One-and-Done limit
  useEffect(() => {
    if (!currentUser || currentUser.isAnonymous) {
      setPendingClaims([]);
      return;
    }
    const unsub = dbOnSnapshot("connections", [
      queryWhere("senderId", "==", currentUser.uid),
      queryWhere("status", "==", "pending")
    ], (snapshot) => {
      const claims = [];
      snapshot.docs.forEach(doc => {
        claims.push({ id: doc.id, ...doc.data() });
      });
      setPendingClaims(claims);
    });
    return () => unsub();
  }, [currentUser]);

  // Subscribe to accepted connections for the Friend Space
  useEffect(() => {
    if (!currentUser || currentUser.isAnonymous) {
      setAcceptedConnections([]);
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
      setNavigationScreen("sysop");
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
  useEffect(() => {
    if (!isLoggedIn) {
      setFavoriteFeedPosts([]);
      return;
    }
    const favoritedIds = userDoc?.favorited_bars || [];
    const unsub = dbOnSnapshot("posts", [], (snapshot) => {
      const posts = [];
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (favoritedIds.includes(data.venueId) && data.status !== "suppressed") {
          posts.push({ id: doc.id, ...data });
        }
      });
      posts.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      setFavoriteFeedPosts(posts);
    });
    return () => unsub();
  }, [isLoggedIn, userDoc?.favorited_bars]);



  // 3. Subscribe to Posts for the selected Venue
  useEffect(() => {
    if (!selectedVenue) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVenuePosts([]);
      return;
    }

    const unsubPosts = dbOnSnapshot(
      "posts",
      [],
      (snapshot) => {
        const posts = [];
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          if (data.venueId === selectedVenue.fsq_id) {
            posts.push({ id: doc.id, ...data });
          }
        });
        // Sort descending by timestamp
        posts.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        setVenuePosts(posts);
      }
    );

    return () => unsubPosts();
  }, [selectedVenue]);



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
      const moderation = await moderateTextWithGemini(postData.text || "", "post");
      if (!moderation.approved) {
        const roasts = moderation.category === "doxxing" ? DOXXING_ROASTS : SPAM_ROASTS;
        const randomRoast = roasts[Math.floor(Math.random() * roasts.length)];
        throw new Error(randomRoast);
      }

      await dbAddDoc("posts", {
        ...postData,
        userId: currentUser.uid
      });

      // Also update the user's profile card in the users collection
      await dbSetDoc("users", currentUser.uid, {
        username: postData.username,
        mood: postData.mood,
        bio: postData.bio,
        profileTheme: postData.profileTheme,
        emoji_avatar: postData.emoji_avatar
      }, true);

      // Auto-navigate to the venue's feed
      const matchedVenue = venues.find(v => v.fsq_id === postData.venueId);
      if (matchedVenue) {
        setSelectedVenue(matchedVenue);
        setSelectedCity(matchedVenue.city);
        setNavigationScreen("feed");
      } else {
        setNavigationScreen("home");
      }
    } catch (err) {
      console.error("Error creating post:", err);
      setModerationError(err.message || String(err));
    }
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
        banned: false
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
      
      alert("User unbanned, flags reset, device unblacklisted.");
    } catch (err) {
      alert("Error resolving appeal: " + err.message);
    }
  };

  const handleSelectVenue = (venue) => {
    setSelectedVenue(venue);
    setNavigationScreen("feed");
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
          favorited_bars: userData.favorited_bars || [],
          headline: userData.headline || "Everyone's favorite dial-up partner"
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
          favorited_bars: [],
          headline: "Everyone's favorite dial-up partner"
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
          favorited_bars: userData.favorited_bars || [],
          headline: userData.headline || fallbackData.headline || "Everyone's favorite dial-up partner"
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
          favorited_bars: [],
          headline: fallbackData.headline || "Everyone's favorite dial-up partner"
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
        favorited_bars: [],
        headline: fallbackData.headline || "Everyone's favorite dial-up partner"
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
        uuid: deviceUuid,
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

      await dbAddDoc("connections", {
        postId: showProofDialog.id,
        postText: showProofDialog.text,
        venueName: showProofDialog.venueName,
        senderId: currentUser.uid,
        receiverId: showProofDialog.userId,
        proofText,
        status: "pending"
      });
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
            because dating apps suck
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
            className={`myspace-nav-link ${["city", "bar", "feed"].includes(navigationScreen) ? "active" : ""}`} 
            onClick={() => {
              setNavigationScreen("city");
              setSelectedProfileUser(null);
            }}
          >
            Find
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
              >
                Mail
              </span>
              <span 
                className={`myspace-nav-link ${navigationScreen === "post" ? "active" : ""}`} 
                onClick={() => runWithAuthenticationCheck(() => {
                  setNavigationScreen("post");
                  setSelectedProfileUser(null);
                })}
              >
                Post
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
            <div className="myspace-welcome-box">
              <div className="myspace-welcome-title">Welcome to asl!</div>
              <div className="myspace-welcome-text" style={{ marginBottom: "15px", lineHeight: "1.4" }}>
                asl is a place for missed connections. Find someone you bumped into at local spots.
              </div>
              <button 
                className="default" 
                onClick={() => setNavigationScreen("city")}
                style={{ width: "100%", minHeight: "52px", fontSize: "17px", fontWeight: "bold" }}
              >
                🌵 Enter Regional Portal
              </button>
            </div>

            {isLoggedIn ? (
              /* LOGGED-IN: Favorites Feed */
              <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
                <div className="section-header-orange" style={{ margin: 0, backgroundColor: "#003399", color: "#fff", borderLeft: "4px solid #ff007f", padding: "6px 10px", fontWeight: "bold", fontSize: "13px" }}>
                  📡 Bar Radar
                </div>
                <div style={{ border: "1px solid #6699cc", borderTop: "none", backgroundColor: "#fff" }}>
                  {(userDoc?.favorited_bars || []).length === 0 ? (
                    <div style={{ padding: "20px", textAlign: "center", fontSize: "13px", color: "#666", fontStyle: "italic", lineHeight: "1.5" }}>
                      <div style={{ fontSize: "28px", marginBottom: "8px" }}>📡</div>
                      No favorited bars yet. Browse locations and ⭐ favorite a bar to see its posts here.
                    </div>
                  ) : favoriteFeedPosts.length === 0 ? (
                    <div style={{ padding: "20px", textAlign: "center", fontSize: "13px", color: "#666", fontStyle: "italic", lineHeight: "1.5" }}>
                      <div style={{ fontSize: "28px", marginBottom: "8px" }}>📭</div>
                      No posts yet from your favorited bars. Check back soon.
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      {favoriteFeedPosts.map((post, idx) => {
                        const timeAgo = (() => {
                          const diff = Date.now() - (post.timestamp || 0);
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
                              borderBottom: idx < favoriteFeedPosts.length - 1 ? "1px solid #e0e8f5" : "none",
                              padding: "10px 12px",
                              cursor: "pointer"
                            }}
                            onClick={() => {
                              const venue = venues.find(v => v.fsq_id === post.venueId);
                              if (venue) handleSelectVenue(venue);
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "4px", gap: "8px" }}>
                              <span style={{ fontWeight: "bold", fontSize: "11px", color: "#003399", textDecoration: "underline", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                📍 {post.venueName}
                              </span>
                              <span style={{ fontSize: "10px", color: "#999", whiteSpace: "nowrap", flexShrink: 0 }}>{timeAgo}</span>
                            </div>
                            <div style={{ fontSize: "12px", color: "#333", lineHeight: "1.4", marginBottom: "4px" }}>
                              {post.text}
                            </div>
                            <div style={{ fontSize: "10px", color: "#888" }}>
                              🕐 {post.date} · {post.timeRange}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
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
                {(() => {
                  const filteredVenues = venues.filter(v => 
                    (v.city || "").toLowerCase() === selectedCity.toLowerCase()
                  );

                  if (filteredVenues.length === 0) {
                    return (
                      <div style={{ padding: "40px 10px", textAlign: "center", color: "#808080", fontStyle: "italic", fontSize: "13px" }}>
                        No matching venues found.
                      </div>
                    );
                  }

                  const zones = {};
                  filteredVenues.forEach(v => {
                    const zone = v.zone || "Downtown";
                    if (!zones[zone]) zones[zone] = [];
                    zones[zone].push(v);
                  });

                  return Object.keys(zones).map(zone => (
                    <div key={zone} style={{ marginBottom: "15px" }}>
                      <div style={{ fontWeight: "bold", backgroundColor: "#ffccd8", padding: "6px 10px", fontSize: "13px", borderBottom: "1px solid #ff99bb", color: "#99004d", display: "flex", alignItems: "center", gap: "6px", borderRadius: "2px" }}>
                        <span>📁</span>
                        <span>{zone} ({zones[zone].length})</span>
                      </div>
                      <ul style={{ listStyle: "none", padding: 0, margin: "6px 0 0 0", display: "flex", flexDirection: "column", gap: "6px" }}>
                        {zones[zone].map(venue => (
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
                                {venue.formatted_address}
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
              <h2 style={{ margin: "0 0 12px 0", color: "#000", fontSize: "28px", fontWeight: "bold", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <span>{selectedVenue.name}</span>
                <span style={{ fontSize: "26px" }}>🍹</span>
              </h2>

              <div className="profile-details-table">
                <p><strong>Region:</strong> {selectedCity}</p>
                <p><strong>Category:</strong> Local Spot / Venue</p>
                <p><strong>Address:</strong> {selectedVenue.formatted_address}</p>
                <p><strong>Status:</strong> Active Connection</p>
              </div>

              {/* Music Player */}
              <MySpaceMusicPlayer spotifyTrackUri={selectedVenue.spotify_track_uri || "spotify:track:4PTG3Z6ehGkBF3zI7YSp6g"} />
              {/* Contact Links Box */}
              <div className="contact-box">
                <div className="contact-box-header">Contacting {selectedVenue.name}</div>
                <div style={{ display: "flex", gap: "6px", padding: "6px" }}>
                  <div 
                    className="contact-action" 
                    style={{ flex: 1, minHeight: "36px", display: "flex", alignItems: "center", justifyContent: "center" }}
                    onClick={() => runWithAuthenticationCheck(() => setNavigationScreen("post"))}
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

              {/* Top Friends Grid */}
              <div className="top8-container" style={{ marginTop: "10px" }}>
                <div className="section-header-orange" style={{ margin: 0 }}>
                  {selectedVenue.name}'s Friend Space
                </div>
                <div style={{ fontSize: "12px", margin: "4px 0", fontWeight: "bold" }}>
                  {selectedVenue.name} has {venuePosts.length + 2} friends.
                </div>
                <div className="top8-grid">
                  {/* Tom */}
                  <div className="top8-friend" onClick={() => handleOpenProfile("tom", {
                    username: "Tom",
                    mood: "Friendly 🙂",
                    bio: "Co-founder of asl. Let me know if you have any questions!",
                    profileTheme: "classic",
                    emoji_avatar: "👥🥃💖"
                  })}>
                    <div className="friend-avatar-wrapper" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span className="friend-avatar" style={{ fontSize: "16px" }}>👥🥃💖</span>
                    </div>
                    <span className="friend-name">Tom</span>
                  </div>

                  {/* Gracie (if Phoenix) */}
                  {selectedCity === "Phoenix" && (
                    <div className="top8-friend" onClick={() => handleOpenProfile("gracie", {
                      username: "Gracie",
                      mood: "Pouring Drinks 🍹",
                      bio: "Welcome to Gracie's Tax Bar address: 711 N 7th Ave Phoenix, AZ 85007. Come hang out!",
                      profileTheme: "sunset",
                      emoji_avatar: "🍹🤠✨"
                    })}>
                      <div className="friend-avatar-wrapper" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span className="friend-avatar" style={{ fontSize: "16px" }}>🍹🤠✨</span>
                      </div>
                      <span className="friend-name">Gracie</span>
                    </div>
                  )}

                  {/* Render posters in Top 8 */}
                  {venuePosts.slice(0, 6).map(post => (
                    <div 
                      key={post.id} 
                      className="top8-friend" 
                      onClick={() => handleOpenProfile(post.userId, {
                        username: post.username || "Anonymous Connection",
                        mood: post.mood || "Chillin' 😎",
                        bio: post.bio || "Just browsing the local spots.",
                        profileTheme: post.profileTheme || "classic",
                        emoji_avatar: post.emoji_avatar || "👥🥃💖"
                      })}
                    >
                      <div className="friend-avatar-wrapper" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span className="friend-avatar" style={{ fontSize: "16px" }}>{post.emoji_avatar || "👥🥃💖"}</span>
                      </div>
                      <span className="friend-name">{post.username || "Anon"}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Profile Column */}
            <div className="myspace-right-col">
              <div className="section-header-orange" style={{ margin: 0, fontSize: "16px !important" }}>
                {selectedVenue.name}'s Latest Updates
              </div>

              <div className="profile-details-table" style={{ backgroundColor: "#fff", padding: "10px" }}>
                <h4 style={{ margin: "0 0 5px 0", color: "#cc6600" }}>About {selectedVenue.name}:</h4>
                <p style={{ margin: 0, fontSize: "13px !important" }}>
                  A popular neighborhood spot. Leave a comment below if you spotted someone special here.
                </p>
                <h4 style={{ margin: "10px 0 5px 0", color: "#cc6600" }}>Who we'd like to meet:</h4>
                <p style={{ margin: 0, fontSize: "13px !important" }}>
                  Connect with local buddies, regulars, and missed encounters.
                </p>
              </div>

              <div className="section-header-orange" style={{ margin: "10px 0 0 0" }}>
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
                          <div className="myspace-comment-date">
                            📅 Encountered: <strong>{post.date}</strong> ({post.timeRange})
                          </div>
                          <p 
                            className="myspace-comment-text"
                            dangerouslySetInnerHTML={{ __html: `"${parseBBCode(post.text)}"` }}
                          />
                        </div>

                        <div className="myspace-comment-actions">
                          {post.userId !== currentUser?.uid ? (
                            <button 
                              onClick={() => runWithAuthenticationCheck(() => handleThatWasMe(post))}
                            >
                              🤝 That Was Me!
                            </button>
                          ) : (
                            <span style={{ fontSize: "11px", color: "#808080", fontStyle: "italic" }}>
                              (Your post)
                            </span>
                          )}
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
            onClose={() => {
              setSelectedProfileUser(null);
              setNavigationScreen("home");
            }}
            onOpenChat={handleOpenChat}
            currentUserId={currentUser?.uid}
            onSaveProfile={handleSaveProfile}
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
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "10px" }}>
                  <button 
                    onClick={() => setShowCertaintyModal(null)} 
                    style={{ minWidth: "120px", minHeight: "36px" }}
                  >
                    [ ABORT / MY FAULT ]
                  </button>
                  <button 
                    className="default"
                    onClick={() => {
                      setShowProofDialog(showCertaintyModal);
                      setShowCertaintyModal(null);
                    }} 
                    style={{ minWidth: "120px", minHeight: "36px", fontWeight: "bold" }}
                  >
                    [ ABSOLUTELY SURE ]
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
