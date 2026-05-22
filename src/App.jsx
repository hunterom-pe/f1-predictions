import { useState, useEffect } from "react";
import FolderTree from "./components/FolderTree";
import TitleBar from "./components/TitleBar";
import AuthDialog from "./components/AuthDialog";
import Wizard from "./components/Wizard";
import ProofDialog from "./components/ProofDialog";
import OutlookInbox from "./components/OutlookInbox";
import AIMChat from "./components/AIMChat";
import BSOD from "./components/BSOD";

import { 
  firebaseSignInAnonymously, 
  firebaseOnAuthStateChanged, 
  firebaseSignOut,
  dbOnSnapshot, 
  dbSetDoc, 
  dbGetDoc,
  dbAddDoc
} from "./firebase";
import { searchVenues } from "./services/foursquare";
import { getDeviceUuid } from "./services/security";

export default function App() {
  // Device & Auth State
  const [deviceUuid, setDeviceUuid] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [userDoc, setUserDoc] = useState(null);
  const [deviceBanned, setDeviceBanned] = useState(false);
  const [booting, setBooting] = useState(true);

  // App Layout State
  const [venues, setVenues] = useState([]);
  const [selectedVenue, setSelectedVenue] = useState(null);
  const [venuePosts, setVenuePosts] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [activeChatConnection, setActiveChatConnection] = useState(null);

  // Window Visibility States
  const [showInbox, setShowInbox] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showProofDialog, setShowProofDialog] = useState(null); // stores the post object being claimed
  const [showAbout, setShowAbout] = useState(false);

  // Interceptor State
  const [authActionCallback, setAuthActionCallback] = useState(null);

  // Start Menu & Clock States
  const [startMenuOpen, setStartMenuOpen] = useState(false);
  const [systemTime, setSystemTime] = useState("");

  // Window minimization states (for taskbar management)
  const [minimizedWindows, setMinimizedWindows] = useState({
    explorer: false,
    inbox: false,
    chat: false
  });

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

  // 4. Taskbar Real-time Clock Sync
  useEffect(() => {
    const updateTime = () => {
      const date = new Date();
      let hours = date.getHours();
      const minutes = date.getMinutes();
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12;
      hours = hours ? hours : 12; // hour '0' should be '12'
      const strMinutes = minutes < 10 ? "0" + minutes : minutes;
      setSystemTime(`${hours}:${strMinutes} ${ampm}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 30000); // Update every 30s
    return () => clearInterval(interval);
  }, []);

  // 5. Intercept checks for Auth Wall
  const runWithAuthenticationCheck = (action) => {
    if (!currentUser || currentUser.isAnonymous) {
      // User is guest/anonymous, launch Auth Wall
      setAuthActionCallback(() => action);
      setShowAuth(true);
    } else {
      // User is already logged in, run action directly
      action();
    }
  };

  const handleAuthSuccess = () => {
    setShowAuth(false);
    if (authActionCallback) {
      authActionCallback(); // Resume action
      setAuthActionCallback(null);
    }
  };

  // Post wizard submit handler
  const handleWizardSubmit = async (postData) => {
    try {
      await dbAddDoc("posts", {
        ...postData,
        userId: currentUser.uid
      });
      setShowWizard(false);
    } catch (err) {
      console.error("Error creating post:", err);
    }
  };

  // Claim post ("That was me!") proof submit handler
  const handleProofSubmit = async (proofText) => {
    try {
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
      alert("Verification sent. Poster will review details.");
    } catch (err) {
      console.error("Error submitting proof:", err);
    }
  };

  // Open Chat Room from Inbox handler
  const handleOpenChat = (chatId, connection) => {
    if (chatId) {
      setActiveChatId(chatId);
    } else {
      // Find chat for connection
      dbOnSnapshot("chats", [], (snapshot) => {
        const chat = snapshot.docs.find(d => d.data().connectionId === connection.id);
        if (chat) {
          setActiveChatId(chat.id);
        }
      });
    }
    setActiveChatConnection(connection);
    setMinimizedWindows(prev => ({ ...prev, chat: false }));
  };

  const handleLogout = async () => {
    if (window.confirm("Are you sure you want to disconnect from RetroConnect?")) {
      await firebaseSignOut();
      window.location.reload(); // Re-trigger guest onboarding
    }
  };

  // Toggle Minimize windows
  const toggleMinimize = (windowKey) => {
    setMinimizedWindows(prev => ({
      ...prev,
      [windowKey]: !prev[windowKey]
    }));
  };

  // Lock user into BSOD if marked banned
  if (deviceBanned || (userDoc && (userDoc.banned || userDoc.flag_count >= 3))) {
    return <BSOD />;
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
        <span style={{ fontSize: "36px", marginBottom: "10px" }}>💾</span>
        <h2 style={{ fontWeight: "normal" }}>RetroConnect v1.0</h2>
        <p style={{ fontSize: "11px", color: "#ccc" }}>Starting background networking services . . .</p>
      </div>
    );
  }

  return (
    <div className="desktop">
      {/* Desktop Shortcut Icons */}
      <div className="desktop-icons">
        <div className="desktop-icon" onClick={() => setMinimizedWindows(prev => ({ ...prev, explorer: false }))}>
          <span className="desktop-icon-image" style={{ fontSize: "28px" }}>💻</span>
          <span className="desktop-icon-text">Network Neighborhood</span>
        </div>
        
        <div className="desktop-icon" onClick={() => runWithAuthenticationCheck(() => { setShowInbox(true); setMinimizedWindows(prev => ({ ...prev, inbox: false })); })}>
          <span className="desktop-icon-image" style={{ fontSize: "28px" }}>📬</span>
          <span className="desktop-icon-text">Outlook Express</span>
        </div>
        
        {currentUser?.email && (
          <div className="desktop-icon" onClick={handleLogout}>
            <span className="desktop-icon-image" style={{ fontSize: "28px" }}>🔌</span>
            <span className="desktop-icon-text">Disconnect</span>
          </div>
        )}
      </div>

      {/* Network Neighborhood Explorer Window (Always open by default) */}
      {!minimizedWindows.explorer && (
        <div 
          className="window-container mobile-maximized"
          style={{
            position: "absolute",
            top: "20px",
            left: "90px",
            width: "calc(100% - 110px)",
            height: "calc(100% - 60px)",
            minWidth: "280px",
            zIndex: 1000,
            boxShadow: "2px 2px 10px rgba(0,0,0,0.3)"
          }}
        >
          <div className="window">
            <TitleBar 
              title="Network Neighborhood" 
              onMinimize={() => toggleMinimize("explorer")}
              active={true}
            />
            
            {/* Toolbar */}
            <div className="window-body" style={{ flexDirection: "row", gap: "6px", backgroundColor: "#c0c0c0", borderBottom: "2px solid #808080", padding: "4px", flex: "none" }}>
              <button 
                onClick={() => runWithAuthenticationCheck(() => setShowWizard(true))}
                style={{ fontSize: "11px", display: "flex", alignItems: "center", gap: "4px" }}
              >
                ✏️ New Connection
              </button>
              <button 
                onClick={() => runWithAuthenticationCheck(() => setShowInbox(true))}
                style={{ fontSize: "11px", display: "flex", alignItems: "center", gap: "4px" }}
              >
                📬 Inbox
              </button>
              {currentUser?.isAnonymous ? (
                <button 
                  onClick={() => setShowAuth(true)}
                  style={{ fontSize: "11px", display: "flex", alignItems: "center", gap: "4px", marginLeft: "auto", fontWeight: "bold" }}
                >
                  🔑 Register Account
                </button>
              ) : (
                <div style={{ marginLeft: "auto", fontSize: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <span>User: <strong>{currentUser.email}</strong></span>
                </div>
              )}
            </div>

            <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
              {/* Left Zone Folder list panel */}
              <div style={{ width: "160px", borderRight: "2px solid #808080", height: "100%", flexShrink: 0 }}>
                <FolderTree 
                  venues={venues} 
                  selectedVenue={selectedVenue} 
                  onSelectVenue={(v) => setSelectedVenue(v)} 
                />
              </div>

              {/* Right Venue Feed Panel */}
              <div className="window-body" style={{ flex: 1, backgroundColor: "#fff", overflowY: "auto", padding: "10px" }}>
                {selectedVenue ? (
                  <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                    <div style={{ borderBottom: "2px solid #000", paddingBottom: "6px", marginBottom: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <h2 style={{ margin: "0", fontSize: "14px" }}>📍 {selectedVenue.name}</h2>
                        <span style={{ fontSize: "10px", color: "#606060" }}>{selectedVenue.formatted_address}</span>
                      </div>
                      <button 
                        className="default" 
                        onClick={() => runWithAuthenticationCheck(() => setShowWizard(true))}
                        style={{ fontSize: "10px", padding: "2px 6px" }}
                      >
                        [ + Post Connection ]
                      </button>
                    </div>

                    {/* Feed List */}
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "10px" }}>
                      {venuePosts.length === 0 ? (
                        <div style={{ padding: "40px 10px", textAlign: "center", color: "#808080", fontStyle: "italic", fontSize: "11px" }}>
                          No missed connections reported yet. Be the first to post!
                        </div>
                      ) : (
                        venuePosts.map(post => (
                          <div 
                            key={post.id} 
                            style={{ 
                              border: "2px solid", 
                              borderColor: "#fff #808080 #808080 #fff", 
                              backgroundColor: "#f5f5f5", 
                              padding: "8px",
                              display: "flex",
                              flexDirection: "column",
                              gap: "6px"
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "#505050", borderBottom: "1px solid #dfdfdf", paddingBottom: "4px" }}>
                              <span>📅 Encountered: <strong>{post.date}</strong> ({post.timeRange})</span>
                              <span>Anonymous Reporter</span>
                            </div>
                            
                            <p style={{ margin: "4px 0", fontSize: "11px", fontFamily: "Courier New, monospace", whiteSpace: "pre-wrap", color: "#111" }}>
                              "{post.text}"
                            </p>

                            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "4px" }}>
                              {post.userId !== currentUser?.uid ? (
                                <button 
                                  onClick={() => runWithAuthenticationCheck(() => setShowProofDialog(post))}
                                  style={{ fontSize: "10px", padding: "1px 6px", fontWeight: "bold" }}
                                >
                                  🤝 That Was Me!
                                </button>
                              ) : (
                                <span style={{ fontSize: "9px", color: "#808080", fontStyle: "italic" }}>
                                  (Your post)
                                </span>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", height: "100%", gap: "8px", textAlign: "center" }}>
                    <span style={{ fontSize: "42px" }}>📂</span>
                    <strong style={{ fontSize: "12px" }}>Explore Network Neighborhood</strong>
                    <p style={{ margin: 0, fontSize: "10px", color: "#606060", maxWidth: "250px", lineHeight: "1.4" }}>
                      Navigate the directories on the left list pane to select local bars and view missed connections.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Status Bar */}
            <div className="status-bar" style={{ flex: "none" }}>
              <p className="status-bar-field">Active Nodes: {venues.length}</p>
              <p className="status-bar-field">Database: Online</p>
              <p className="status-bar-field">{currentUser?.isAnonymous ? "Guest Mode" : "Authenticated Mode"}</p>
            </div>
          </div>
        </div>
      )}

      {/* Auth Dialog Overlay */}
      {showAuth && (
        <AuthDialog 
          onClose={() => setShowAuth(false)} 
          onSuccess={handleAuthSuccess}
        />
      )}

      {/* Post wizard Dialog Overlay */}
      {showWizard && (
        <Wizard 
          onClose={() => setShowWizard(false)}
          onSubmit={handleWizardSubmit}
        />
      )}

      {/* Blind proof verify Dialog Overlay */}
      {showProofDialog && (
        <ProofDialog 
          post={showProofDialog}
          onClose={() => setShowProofDialog(null)}
          onSubmit={handleProofSubmit}
        />
      )}

      {/* Outlook Inbox Window */}
      {showInbox && !minimizedWindows.inbox && (
        <OutlookInbox 
          currentUser={currentUser}
          onClose={() => setShowInbox(false)}
          onOpenChat={handleOpenChat}
        />
      )}

      {/* AIM Chat Room Window */}
      {activeChatId && !minimizedWindows.chat && (
        <AIMChat 
          chatId={activeChatId}
          connection={activeChatConnection}
          currentUser={currentUser}
          onClose={() => { setActiveChatId(null); setActiveChatConnection(null); }}
        />
      )}

      {/* About RetroConnect dialogue popup */}
      {showAbout && (
        <div 
          className="window-container"
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "280px",
            zIndex: 140000,
            boxShadow: "2px 2px 20px rgba(0,0,0,0.5)"
          }}
        >
          <div className="window">
            <TitleBar title="About RetroConnect" onClose={() => setShowAbout(false)} />
            <div className="window-body" style={{ gap: "10px", fontSize: "11px" }}>
              <div style={{ textAlign: "center", marginBottom: "8px" }}>
                <span style={{ fontSize: "28px" }}>💾</span>
                <h4 style={{ margin: "4px 0" }}>RetroConnect v1.0</h4>
                <span>Windows 98 Missed Connection Client</span>
              </div>
              <hr />
              <p style={{ margin: 0, lineHeight: "1.3" }}>
                Built strictly with pre-XP GUI assets, zero-media validation, encrypted buddy channels, and hardware blacklist guards.
              </p>
              <div style={{ display: "flex", justifyContent: "center", marginTop: "8px" }}>
                <button onClick={() => setShowAbout(false)} style={{ width: "60px" }}>OK</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* bottom Classic Windows 98 Taskbar */}
      <div className="taskbar">
        <div className="taskbar-left">
          {/* Start Menu Button */}
          <button 
            className={`start-button ${startMenuOpen ? "active" : ""}`}
            onClick={() => setStartMenuOpen(!startMenuOpen)}
          >
            <span style={{ fontSize: "14px" }}>💾</span>
            Start
          </button>
          
          <div className="taskbar-divider" />

          {/* Explorer window button */}
          <button 
            className={`taskbar-app-button ${!minimizedWindows.explorer ? "active" : ""}`}
            onClick={() => toggleMinimize("explorer")}
          >
            💻 Network
          </button>

          {/* Inbox window button */}
          {showInbox && (
            <button 
              className={`taskbar-app-button ${!minimizedWindows.inbox ? "active" : ""}`}
              onClick={() => toggleMinimize("inbox")}
            >
              📬 Inbox
            </button>
          )}

          {/* Chat window button */}
          {activeChatId && (
            <button 
              className={`taskbar-app-button ${!minimizedWindows.chat ? "active" : ""}`}
              onClick={() => toggleMinimize("chat")}
            >
              💬 AIM Chat
            </button>
          )}
        </div>

        {/* System tray (Clock and status indicators) */}
        <div className="system-tray">
          <div className="system-tray-icons">
            <span title="Volume" style={{ fontSize: "11px", cursor: "default" }}>🔊</span>
            <span title="System Shield Connected" style={{ fontSize: "11px", cursor: "default" }}>🛡️</span>
          </div>
          <span>{systemTime}</span>
        </div>

        {/* Start Menu Popup Overlay */}
        {startMenuOpen && (
          <div className="start-menu">
            <div className="start-menu-sidebar">
              Windows 98
            </div>
            <ul className="start-menu-list">
              <li 
                className="start-menu-item" 
                onClick={() => { setStartMenuOpen(false); runWithAuthenticationCheck(() => setShowWizard(true)); }}
              >
                📝 New Connection Wizard
              </li>
              <li 
                className="start-menu-item" 
                onClick={() => { setStartMenuOpen(false); runWithAuthenticationCheck(() => { setShowInbox(true); setMinimizedWindows(prev => ({ ...prev, inbox: false })); }); }}
              >
                📬 Inbox (Outlook Express)
              </li>
              <li 
                className="start-menu-item" 
                onClick={() => { setStartMenuOpen(false); setShowAbout(true); }}
              >
                ℹ️ About RetroConnect
              </li>
              
              <div className="start-menu-separator" />
              
              {currentUser && !currentUser.isAnonymous ? (
                <li className="start-menu-item" onClick={() => { setStartMenuOpen(false); handleLogout(); }}>
                  🔌 Log Out / Disconnect
                </li>
              ) : (
                <li className="start-menu-item" onClick={() => { setStartMenuOpen(false); setShowAuth(true); }}>
                  🔑 Register Credentials
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
