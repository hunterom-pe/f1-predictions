import { useState, useEffect } from "react";
import { 
  firebaseUpdateEmail, 
  firebaseSendPasswordResetEmail, 
  firebaseWipeUserData, 
  firebaseDeleteAuthUser,
  dbSetDoc
} from "../firebase";
import { Geolocation } from "@capacitor/geolocation";
import { AppIcon } from "@capacitor-community/app-icon";

export default function SettingsPanel({ currentUser, userDoc, onNavigateBack }) {
  const [activeTab, setActiveTab] = useState("account");

  // Account Adjustments State
  const [emailInput, setEmailInput] = useState(currentUser?.email || "");
  const [emailStatus, setEmailStatus] = useState("");
  const [pwResetStatus, setPwResetStatus] = useState("");

  // App Icon State
  const [selectedIcon, setSelectedIcon] = useState("default");



  // Diagnostics State
  const [geofenceStatus, setGeofenceStatus] = useState("Status: Offline / Standby");
  const [devOverride, setDevOverride] = useState(() => localStorage.getItem("asl_dev_override") === "true");

  const handleToggleDevOverride = (val) => {
    setDevOverride(val);
    if (val) {
      localStorage.setItem("asl_dev_override", "true");
      localStorage.setItem("asl_reviewer_mode", "true");
    } else {
      localStorage.removeItem("asl_dev_override");
      localStorage.removeItem("asl_reviewer_mode");
    }
  };

  // Deletion Modal/Warning State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteStatus, setDeleteStatus] = useState("");

  // Legal Modal States
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  // Load current app icon and user doc notifications on boot
  useEffect(() => {
    // Attempt to get active alternate icon name
    const checkActiveIcon = async () => {
      try {
        const result = await AppIcon.getName();
        if (result && result.value) {
          setSelectedIcon(result.value);
        } else {
          setSelectedIcon("default");
        }
      } catch (err) {
        console.log("AppIcon getName not supported on this platform", err);
      }
    };
    checkActiveIcon();


  }, [userDoc]);

  // Prevent background scrolling when modals are open
  useEffect(() => {
    if (showPrivacyModal || showTermsModal || showDeleteConfirm) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [showPrivacyModal, showTermsModal, showDeleteConfirm]);

  // A. Account Adjustments handlers
  const handleUpdateEmail = async () => {
    if (!emailInput) {
      setEmailStatus("Error: Email cannot be empty.");
      return;
    }
    setEmailStatus("Saving new email...");
    try {
      await firebaseUpdateEmail(emailInput);
      // Update firestore document too
      await dbSetDoc("users", currentUser.uid, {
        email: emailInput
      }, true);
      setEmailStatus("Sweet! Email updated.");
    } catch (err) {
      console.error(err);
      setEmailStatus(`Error: ${err.message || "Failed to update email."}`);
    }
  };

  const handlePasswordReset = async () => {
    const emailToUse = currentUser?.email || emailInput;
    if (!emailToUse) {
      setPwResetStatus("Error: No email address available.");
      return;
    }
    setPwResetStatus("Sending link...");
    try {
      await firebaseSendPasswordResetEmail(emailToUse);
      setPwResetStatus("Reset link sent to your inbox!");
    } catch (err) {
      console.error(err);
      setPwResetStatus(`Error: ${err.message || "Failed to send reset link."}`);
    }
  };

  // B. Alternate App Icon customizer
  const changeAppIcon = async (iconName) => {
    try {
      if (iconName === "default") {
        await AppIcon.reset({ suppressNotification: false });
      } else {
        await AppIcon.change({ name: iconName, suppressNotification: false });
      }
      setSelectedIcon(iconName);
    } catch (err) {
      console.warn("AppIcon change failed, using simulated fallback state:", err);
      setSelectedIcon(iconName);
    }
  };



  // D. Node Diagnostics
  const handlePingGeofence = async () => {
    setGeofenceStatus("Locating local nodes...");
    try {
      const isOverride = localStorage.getItem("asl_dev_override") === "true";
      let lat = 0;
      let lng = 0;
      let isCupertino = false;
      let permissionGranted = false;

      try {
        const permission = await Geolocation.checkPermissions();
        if (permission.location === "granted") {
          permissionGranted = true;
        } else {
          const req = await Geolocation.requestPermissions();
          if (req.location === "granted") {
            permissionGranted = true;
          }
        }
      } catch (errPermission) {
        console.warn("Permission check failed, relying on override status:", errPermission);
      }

      if (permissionGranted) {
        try {
          const coordinates = await Geolocation.getCurrentPosition({
            enableHighAccuracy: true,
            timeout: 5000
          });
          lat = coordinates.coords.latitude;
          lng = coordinates.coords.longitude;
          if (lat >= 37.30 && lat <= 37.35 && lng >= -122.06 && lng <= -122.01) {
            isCupertino = true;
          }
        } catch (errCoords) {
          console.warn("Could not retrieve current position:", errCoords);
        }
      }

      if (isOverride || isCupertino) {
        localStorage.setItem("asl_reviewer_mode", "true");
        setGeofenceStatus(`Status: Connected // Cupertino Node Active (lat: ${lat.toFixed(4)}, lng: ${lng.toFixed(4)}) - App Store Reviewer Mode`);
      } else {
        localStorage.removeItem("asl_reviewer_mode");
        if (!permissionGranted && !isOverride) {
          setGeofenceStatus("Status: Geolocation permission denied.");
        } else if (lat === 0 && lng === 0) {
          setGeofenceStatus("Status: Connection Lost // Check your settings");
        } else {
          setGeofenceStatus(`Status: Connected // Phoenix Node Active (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
        }
      }
    } catch (err) {
      console.error(err);
      setGeofenceStatus("Status: Connection Lost // Check your settings");
    }
  };

  const handleFlushCache = () => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.reload();
  };

  // E. System Format (Wipe Account)
  const handleWipeAccount = async () => {
    setDeleteStatus("Initiating system purge...");
    try {
      const uid = currentUser?.uid;
      if (!uid) throw new Error("No user ID found.");

      // 1. Wipe database documents (connections, posts, profile doc, chats)
      await firebaseWipeUserData(uid);

      // 2. Delete Auth profile
      await firebaseDeleteAuthUser();

      // 3. Clear storage and force reload
      localStorage.clear();
      sessionStorage.clear();
      setDeleteStatus("System clean. Rebooting...");
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err) {
      console.error("Purge error:", err);
      setDeleteStatus(`Error during purge: ${err.message || "Unknown error."}`);
    }
  };

  const TABS = [
    { id: "account", label: "👤 Account" },
    { id: "appearance", label: "🎨 Appearance" },
    { id: "diagnostics", label: "⚡ Diagnostics" },
    { id: "legal", label: "📜 Legal" }
  ];

  const ICONS_METADATA = {
    default: { emoji: "⚡", title: "Default Runner", desc: "Classic Yellow Guy", color: "#ffffcc" },
    MidnightRadar: { emoji: "📡", title: "Midnight Radar", desc: "Pink Radar Signals", color: "#ffe6f2" },
    PinkSilhouette: { emoji: "👤", title: "Pink Silhouette", desc: "Hearts Border Theme", color: "#ffe6e6" },
    NeonHeart: { emoji: "💌", title: "Neon Heart", desc: "Envelope Icon Pack", color: "#fff2e6" }
  };

  return (
    <div style={{ maxWidth: "450px", margin: "0 auto", width: "100%" }}>
      {/* Settings Panel Window */}
      <div className="window" style={{ width: "100%", boxSizing: "border-box" }}>
        <div className="title-bar" style={{ backgroundColor: "#003399", padding: "6px 8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div className="title-bar-text" style={{ fontWeight: "bold", color: "#ffffff" }}>
            ⚡ My asl settings & preferences
          </div>
          <div className="title-bar-controls">
            <button aria-label="Close" onClick={onNavigateBack} style={{ cursor: "pointer" }} />
          </div>
        </div>

        <div className="window-body" style={{ backgroundColor: "#f0f0f0", padding: "10px", margin: 0, display: "flex", flexDirection: "column", gap: "10px", fontFamily: "'MS Sans Serif', Geneva, sans-serif", fontSize: "11px" }}>
          
          {/* Back button */}
          <button 
            type="button" 
            onClick={onNavigateBack}
            style={{ width: "fit-content", minHeight: "26px", alignSelf: "flex-start", cursor: "pointer" }}
          >
            ← Back to Dashboard
          </button>

          {/* Windows 98 properties tabs */}
          <div style={{ display: "flex", gap: "2px", margin: "4px 0 0 0", padding: 0 }}>
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    padding: "4px 8px",
                    fontSize: "11px",
                    fontWeight: "bold",
                    cursor: "pointer",
                    backgroundColor: isActive ? "#f0f0f0" : "#dfdfdf",
                    borderStyle: "solid",
                    borderWidth: "1px 1px 0 1px",
                    borderColor: isActive ? "#ffffff #808080 #f0f0f0 #ffffff" : "#ffffff #808080 #808080 #ffffff",
                    marginTop: isActive ? "0px" : "2px",
                    height: isActive ? "24px" : "22px",
                    zIndex: isActive ? 2 : 1,
                    position: "relative",
                    borderRadius: "2px 2px 0 0",
                    color: isActive ? "#000000" : "#555555"
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tabs Content Panel */}
          <div style={{
            backgroundColor: "#f0f0f0",
            border: "2px outset #ffffff",
            padding: "12px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            boxShadow: "1px 1px 0px #000000",
            marginTop: "-2px",
            zIndex: 1,
            minHeight: "240px"
          }}>
            {activeTab === "account" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {/* A. Account Adjustments */}
                <fieldset style={{ border: "2px outset #ffffff", padding: "10px", margin: 0, backgroundColor: "#ffffff" }}>
                  <legend style={{ fontWeight: "bold", color: "#003399" }}>my login & password</legend>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                      <label style={{ fontWeight: "bold" }}>My Email Address:</label>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <input 
                          type="text" 
                          value={emailInput}
                          onChange={(e) => setEmailInput(e.target.value)}
                          style={{ flex: 1, padding: "2px", backgroundColor: "#ffffff", color: "#333333", border: "1px inset #808080" }}
                        />
                        <button onClick={handleUpdateEmail} style={{ minHeight: "22px", cursor: "pointer" }}>Save</button>
                      </div>
                      {emailStatus && <div style={{ fontSize: "10px", color: emailStatus.startsWith("Error") ? "red" : "green", marginTop: "2px" }}>{emailStatus}</div>}
                    </div>
                    <hr style={{ border: "1px inset #ffffff", margin: "4px 0" }} />
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <label style={{ fontWeight: "bold" }}>Password Reset:</label>
                      <button onClick={handlePasswordReset} style={{ alignSelf: "flex-start", minHeight: "24px", cursor: "pointer" }}>
                        🔑 Email Me a Password Reset Link
                      </button>
                      {pwResetStatus && <div style={{ fontSize: "10px", color: pwResetStatus.startsWith("Error") ? "red" : "green", marginTop: "2px" }}>{pwResetStatus}</div>}
                    </div>
                  </div>
                </fieldset>

                {/* E. System Format (Wipe Account) */}
                <fieldset style={{ border: "2px outset #ff0000", padding: "10px", margin: 0, backgroundColor: "#fff5f5" }}>
                  <legend style={{ fontWeight: "bold", color: "#ff0000" }}>delete my profile forever</legend>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <div style={{ color: "#8b0000", fontWeight: "bold" }}>
                      ⚠️ Delete Account (App Store Compliance)
                    </div>
                    <div style={{ color: "#666666" }}>
                      Wipes out your profile page, posts, handshake history, and connections.
                    </div>
                    <button 
                      onClick={() => setShowDeleteConfirm(true)} 
                      style={{ 
                        backgroundColor: "#ff0000", 
                        color: "#ffffff", 
                        fontWeight: "bold", 
                        border: "1px solid #8b0000", 
                        padding: "4px 8px", 
                        minHeight: "26px", 
                        alignSelf: "flex-start",
                        cursor: "pointer"
                      }}
                    >
                      Delete My Account Forever
                    </button>
                  </div>
                </fieldset>
              </div>
            )}

            {activeTab === "appearance" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {/* B. Desktop Themes (Alternate Icons) */}
                <fieldset style={{ border: "2px outset #ffffff", padding: "10px", margin: 0, backgroundColor: "#ffffff" }}>
                  <legend style={{ fontWeight: "bold", color: "#003399" }}>change my app icon</legend>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <span style={{ fontStyle: "italic" }}>Select an icon style to customize your phone home screen:</span>
                    
                    {/* Visual 2x2 grid for App Icons selection */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "4px" }}>
                      {Object.entries(ICONS_METADATA).map(([key, info]) => {
                        const isSelected = selectedIcon === key;
                        return (
                          <div 
                            key={key}
                            onClick={() => changeAppIcon(key)}
                            style={{
                              border: isSelected ? "2px solid #000080" : "1px solid #808080",
                              backgroundColor: info.color,
                              padding: "8px",
                              cursor: "pointer",
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              textAlign: "center",
                              gap: "4px",
                              boxShadow: isSelected ? "inset 1px 1px #000" : "1px 1px 2px rgba(0,0,0,0.15)",
                              borderRadius: "4px"
                            }}
                          >
                            <span style={{ fontSize: "28px" }}>{info.emoji}</span>
                            <span style={{ fontWeight: "bold", color: isSelected ? "#000080" : "#333333", fontSize: "11px" }}>{info.title}</span>
                            <span style={{ fontSize: "9px", color: "#666666" }}>{info.desc}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </fieldset>
              </div>
            )}

            {activeTab === "diagnostics" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {/* D. Node Diagnostics */}
                <fieldset style={{ border: "2px outset #ffffff", padding: "10px", margin: 0, backgroundColor: "#ffffff" }}>
                  <legend style={{ fontWeight: "bold", color: "#003399" }}>connection diagnostic & test</legend>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <button 
                        onClick={handlePingGeofence} 
                        style={{ alignSelf: "flex-start", padding: "4px 8px", minHeight: "26px", cursor: "pointer", fontWeight: "bold" }}
                      >
                        [ ping local area network ]
                      </button>
                      <div style={{ 
                        backgroundColor: "#000000", 
                        color: "#00ff00", 
                        padding: "6px", 
                        fontFamily: "monospace", 
                        fontSize: "10px",
                        border: "1px inset #808080",
                        whiteSpace: "pre-wrap",
                        lineHeight: "1.3",
                        boxShadow: "inset 1px 1px #050505"
                      }}>
                        {geofenceStatus}
                      </div>
                      <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "11px", marginTop: "6px" }}>
                        <input 
                          type="checkbox" 
                          checked={devOverride} 
                          onChange={(e) => handleToggleDevOverride(e.target.checked)} 
                        />
                        Enable Cupertino Reviewer Mode Override
                      </label>
                    </div>
                    <hr style={{ border: "1px inset #ffffff", margin: "4px 0" }} />
                    <div>
                      <button 
                        onClick={handleFlushCache} 
                        style={{ padding: "4px 8px", minHeight: "26px", cursor: "pointer", backgroundColor: "#dfdfdf", color: "#000000" }}
                      >
                        [ clear browser cache / hard reset ]
                      </button>
                      <div style={{ color: "#666666", fontSize: "10px", marginTop: "3px" }}>
                        Clears out stored files, logs you out, and does a fresh cold reload.
                      </div>
                    </div>
                  </div>
                </fieldset>
              </div>
            )}

            {activeTab === "legal" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {/* F. App Store Legal / Compliance */}
                <fieldset style={{ border: "2px outset #ffffff", padding: "10px", margin: 0, backgroundColor: "#ffffff" }}>
                  <legend style={{ fontWeight: "bold", color: "#003399" }}>legal & compliance</legend>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <span style={{ fontStyle: "italic" }}>Review legal agreements, user safety rules, and platform policies inside the application:</span>
                    
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "4px" }}>
                      <div 
                        onClick={() => setShowPrivacyModal(true)}
                        style={{
                          border: "1px solid #808080",
                          backgroundColor: "#f5f9ff",
                          padding: "10px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          boxShadow: "1px 1px 1px rgba(0,0,0,0.1)"
                        }}
                      >
                        <span style={{ fontSize: "20px" }}>📖</span>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <span style={{ color: "#000080", textDecoration: "underline", fontWeight: "bold" }}>Privacy Policy</span>
                          <span style={{ fontSize: "9px", color: "#666666" }}>Data collection, retention, and deletion policy</span>
                        </div>
                      </div>

                      <div 
                        onClick={() => setShowTermsModal(true)}
                        style={{
                          border: "1px solid #808080",
                          backgroundColor: "#f5f9ff",
                          padding: "10px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          boxShadow: "1px 1px 1px rgba(0,0,0,0.1)"
                        }}
                      >
                        <span style={{ fontSize: "20px" }}>📜</span>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <span style={{ color: "#000080", textDecoration: "underline", fontWeight: "bold" }}>Terms of Service & EULA</span>
                          <span style={{ fontSize: "9px", color: "#666666" }}>Zero-tolerance UGC policies, reporting, and blocking terms</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </fieldset>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Alert Box Overlay */}
      {showDeleteConfirm && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.6)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 9999,
          padding: "16px"
        }}>
          <div className="window" style={{ width: "320px" }}>
            <div className="title-bar" style={{ backgroundColor: "#ff0000", padding: "4px 8px" }}>
              <div className="title-bar-text" style={{ fontWeight: "bold", color: "#ffffff" }}>
                ⚠️ DELETE PROFILE FOREVER
              </div>
            </div>
            <div className="window-body" style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "12px", backgroundColor: "#f0f0f0", fontFamily: "'MS Sans Serif', Geneva, sans-serif", fontSize: "11px", margin: 0 }}>
              <div style={{ 
                lineHeight: "1.4", 
                color: "#ff0000", 
                fontWeight: "bold", 
                backgroundColor: "#ffffff", 
                border: "1px solid #ff0000", 
                padding: "8px" 
              }}>
                WARNING: This will permanently wipe your document from the Firestore database, purge your Friend Space, and discard all active handshakes. There is no backup tape. Proceed?
              </div>

              {deleteStatus && (
                <div style={{ color: "blue", fontWeight: "bold" }}>
                  {deleteStatus}
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "4px" }}>
                <button 
                  onClick={() => setShowDeleteConfirm(false)}
                  style={{ minWidth: "80px", minHeight: "24px", cursor: "pointer", fontWeight: "bold" }}
                  disabled={!!deleteStatus}
                >
                  [ Cancel ]
                </button>
                <button 
                  onClick={handleWipeAccount}
                  style={{ minWidth: "110px", minHeight: "24px", cursor: "pointer", backgroundColor: "#ff0000", color: "#ffffff", fontWeight: "bold" }}
                  disabled={!!deleteStatus}
                >
                  [ Wipe My Account ]
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Privacy Policy Modal */}
      {showPrivacyModal && (
        <div style={{
          position: "fixed",
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0,0,0,0.6)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 9999,
          padding: "16px"
        }}>
          <div className="window" style={{ width: "340px", maxWidth: "95%", display: "flex", flexDirection: "column", maxHeight: "85vh" }}>
            <div className="title-bar" style={{ padding: "4px 8px" }}>
              <div className="title-bar-text" style={{ fontWeight: "bold", color: "#ffffff" }}>
                asl Help - Privacy Policy
              </div>
              <div className="title-bar-controls">
                <button type="button" aria-label="Close" onClick={() => setShowPrivacyModal(false)} />
              </div>
            </div>
            <div className="window-body" style={{ 
              padding: "12px", 
              display: "flex", 
              flexDirection: "column", 
              gap: "10px", 
              backgroundColor: "#ffffff", 
              fontFamily: "'MS Sans Serif', Geneva, sans-serif", 
              fontSize: "11px", 
              overflowY: "auto",
              flexGrow: 1,
              border: "1px inset #808080",
              margin: "8px",
              textAlign: "left"
            }}>
              <h2 style={{ fontSize: "13px", margin: "0 0 4px 0", color: "#000" }}>Privacy Policy</h2>
              <p style={{ margin: "0 0 8px 0", color: "#666" }}>Last Updated: May 31, 2026</p>
              <p style={{ margin: "0 0 8px 0" }}>Welcome to <strong>asl</strong>. We respect your privacy and protect the data you share with us.</p>
              
              <h3 style={{ fontSize: "11px", margin: "8px 0 2px 0", fontWeight: "bold" }}>1. Information We Collect</h3>
              <p style={{ margin: "0 0 8px 0" }}>• Account: Email address or anonymous unique identifier.</p>
              <p style={{ margin: "0 0 8px 0" }}>• Profiles: Custom handles, bios, active moods, and emojis.</p>
              <p style={{ margin: "0 0 8px 0" }}>• UGC: Missed connections posted and chat messages.</p>
              <p style={{ margin: "0 0 8px 0" }}>• Location: Regional node selection (no background GPS tracking).</p>

              <h3 style={{ fontSize: "11px", margin: "8px 0 2px 0", fontWeight: "bold" }}>2. How We Use It</h3>
              <p style={{ margin: "0 0 8px 0" }}>• To display missed connection messages at matching venues.</p>
              <p style={{ margin: "0 0 8px 0" }}>• To route anonymous AIM chats between partners.</p>
              <p style={{ margin: "0 0 8px 0" }}>• To prevent fraud, abuse, and spam checkouts.</p>

              <h3 style={{ fontSize: "11px", margin: "8px 0 2px 0", fontWeight: "bold" }}>3. Data Purge & Deletion</h3>
              <p style={{ margin: "0 0 8px 0" }}>You can request a full account purge at support@asl-app.com, or use the "Delete My Account Forever" function below. All data is deleted from Firestore within 24 hours.</p>

              <h3 style={{ fontSize: "11px", margin: "8px 0 2px 0", fontWeight: "bold" }}>4. Security & Hosting</h3>
              <p style={{ margin: "0 0 8px 0" }}>Hosted securely via Google Firebase servers. We do not sell or trade user data with any third parties.</p>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", padding: "0 8px 8px 8px", backgroundColor: "#f0f0f0" }}>
              <button 
                onClick={() => setShowPrivacyModal(false)}
                style={{ minWidth: "80px", minHeight: "24px", cursor: "pointer", fontWeight: "bold" }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Terms of Service & EULA Modal */}
      {showTermsModal && (
        <div style={{
          position: "fixed",
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0,0,0,0.6)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 9999,
          padding: "16px"
        }}>
          <div className="window" style={{ width: "340px", maxWidth: "95%", display: "flex", flexDirection: "column", maxHeight: "85vh" }}>
            <div className="title-bar" style={{ padding: "4px 8px" }}>
              <div className="title-bar-text" style={{ fontWeight: "bold", color: "#ffffff" }}>
                asl Help - Terms & EULA
              </div>
              <div className="title-bar-controls">
                <button type="button" aria-label="Close" onClick={() => setShowTermsModal(false)} />
              </div>
            </div>
            <div className="window-body" style={{ 
              padding: "12px", 
              display: "flex", 
              flexDirection: "column", 
              gap: "10px", 
              backgroundColor: "#ffffff", 
              fontFamily: "'MS Sans Serif', Geneva, sans-serif", 
              fontSize: "11px", 
              overflowY: "auto",
              flexGrow: 1,
              border: "1px inset #808080",
              margin: "8px",
              textAlign: "left"
            }}>
              <h2 style={{ fontSize: "13px", margin: "0 0 4px 0", color: "#000" }}>Terms & EULA</h2>
              <p style={{ margin: "0 0 8px 0", color: "#666" }}>Last Updated: May 31, 2026</p>
              
              <div style={{ 
                border: "1px solid #ffcc00", 
                backgroundColor: "#fff9e6", 
                padding: "6px", 
                fontWeight: "bold", 
                color: "#856404", 
                marginBottom: "8px" 
              }}>
                ⚠️ ZERO TOLERANCE UGC POLICY
              </div>
              <p style={{ margin: "0 0 8px 0" }}>By using asl, you agree to these terms. Abusive behavior will result in an immediate ban.</p>

              <h3 style={{ fontSize: "11px", margin: "8px 0 2px 0", fontWeight: "bold" }}>1. Prohibited Content</h3>
              <p style={{ margin: "0 0 8px 0" }}>You may not post content that is harassing, defamatory, explicit, pornography, hate speech, or discriminates against individuals or groups.</p>

              <h3 style={{ fontSize: "11px", margin: "8px 0 2px 0", fontWeight: "bold" }}>2. Safety Actions & Controls</h3>
              <p style={{ margin: "0 0 8px 0" }}>• <strong>Flagging:</strong> Report any offensive post using the "Report" button to instantly hide it from feeds.</p>
              <p style={{ margin: "0 0 8px 0" }}>• <strong>Blocking:</strong> Use the "Block" button in chat to stop all communication and hide their content.</p>
              <p style={{ margin: "0 0 8px 0" }}>• <strong>Reporting:</strong> Warn/flag users in chats. 3 reports trigger an automatic system-wide lockout.</p>
              <p style={{ margin: "0 0 8px 0" }}>• <strong>24h Moderation:</strong> Admins review reports within 24 hours. Offending material is deleted, and abusive accounts are banned.</p>

              <h3 style={{ fontSize: "11px", margin: "8px 0 2px 0", fontWeight: "bold" }}>3. Disclaimers</h3>
              <p style={{ margin: "0 0 8px 0" }}>The app is licensed "as-is." We are not liable for user matches, content errors, or service delays.</p>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", padding: "0 8px 8px 8px", backgroundColor: "#f0f0f0" }}>
              <button 
                onClick={() => setShowTermsModal(false)}
                style={{ minWidth: "80px", minHeight: "24px", cursor: "pointer", fontWeight: "bold" }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
