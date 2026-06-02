import { useState, useEffect, useRef } from "react";
import TitleBar from "./TitleBar";
import MySpaceMusicPlayer from "./MySpaceMusicPlayer";
import { dbGetDoc, dbUpdateDoc, dbSubmitReport } from "../firebase";
import { Share } from "@capacitor/share";
import { isIAPSupported, fetchProductDetails, purchaseProduct, restorePurchases } from "../services/iap";

const extractSpotifyTrackId = (input) => {
  const trimmed = input.trim();
  if (!trimmed) return "";

  const urlPattern = /open\.spotify\.com\/(?:[a-zA-Z-]+\/)?track\/([a-zA-Z0-9]{22})/;
  const uriPattern = /spotify:track:([a-zA-Z0-9]{22})/;
  const rawPattern = /^[a-zA-Z0-9]{22}$/;

  const urlMatch = trimmed.match(urlPattern);
  if (urlMatch) return urlMatch[1];

  const uriMatch = trimmed.match(uriPattern);
  if (uriMatch) return uriMatch[1];

  const rawMatch = trimmed.match(rawPattern);
  if (rawMatch) return rawMatch[0];

  return null;
};


const EMOJI_PRESETS = [
  // Faces & People
  "😀", "😎", "😍", "🤩", "😏", "😒", "😔", "😭", "😤", "😠",
  "😡", "🤬", "😱", "😨", "🤯", "🥴", "😴", "🤪", "😑", "😐",
  "🙄", "🥺", "😢", "😂", "🤣", "😆", "😋", "😛", "🤤", "😇",
  "🤓", "🤡", "👻", "💀", "🤖", "👽", "🎃", "🦊", "🐱", "🐶",
  "🐸", "🐼", "🦁", "🐯", "🐻", "🐺", "🦄", "🐉", "🦋", "🐝",
  // Hearts & Love
  "💖", "💗", "💘", "💝", "💓", "💞", "💕", "❤️", "🧡", "💛",
  "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❣️", "💟", "♥️",
  // Objects & Activities
  "🥃", "🍹", "🍻", "🥂", "🍺", "🍷", "🍸", "🧃", "☕", "🧋",
  "🍕", "🍔", "🌮", "🍜", "🍣", "🍩", "🍦", "🎂", "🍫", "🍬",
  "🎸", "🎤", "🎧", "🎵", "🎶", "🎹", "🥁", "🎷", "🎺", "🎻",
  "🎮", "👾", "🕹️", "🎯", "🎱", "🃏", "🎲", "♟️", "🧩", "🎰",
  "📟", "💾", "💿", "📼", "📺", "📻", "☎️", "📡", "🖥️", "⌨️",
  "📱", "📷", "🎥", "📽️", "🎞️", "🔍", "🔭", "🧪", "🔬", "💊",
  // Nature & Weather
  "🌧️", "⛈️", "🌈", "☀️", "🌙", "⭐", "🌟", "✨", "❄️", "🔥",
  "💧", "🌊", "🌵", "🌴", "🌸", "🌺", "🌻", "🍀", "🍁", "🌾",
  // Symbols & Misc
  "⚡", "💥", "🎉", "🎈", "🎀", "🏆", "🥇", "🎖️", "🏅", "🚀",
  "✊", "👊", "✌️", "🤘", "🤞", "👌", "👍", "🖤", "🎨", "📖",
  "💎", "👑", "🗡️", "🛹", "🏍️", "🌆", "🌃", "🌉", "🌌", "🌠",
  // Classic retro / nostalgic
  "👥", "🕵️", "📠", "🏃‍♂️", "💰", "💡", "📟", "💾", "📼", "🔌",
  "🧲", "💣", "🔫", "🃏", "🚬", "🎠", "🎡", "🎢", "🎪", "🎭"
];

export default function MySpaceProfileDialog({ 
  username, 
  mood, 
  bio, 
  profileTheme = "classic", 
  emoji_avatar = "👥🥃💖",
  spotify_track_uri = "spotify:track:4PTG3Z6ehGkBF3zI7YSp6g",
  spotify_song_title = "",
  spotify_artist_name = "",
  headline = "Everyone's favorite dial-up partner",
  onClose,
  onOpenChat,
  userId,
  currentUserId,
  currentUserDoc,
  onSaveProfile,
  unlockedThemes = [],
  favorited_bars = [],
  venues = [],
  onSelectVenue,
  acceptedConnections = [],
  onOpenProfile,
  lastActiveAt
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editUsername, setEditUsername] = useState(username);

  const bodyRef = useRef(null);

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = 0;
    }
    window.scrollTo(0, 0);
  }, [userId]);

  const isAdmin = currentUserDoc?.isAdmin || false;

  const isUserOnline = () => {
    if (userId === currentUserId) return true;
    if (!lastActiveAt) return false;
    const activeThreshold = 5 * 60 * 1000; // 5 minutes
    return (Date.now() - lastActiveAt) < activeThreshold;
  };

  const getStatusText = () => {
    if (isUserOnline()) return "Online 📡";
    if (!lastActiveAt) return "Offline 💤";
    const diffMs = Date.now() - lastActiveAt;
    const diffMins = Math.floor(diffMs / (60 * 1000));
    if (diffMins < 60) {
      return `Offline 💤 (active ${diffMins}m ago)`;
    }
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) {
      return `Offline 💤 (active ${diffHours}h ago)`;
    }
    const diffDays = Math.floor(diffHours / 24);
    return `Offline 💤 (active ${diffDays}d ago)`;
  };

  const [editMood, setEditMood] = useState(mood);
  const [editBio, setEditBio] = useState(bio);
  const [editProfileTheme, setEditProfileTheme] = useState(profileTheme);
  const [editEmojiAvatar, setEditEmojiAvatar] = useState(emoji_avatar);
  const [editSpotifyTrackUri, setEditSpotifyTrackUri] = useState(spotify_track_uri);
  const [editSpotifySongTitle, setEditSpotifySongTitle] = useState(spotify_song_title);
  const [editSpotifyArtistName, setEditSpotifyArtistName] = useState(spotify_artist_name);
  const [editHeadline, setEditHeadline] = useState(headline);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [profileError, setProfileError] = useState("");

  const handleShareProfile = async () => {
    const shareText = `Check out ${username}'s profile on asl! Add them to your Top 8!`;
    const shareUrl = `asl://profile/${userId}`;
    
    try {
      const canShareResult = await Share.canShare();
      if (canShareResult && canShareResult.value) {
        await Share.share({
          title: `asl profile: ${username}`,
          text: shareText,
          url: shareUrl,
          dialogTitle: `Share ${username}'s profile`
        });
      } else {
        navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
        alert("Link copied to clipboard!");
      }
    } catch (err) {
      console.warn("Sharing failed, falling back to clipboard:", err);
      try {
        navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
        alert("Link copied to clipboard!");
      } catch (clipErr) {
        console.error("Clipboard copy failed:", clipErr);
        alert("Could not share or copy link.");
      }
    }
  };
  const [friendProfiles, setFriendProfiles] = useState({});



  // IAP Simulation states
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutProduct, setCheckoutProduct] = useState(null);
  const [checkoutStep, setCheckoutStep] = useState("idle");
  const [checkoutStatusText, setCheckoutStatusText] = useState("");
  const [restoring, setRestoring] = useState(false);

  const ownedThemes = unlockedThemes && unlockedThemes.length ? unlockedThemes : ["classic", "glitter", "cyberpunk", "sunset", "goth", "gameboy"];

  const isThemeUnlocked = (themeName) => {
    const freeThemes = ["classic", "glitter", "cyberpunk", "sunset", "goth", "gameboy"];
    if (freeThemes.includes(themeName)) return true;
    return ownedThemes.includes(themeName);
  };

  const handleSimulatePurchase = async () => {
    setCheckoutStep("processing");
    setCheckoutStatusText("CONNECTING TO APPLE APP STORE...");
    
    try {
      const result = await purchaseProduct(checkoutProduct.id);
      if (result.success) {
        setCheckoutStatusText("VERIFYING PURCHASE RECEIPT...");
        await new Promise(resolve => setTimeout(resolve, 800));
        
        if (onSaveProfile) {
          let themesToUnlock = [];
          switch (checkoutProduct.id) {
            case "cozy_pack":
              themesToUnlock = ["animal-crossing", "spirited-away", "matcha-tea"];
              break;
            case "badbitch_pack":
              themesToUnlock = ["8-ball", "long-nails", "sheer"];
              break;
            case "weeb_pack":
              themesToUnlock = ["one-piece", "demon-slayer", "jujutsu-kaisen"];
              break;
            case "screamo_pack":
              themesToUnlock = ["vampire-romance", "sunday-showdown", "quiet-things"];
              break;
            case "teen_idol_pack":
              themesToUnlock = ["oops-pink", "frosted-tips", "wannabe-leopard"];
              break;
            case "skateland_punk_pack":
              themesToUnlock = ["sk8er-boi", "rock-show-182", "boulevard-stencil"];
              break;
            case "file_share_pack":
              themesToUnlock = ["lemonwire", "napster-kitty", "winamp-classic"];
              break;
            case "socialite_gossip_pack":
              themesToUnlock = ["simple-life", "metallic-razr", "gossip-blog"];
              break;
            default:
              themesToUnlock = [];
          }
          const updatedUnlocked = [
            ...new Set([...ownedThemes, ...themesToUnlock])
          ];
          await onSaveProfile(currentUserId, {
            unlockedThemes: updatedUnlocked
          });
        }
        setCheckoutStep("success");
      } else {
        alert("Purchase Failed: " + (result.error || "User cancelled or transaction error."));
        setCheckoutStep("idle");
        setShowCheckoutModal(false);
      }
    } catch (err) {
      console.error("Purchase failed:", err);
      alert("Billing Gateway Error. Please try again.");
      setCheckoutStep("idle");
      setShowCheckoutModal(false);
    }
  };

  const handleRestorePurchases = async () => {
    setRestoring(true);
    try {
      const restoredIds = await restorePurchases();
      if (restoredIds.length > 0) {
        let themesToUnlock = [];
        if (restoredIds.includes("cozy_pack")) {
          themesToUnlock.push("animal-crossing", "spirited-away", "matcha-tea");
        }
        if (restoredIds.includes("badbitch_pack")) {
          themesToUnlock.push("8-ball", "long-nails", "sheer");
        }
        if (restoredIds.includes("weeb_pack")) {
          themesToUnlock.push("one-piece", "demon-slayer", "jujutsu-kaisen");
        }
        if (restoredIds.includes("screamo_pack")) {
          themesToUnlock.push("vampire-romance", "sunday-showdown", "quiet-things");
        }
        if (restoredIds.includes("teen_idol_pack")) {
          themesToUnlock.push("oops-pink", "frosted-tips", "wannabe-leopard");
        }
        if (restoredIds.includes("skateland_punk_pack")) {
          themesToUnlock.push("sk8er-boi", "rock-show-182", "boulevard-stencil");
        }
        if (restoredIds.includes("file_share_pack")) {
          themesToUnlock.push("lemonwire", "napster-kitty", "winamp-classic");
        }
        if (restoredIds.includes("socialite_gossip_pack")) {
          themesToUnlock.push("simple-life", "metallic-razr", "gossip-blog");
        }
        
        if (themesToUnlock.length > 0 && onSaveProfile) {
          const updatedUnlocked = [
            ...new Set([...ownedThemes, ...themesToUnlock])
          ];
          await onSaveProfile(currentUserId, {
            unlockedThemes: updatedUnlocked
          });
          alert("Success: Restored " + restoredIds.length + " package(s) and credited themes to your profile!");
        } else {
          alert("Restore Complete: No previous theme pack purchases found on your App Store account.");
        }
      } else {
        alert("Restore Complete: No previous theme pack purchases found on this device.");
      }
    } catch (err) {
      console.error("Restore failed:", err);
      alert("Failed to restore purchases: " + err.message);
    } finally {
      setRestoring(false);
    }
  };

  const handleCloseSuccess = () => {
    setShowCheckoutModal(false);
    if (checkoutProduct && checkoutProduct.targetTheme) {
      setEditProfileTheme(checkoutProduct.targetTheme);
    }
  };

  const favoritedVenueList = (favorited_bars || []).map(id => {
    return (venues || []).find(v => v.fsq_id === id);
  }).filter(Boolean);

  // Load display profiles for accepted connections
  useEffect(() => {
    if (!acceptedConnections || acceptedConnections.length === 0) return;
    acceptedConnections.forEach(async (conn) => {
      const friendId = conn.userId;
      if (friendProfiles[friendId]) return;
      try {
        const snap = await dbGetDoc("profiles", friendId);
        if (snap.exists()) {
          setFriendProfiles(prev => ({ ...prev, [friendId]: snap.data() }));
        }
      } catch {
        // silently ignore
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acceptedConnections]);

  const handleSendMessage = () => {
    if (onOpenChat) {
      onOpenChat(null, {
        id: `connection_${userId}`,
        senderId: userId,
        receiverId: "me",
        proofText: `Starting profile chat with ${username}...`,
        status: "accepted",
        venueName: "asl Profile Link",
        postText: "Connecting from profile"
      });
      onClose();
    }
  };

  const handleReportUser = async () => {
    const confirmFlag = window.confirm(
      "Report User:\nAre you sure you want to flag this user for safety policy violations? 3 unique reports will result in an immediate system ban."
    );
    if (!confirmFlag) return;

    // UX pre-flight: must have a connection before reporting (enforced server-side too)
    const hasInteraction = acceptedConnections.some(conn => conn.userId === userId);
    if (!hasInteraction) {
      alert("Report could not be submitted. You must have an active chat connection/interaction with this user first before you can file a report.");
      return;
    }

    try {
      await dbSubmitReport({ targetUserId: userId, reason: "policy_violation" });
      alert("Report submitted. Safety team has been notified.");
    } catch (err) {
      const code = err?.code || "";
      if (code === "functions/already-exists") {
        alert("You have already reported this user. No further action is needed — our team has been notified.");
      } else if (code === "functions/resource-exhausted") {
        alert("Daily Report Limit Reached: You can only file 3 reports per day. Try again tomorrow.");
      } else if (code === "functions/failed-precondition") {
        alert("Report could not be submitted. Your account does not meet the minimum requirements to file a report.");
      } else if (code === "functions/unauthenticated") {
        alert("You must be signed in with a registered account to report users.");
      } else {
        console.error("Error flagging user:", err);
        alert("Failed to submit report. Please try again.");
      }
    }
  };

  const handleAddEmoji = (em) => {
    const current = Array.from(editEmojiAvatar);
    if (current.length < 3) {
      setEditEmojiAvatar(current.concat(em).join(""));
    }
  };

  const handleRemoveEmojiAtIndex = (index) => {
    const current = Array.from(editEmojiAvatar);
    current.splice(index, 1);
    setEditEmojiAvatar(current.join(""));
  };

  const handleSave = () => {
    if (!editUsername.trim()) {
      alert("Display name cannot be empty.");
      return;
    }
    if (editUsername.length > 25) {
      alert("Display name must be 25 characters or less.");
      return;
    }
    if (editHeadline.length > 100) {
      alert("Tagline must be 100 characters or less.");
      return;
    }
    // Tagline must be plain text — no URLs, emails, markdown links, or @handles
    const headlineHasBadContent =
      /https?:\/\//i.test(editHeadline) ||          // http:// or https://
      /www\./i.test(editHeadline) ||                 // www. links
      /\S+@\S+\.\S+/.test(editHeadline) ||           // email addresses
      /\[.+\]\(.+\)/.test(editHeadline) ||           // markdown links [text](url)
      /(?:^|\s)@\S+/.test(editHeadline);             // @handle mentions
    if (headlineHasBadContent) {
      alert("Tagline cannot contain URLs, email addresses, links, or @mentions. Keep it plain text.");
      return;
    }
    if (editBio.length > 500) {
      alert("Biography must be 500 characters or less.");
      return;
    }
    if (Array.from(editEmojiAvatar).length !== 3) {
      alert("Please select exactly 3 emojis for your avatar.");
      return;
    }

    let formattedSpotifyTrackUri = "";
    if (editSpotifyTrackUri.trim() !== "") {
      const trackId = extractSpotifyTrackId(editSpotifyTrackUri);
      if (!trackId) {
        setProfileError("SYSTEM ERROR: INVALID SPOTIFY AUDIO IDENTIFIER. TRACK ID MUST BE A 22-CHARACTER ALPHANUMERIC STRING.");
        return;
      }
      formattedSpotifyTrackUri = `spotify:track:${trackId}`;
    }

    if (onSaveProfile) {
      onSaveProfile(userId, {
        username: editUsername,
        mood: editMood,
        bio: editBio,
        profileTheme: editProfileTheme,
        emoji_avatar: editEmojiAvatar,
        spotify_track_uri: formattedSpotifyTrackUri,
        spotify_song_title: editSpotifySongTitle,
        spotify_artist_name: editSpotifyArtistName,
        headline: editHeadline
      });
      setIsEditing(false);
      setProfileError("");
    }
  };

  const getThemeClass = () => {
    const val = isEditing ? editProfileTheme : profileTheme;
    if (!val) return "myspace-theme-classic";
    return "myspace-theme-" + val.replace(/-/g, "");
  };

  return (
    <div className={`window ${getThemeClass()}`} style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
      <TitleBar title={`asl - ${isEditing ? "Editing Profile" : `${username}'s Profile`}`} onClose={onClose} />
      
      <div ref={bodyRef} className="window-body myspace-profile-body" style={{ flex: 1, overflowY: "auto", padding: "12px", margin: 0 }}>
        
        {/* Top Header Card */}
        <div className="profile-top-section">
          {isEditing ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "2px", width: "100%" }}>
                <label style={{ fontSize: "11px", fontWeight: "bold" }}>Display Name:</label>
                <input 
                  type="text" 
                  value={editUsername} 
                  onChange={(e) => setEditUsername(e.target.value)} 
                  style={{ width: "100%", fontSize: "16px", padding: "4px" }}
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "2px", width: "100%" }}>
                <label style={{ fontSize: "11px", fontWeight: "bold" }}>Tagline (Headline):</label>
                <input 
                  type="text" 
                  value={editHeadline} 
                  onChange={(e) => setEditHeadline(e.target.value)} 
                  style={{ width: "100%", fontSize: "14px", padding: "4px" }}
                  placeholder="e.g. Everyone's favorite dial-up partner"
                />
              </div>
            </div>
          ) : (
            <>
              <h2 className="profile-name-header" style={{ margin: "0 0 4px 0", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", fontSize: "26px", fontWeight: "bold" }}>
                <span>{username}</span>
                <span style={{ fontSize: "26px" }}>{emoji_avatar || "👥🥃💖"}</span>
              </h2>
              <p className="profile-headline">"{headline || "Everyone's favorite dial-up partner"}"</p>
            </>
          )}
        </div>

        <div className="profile-main-grid">
          {/* Left Column: Avatar & Bio */}
          <div className="profile-left-col">

            {/* Emoji Avatar Customizer — edit mode only */}
            {isEditing && (
              <div className="profile-edit-card" style={{ marginBottom: "8px" }}>
                <div style={{ fontSize: "11px", fontWeight: "bold", marginBottom: "6px", color: "inherit" }}>Customize Avatar (pick exactly 3):</div>
                
                {/* Currently selected emojis */}
                <div style={{ display: "flex", gap: "6px", marginBottom: "8px", minHeight: "48px", alignItems: "center" }}>
                  {Array.from(editEmojiAvatar).map((em, idx) => (
                    <span 
                      key={idx} 
                      onClick={() => handleRemoveEmojiAtIndex(idx)}
                      className="selected-emoji-btn"
                      style={{ fontSize: "36px" }}
                      title="Click to remove"
                    >
                      {em}
                    </span>
                  ))}
                  {Array.from(editEmojiAvatar).length === 0 && (
                    <span style={{ fontSize: "12px", color: "#888", fontStyle: "italic" }}>Click emojis below to select up to 3</span>
                  )}
                  {Array.from(editEmojiAvatar).length > 0 && Array.from(editEmojiAvatar).length < 3 && (
                    <span style={{ fontSize: "12px", color: "#666" }}>({3 - Array.from(editEmojiAvatar).length} more needed)</span>
                  )}
                </div>

                {/* Large emoji presets grid */}
                <div className="emoji-presets-grid">
                  {EMOJI_PRESETS.map((em, i) => (
                    <span 
                      key={`${em}-${i}`}
                      onClick={() => handleAddEmoji(em)}
                      style={{ 
                        fontSize: "22px", 
                        cursor: "pointer", 
                        textAlign: "center", 
                        padding: "3px", 
                        borderRadius: "2px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        userSelect: "none"
                      }}
                      title={em}
                    >
                      {em}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className={`profile-details-table ${isEditing ? "profile-edit-card" : ""}`} style={{ padding: "6px" }}>
              {isEditing ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "4px", margin: "4px 0" }}>
                  <label style={{ fontSize: "11px", fontWeight: "bold", color: "inherit" }}>Mood:</label>
                  <select 
                    value={editMood} 
                    onChange={(e) => setEditMood(e.target.value)} 
                    style={{ width: "100%", padding: "2px" }}
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
              ) : (
                <p><strong>Mood:</strong> {mood || "Chillin' 😎"}</p>
              )}
              <p>
                <strong>Status:</strong>{" "}
                <span style={{ color: isUserOnline() ? "#00ff66" : "#aaaaaa", fontWeight: "bold" }}>
                  {getStatusText()}
                </span>
              </p>
              <p><strong>Region:</strong> Phoenix Area</p>
            </div>

            {!isEditing && (
              <MySpaceMusicPlayer 
                key={spotify_track_uri}
                spotifyTrackUri={spotify_track_uri} 
                spotifySongTitle={spotify_song_title}
                spotifyArtistName={spotify_artist_name}
              />
            )}

            {/* Custom Theme Selector (only visible in edit mode) */}
            {isEditing && (
              <>
                <div className="profile-edit-card" style={{ display: "flex", flexDirection: "column", gap: "2px", margin: "4px 0" }}>
                  <label style={{ fontSize: "11px", fontWeight: "bold", color: "inherit" }}>Profile Theme:</label>
                  <select 
                    value={editProfileTheme} 
                    onChange={(e) => {
                      const selectedTheme = e.target.value;
                      if (!isThemeUnlocked(selectedTheme) && userId === currentUserId) {
                        const cozyThemes = ["animal-crossing", "spirited-away", "matcha-tea"];
                        const badBitchThemes = ["8-ball", "long-nails", "sheer"];
                        const screamoThemes = ["vampire-romance", "sunday-showdown", "quiet-things"];
                        const teenIdolThemes = ["oops-pink", "frosted-tips", "wannabe-leopard"];
                        const skatelandThemes = ["sk8er-boi", "rock-show-182", "boulevard-stencil"];
                        const fileShareThemes = ["lemonwire", "napster-kitty", "winamp-classic"];
                        const socialiteThemes = ["simple-life", "metallic-razr", "gossip-blog"];

                        const isCozy = cozyThemes.includes(selectedTheme);
                        const isBadBitch = badBitchThemes.includes(selectedTheme);
                        const isScreamo = screamoThemes.includes(selectedTheme);
                        const isTeenIdol = teenIdolThemes.includes(selectedTheme);
                        const isSkateland = skatelandThemes.includes(selectedTheme);
                        const isFileShare = fileShareThemes.includes(selectedTheme);
                        const isSocialite = socialiteThemes.includes(selectedTheme);

                        const packId = isCozy ? "cozy_pack" 
                                     : isBadBitch ? "badbitch_pack" 
                                     : isScreamo ? "screamo_pack" 
                                     : isTeenIdol ? "teen_idol_pack" 
                                     : isSkateland ? "skateland_punk_pack" 
                                     : isFileShare ? "file_share_pack" 
                                     : isSocialite ? "socialite_gossip_pack" 
                                     : "weeb_pack";

                        const packName = isCozy ? "Cozy Village Theme Bundle" 
                                       : isBadBitch ? "Y2K Glam Theme Bundle" 
                                       : isScreamo ? "Mall Goth / Screamo Theme Bundle" 
                                       : isTeenIdol ? "Teen Idol Theme Bundle" 
                                       : isSkateland ? "Skateland Punk Theme Bundle" 
                                       : isFileShare ? "P2P File Share Theme Bundle" 
                                       : isSocialite ? "Socialite Gossip Theme Bundle" 
                                       : "Otaku Legends Theme Bundle";

                        const packThemes = isCozy ? cozyThemes 
                                         : isBadBitch ? badBitchThemes 
                                         : isScreamo ? screamoThemes 
                                         : isTeenIdol ? teenIdolThemes 
                                         : isSkateland ? skatelandThemes 
                                         : isFileShare ? fileShareThemes 
                                         : isSocialite ? socialiteThemes 
                                         : ["one-piece", "demon-slayer", "jujutsu-kaisen"];
                        
                        setCheckoutProduct({ id: packId, name: packName, cost: "$1.99", themes: packThemes, targetTheme: selectedTheme });
                        setCheckoutStep("idle");
                        setShowCheckoutModal(true);
                        
                        fetchProductDetails([packId]).then(products => {
                          const prod = products.find(p => p.productIdentifier === packId);
                          if (prod) {
                            setCheckoutProduct(prev => prev ? { ...prev, cost: prod.price, name: prod.title } : null);
                          }
                        }).catch(err => console.log("Failed loading real IAP metadata:", err));
                      } else {
                        setEditProfileTheme(selectedTheme);
                      }
                    }}
                    style={{ width: "100%", padding: "2px" }}
                  >
                    <option value="classic">Classic (Blue/Pink)</option>
                    <option value="glitter">Glitter 💖</option>
                    <option value="cyberpunk">Cyberpunk 🟢</option>
                    <option value="sunset">Sunset 🌅</option>
                    <option value="goth">Goth 🖤</option>
                    <option value="gameboy">Gameboy 🎮</option>
                    <option value="one-piece">
                      {isThemeUnlocked("one-piece") ? "Straw Hat Pirate ⚓" : "Straw Hat Pirate ⚓ (🔒 Otaku Legends Pack - $1.99)"}
                    </option>
                    <option value="demon-slayer">
                      {isThemeUnlocked("demon-slayer") ? "Slayer Blade ⚔️" : "Slayer Blade ⚔️ (🔒 Otaku Legends Pack - $1.99)"}
                    </option>
                    <option value="jujutsu-kaisen">
                      {isThemeUnlocked("jujutsu-kaisen") ? "Sorcery Curse 💀" : "Sorcery Curse 💀 (🔒 Otaku Legends Pack - $1.99)"}
                    </option>
                    <option value="animal-crossing">
                      {isThemeUnlocked("animal-crossing") ? "Pocket Crossing 🍃" : "Pocket Crossing 🍃 (🔒 Cozy Village Pack - $1.99)"}
                    </option>
                    <option value="spirited-away">
                      {isThemeUnlocked("spirited-away") ? "Spirit Bathhouse 🏮" : "Spirit Bathhouse 🏮 (🔒 Cozy Village Pack - $1.99)"}
                    </option>
                    <option value="matcha-tea">
                      {isThemeUnlocked("matcha-tea") ? "Matcha Tea 🍵" : "Matcha Tea 🍵 (🔒 Cozy Village Pack - $1.99)"}
                    </option>
                    <option value="8-ball">
                      {isThemeUnlocked("8-ball") ? "8-Ball 🎱" : "8-Ball 🎱 (🔒 Y2K Glam Pack - $1.99)"}
                    </option>
                    <option value="long-nails">
                      {isThemeUnlocked("long-nails") ? "Long Nails 💅" : "Long Nails 💅 (🔒 Y2K Glam Pack - $1.99)"}
                    </option>
                    <option value="sheer">
                      {isThemeUnlocked("sheer") ? "Sheer ✨" : "Sheer ✨ (🔒 Y2K Glam Pack - $1.99)"}
                    </option>
                    <option value="vampire-romance">
                      {isThemeUnlocked("vampire-romance") ? "Vampire Romance 🦇" : "Vampire Romance 🦇 (🔒 Mall Goth Pack - $1.99)"}
                    </option>
                    <option value="sunday-showdown">
                      {isThemeUnlocked("sunday-showdown") ? "Sunday Showdown 🎤" : "Sunday Showdown 🎤 (🔒 Mall Goth Pack - $1.99)"}
                    </option>
                    <option value="quiet-things">
                      {isThemeUnlocked("quiet-things") ? "Quiet Things 🎧" : "Quiet Things 🎧 (🔒 Mall Goth Pack - $1.99)"}
                    </option>
                    <option value="oops-pink">
                      {isThemeUnlocked("oops-pink") ? "Oops Pink 🎀" : "Oops Pink 🎀 (🔒 Teen Idol Pack - $1.99)"}
                    </option>
                    <option value="frosted-tips">
                      {isThemeUnlocked("frosted-tips") ? "Frosted Tips ⭐" : "Frosted Tips ⭐ (🔒 Teen Idol Pack - $1.99)"}
                    </option>
                    <option value="wannabe-leopard">
                      {isThemeUnlocked("wannabe-leopard") ? "Wannabe Leopard 🐆" : "Wannabe Leopard 🐆 (🔒 Teen Idol Pack - $1.99)"}
                    </option>
                    <option value="sk8er-boi">
                      {isThemeUnlocked("sk8er-boi") ? "Sk8er Boi 🛹" : "Sk8er Boi 🛹 (🔒 Skateland Punk Pack - $1.99)"}
                    </option>
                    <option value="rock-show-182">
                      {isThemeUnlocked("rock-show-182") ? "Rock Show 182 🎸" : "Rock Show 182 🎸 (🔒 Skateland Punk Pack - $1.99)"}
                    </option>
                    <option value="boulevard-stencil">
                      {isThemeUnlocked("boulevard-stencil") ? "Boulevard Stencil 💥" : "Boulevard Stencil 💥 (🔒 Skateland Punk Pack - $1.99)"}
                    </option>
                    <option value="lemonwire">
                      {isThemeUnlocked("lemonwire") ? "LemonWire 🍋" : "LemonWire 🍋 (🔒 P2P File Share Pack - $1.99)"}
                    </option>
                    <option value="napster-kitty">
                      {isThemeUnlocked("napster-kitty") ? "Napster Kitty 🐱" : "Napster Kitty 🐱 (🔒 P2P File Share Pack - $1.99)"}
                    </option>
                    <option value="winamp-classic">
                      {isThemeUnlocked("winamp-classic") ? "Winamp Classic 📻" : "Winamp Classic 📻 (🔒 P2P File Share Pack - $1.99)"}
                    </option>
                    <option value="simple-life">
                      {isThemeUnlocked("simple-life") ? "Simple Life 👑" : "Simple Life 👑 (🔒 Socialite Gossip Pack - $1.99)"}
                    </option>
                    <option value="metallic-razr">
                      {isThemeUnlocked("metallic-razr") ? "Metallic Razr 📱" : "Metallic Razr 📱 (🔒 Socialite Gossip Pack - $1.99)"}
                    </option>
                    <option value="gossip-blog">
                      {isThemeUnlocked("gossip-blog") ? "Gossip Blog ✍️" : "Gossip Blog ✍️ (🔒 Socialite Gossip Pack - $1.99)"}
                    </option>
                  </select>
                  {userId === currentUserId && (
                    <div style={{ marginTop: "4px", fontSize: "10px", display: "flex", gap: "10px" }}>
                      <button
                        type="button"
                        style={{ background: "none", border: "none", color: "blue", textDecoration: "underline", cursor: "pointer", padding: 0 }}
                        onClick={async () => {
                          if (onSaveProfile) {
                            await onSaveProfile(currentUserId, {
                              unlockedThemes: ["classic", "glitter", "cyberpunk", "sunset", "goth", "gameboy"]
                            });
                            alert("Theme purchases reset! Anime themes are now locked again.");
                          }
                        }}
                      >
                        Reset Theme Purchases (Developer Test)
                      </button>
                      <button
                        type="button"
                        style={{ background: "none", border: "none", color: "green", textDecoration: "underline", cursor: "pointer", padding: 0, fontWeight: "bold" }}
                        onClick={handleRestorePurchases}
                        disabled={restoring}
                      >
                        {restoring ? "Restoring..." : "Restore App Store Purchases"}
                      </button>
                    </div>
                  )}
                </div>
                <div className="profile-edit-card" style={{ display: "flex", flexDirection: "column", gap: "8px", margin: "4px 0" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <label style={{ fontSize: "11px", fontWeight: "bold", color: "inherit" }}>Spotify Track URI:</label>
                      <button 
                        type="button"
                        onClick={() => setShowHelpModal(true)} 
                        className="profile-help-btn"
                      >
                        [ ? ]
                      </button>
                    </div>
                    <input 
                      type="text" 
                      value={editSpotifyTrackUri}
                      onChange={(e) => {
                        setEditSpotifyTrackUri(e.target.value);
                        if (profileError) setProfileError("");
                      }}
                      placeholder="e.g. spotify:track:4PTG3Z6ehGkBF3zI7YSp6g"
                      style={{ width: "100%", fontSize: "12px", padding: "4px", minHeight: "28px", height: "28px" }}
                    />
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                    <label style={{ fontSize: "11px", fontWeight: "bold", color: "inherit" }}>Display Song Title (Optional):</label>
                    <input 
                      type="text" 
                      value={editSpotifySongTitle}
                      onChange={(e) => setEditSpotifySongTitle(e.target.value)}
                      placeholder="e.g. Hum of Hurt"
                      style={{ width: "100%", fontSize: "12px", padding: "4px", minHeight: "28px", height: "28px" }}
                    />
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                    <label style={{ fontSize: "11px", fontWeight: "bold", color: "inherit" }}>Display Artist Name (Optional):</label>
                    <input 
                      type="text" 
                      value={editSpotifyArtistName}
                      onChange={(e) => setEditSpotifyArtistName(e.target.value)}
                      placeholder="e.g. Converge"
                      style={{ width: "100%", fontSize: "12px", padding: "4px", minHeight: "28px", height: "28px" }}
                    />
                  </div>

                  {profileError && (
                    <div 
                      style={{ 
                        backgroundColor: "#ff007f", 
                        color: "#fff", 
                        border: "2px outset #ff007f", 
                        padding: "6px", 
                        marginTop: "4px", 
                        fontSize: "10px", 
                        fontFamily: "monospace", 
                        fontWeight: "bold",
                        lineHeight: "1.3"
                      }}
                    >
                      🚨 {profileError}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Contact Box — shown when viewing another user's profile */}
            {userId !== currentUserId && (
              <div className="contact-box">
                <div className="contact-box-header">Contacting {username}</div>
                <div className="contact-box-grid">
                  <div className="contact-action" onClick={handleShareProfile}>
                    🔗 Share Profile
                  </div>
                  <div className="contact-action" onClick={handleReportUser}>
                    ⚠️ Report User
                  </div>
                </div>
              </div>
            )}

            <div className="profile-bio-box beveled-box" style={{ marginTop: "12px", backgroundColor: "#fff", padding: "8px" }}>
              <div className="section-header-orange">About Me:</div>
              {isEditing ? (
                <textarea 
                  rows="4" 
                  value={editBio} 
                  onChange={(e) => setEditBio(e.target.value)} 
                  style={{ width: "100%", fontFamily: "Arial, sans-serif", fontSize: "13px", padding: "4px" }}
                />
              ) : (
                <p 
                  style={{ margin: "5px 0", fontSize: "13px", lineHeight: "1.3", whiteSpace: "pre-wrap" }}
                >
                  {bio || "This user is keeping it mysterious and hasn't written a biography yet."}
                </p>
              )}
            </div>
          </div>

          {/* Right Column: Friend Space + Favorited Bars */}
          <div className="profile-right-col">
            <div className="top8-container beveled-box">
              <div className="section-header-orange">{username}'s Friend Space</div>

              <div className="top8-grid">
                {/* Tom is always first */}
                <div
                  className="top8-friend"
                  onClick={() => onOpenProfile && onOpenProfile("tom", {
                    username: "Tom",
                    mood: "Friendly 🙂",
                    bio: "Remember me?",
                    headline: "Everyones first friend!",
                    profileTheme: "classic",
                    emoji_avatar: "👥🥃💖"
                  })}
                >
                  <span style={{ fontSize: "28px", lineHeight: 1 }}>👥🥃💖</span>
                  <span className="friend-name">Tom</span>
                </div>

                {/* Hunter is always second */}
                <div
                  className="top8-friend"
                  onClick={() => onOpenProfile && onOpenProfile("hunter", {
                    username: "Hunter",
                    mood: "Coding 💻",
                    bio: "Founder of asl. Let me know if you have any questions!",
                    profileTheme: "classic",
                    emoji_avatar: "⚡🖥️🛹"
                  })}
                >
                  <span style={{ fontSize: "28px", lineHeight: 1 }}>⚡🖥️🛹</span>
                  <span className="friend-name">Hunter</span>
                </div>

                {/* Real accepted connections */}
                {acceptedConnections.slice(0, 6).map(conn => {
                  const profile = friendProfiles[conn.userId];
                  const displayName = profile?.username || conn.username || "Connection";
                  const displayEmoji = profile?.emoji_avatar || "👥🥃💖";
                  return (
                    <div
                      key={conn.userId}
                      className="top8-friend"
                      onClick={() => onOpenProfile && onOpenProfile(conn.userId, {
                        username: displayName,
                        mood: profile?.mood || "Chillin' 😎",
                        bio: profile?.bio || "",
                        profileTheme: profile?.profileTheme || "classic",
                        emoji_avatar: displayEmoji
                      })}
                    >
                      <span style={{ fontSize: "28px", lineHeight: 1 }}>{displayEmoji}</span>
                      <span className="friend-name">{displayName}</span>
                    </div>
                  );
                })}
              </div>
              
              {acceptedConnections.length === 0 && (
                <p style={{ fontSize: "10px", color: "#888", fontStyle: "italic", marginTop: "8px", padding: "0 4px", lineHeight: "1.4" }}>
                  Your friend space fills up when someone matches your "That Was Me!" — or you match theirs.
                </p>
              )}
            </div>

            {/* Favorited Bars Section */}
            <div className="top8-container beveled-box" style={{ marginTop: "12px", padding: "6px" }}>
              <div className="section-header-orange" style={{ margin: "0 0 8px 0" }}>{username}'s Favorited Bars</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {favoritedVenueList.length === 0 ? (
                  <div style={{ padding: "10px", textAlign: "center", color: "#888", fontSize: "11px", fontStyle: "italic" }}>
                    No favorited bars yet.
                  </div>
                ) : (
                  favoritedVenueList.map(venue => (
                    <div 
                      key={venue.fsq_id}
                      onClick={() => onSelectVenue && onSelectVenue(venue.fsq_id)}
                      className="favorited-bar-item"
                      title="Click to view bar details"
                    >
                      <span>🍹 {venue.name}</span>
                      <span>{venue.zone} ➡️</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>



        {/* Profile Operations — at the very bottom, only visible to profile owner */}
        {(userId === currentUserId || isAdmin) && (
          <div className="contact-box" style={{ marginTop: "16px" }}>
            <div className="contact-box-header">{userId === currentUserId ? "Profile Operations" : `Moderate ${username}'s Profile`}</div>
            <div style={{ padding: "10px", display: "flex", flexDirection: "column", gap: "6px" }}>
              {isEditing ? (
                <div style={{ display: "flex", gap: "8px" }}>
                  <button 
                    className="default" 
                    onClick={handleSave} 
                    style={{ flex: 1, minHeight: "42px", fontSize: "14px" }}
                  >
                    💾 Save
                  </button>
                  <button 
                    onClick={() => {
                      setIsEditing(false);
                      setEditUsername(username);
                      setEditMood(mood);
                      setEditBio(bio);
                      setEditProfileTheme(profileTheme);
                      setEditEmojiAvatar(emoji_avatar);
                      setEditSpotifyTrackUri(spotify_track_uri);
                      setEditSpotifySongTitle(spotify_song_title);
                      setEditSpotifyArtistName(spotify_artist_name);
                      setEditHeadline(headline);
                      setProfileError("");
                    }} 
                    style={{ flex: 1, minHeight: "42px", fontSize: "14px" }}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <button 
                    onClick={() => setIsEditing(true)} 
                    style={{ width: "100%", minHeight: "42px", fontSize: "14px" }}
                  >
                    {userId === currentUserId ? "⚙️ Edit My Profile" : "⚙️ Moderate Profile Details"}
                  </button>
                  <button 
                    onClick={handleShareProfile} 
                    style={{ width: "100%", minHeight: "42px", fontSize: "14px" }}
                  >
                    🔗 Share My Profile
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {showHelpModal && (
        <div 
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(0, 0, 0, 0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999
          }}
          onClick={() => setShowHelpModal(false)}
        >
          <div 
            style={{
              width: "320px",
              backgroundColor: "#dfdfdf",
              border: "2px solid #fff",
              borderRightColor: "#808080",
              borderBottomColor: "#808080",
              padding: "2px",
              boxShadow: "0 0 10px rgba(0,0,0,0.5)",
              boxSizing: "border-box"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Title Bar */}
            <div 
              style={{
                backgroundColor: "#003399",
                color: "#fff",
                padding: "4px 6px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontWeight: "bold",
                fontSize: "11px",
                fontFamily: "Tahoma, sans-serif"
              }}
            >
              <span>Spotify Help & Instructions</span>
              <button 
                onClick={() => setShowHelpModal(false)}
                style={{
                  width: "14px",
                  height: "14px",
                  fontSize: "9px",
                  lineHeight: "10px",
                  padding: 0,
                  cursor: "pointer",
                  backgroundColor: "#dfdfdf",
                  border: "1px solid #808080",
                  fontWeight: "bold"
                }}
              >
                X
              </button>
            </div>

            {/* Content */}
            <div 
              style={{
                padding: "12px",
                fontSize: "12px",
                color: "#000",
                lineHeight: "1.5",
                fontFamily: "Arial, Helvetica, sans-serif"
              }}
            >
              <p style={{ fontWeight: "bold", margin: "0 0 8px 0" }}>How to get your Spotify Track URI:</p>
              <ol style={{ paddingLeft: "20px", margin: "0 0 12px 0" }}>
                <li>Open the Spotify app or web player.</li>
                <li>Find your favorite song.</li>
                <li>Click the three dots next to the song title.</li>
                <li>Go to <strong>Share</strong> -&gt; <strong>Copy Song Link</strong>.</li>
                <li>Paste that link directly into the input field!</li>
              </ol>
              <p style={{ margin: 0, fontSize: "11px", color: "#666" }}>
                We will automatically extract the 22-character track ID for you!
              </p>
            </div>

            {/* Footer Buttons */}
            <div style={{ display: "flex", justifyContent: "flex-end", padding: "8px", borderTop: "1px solid #ccc" }}>
              <button 
                onClick={() => setShowHelpModal(false)}
                style={{
                  padding: "4px 16px",
                  fontSize: "12px",
                  cursor: "pointer",
                  backgroundColor: "#dfdfdf",
                  border: "2px solid #fff",
                  borderRightColor: "#808080",
                  borderBottomColor: "#808080",
                  fontWeight: "bold"
                }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SECURE CHECKOUT MODAL OVERLAY */}
      {showCheckoutModal && checkoutProduct && (
        <div className="modal-overlay" style={{ zIndex: 999999, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="window" style={{ width: "320px" }}>
            <div className="title-bar">
              <div className="title-bar-text">asl Secure Billing Gateway</div>
              <div className="title-bar-controls">
                <button aria-label="Close" onClick={() => setShowCheckoutModal(false)} />
              </div>
            </div>
            <div className="window-body" style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "12px" }}>
              {checkoutStep === "idle" && (
                <>
                  <div style={{ textAlign: "center", fontSize: "24px", margin: "10px 0" }}>💳🔒</div>
                  <p style={{ margin: 0, fontWeight: "bold", fontSize: "14px", textAlign: "center" }}>
                    Secure In-App Purchase
                  </p>
                  <div className="profile-edit-card" style={{ padding: "10px", margin: 0 }}>
                    <p style={{ margin: "0 0 6px 0" }}><strong>Item:</strong> {checkoutProduct.name}</p>
                    <p style={{ margin: "0 0 6px 0" }}><strong>Price:</strong> {checkoutProduct.cost}</p>
                    <p style={{ margin: 0, fontSize: "11px", color: "#666" }}>
                      {checkoutProduct.id === "cozy_pack"
                        ? "Unlocks 3 themes: Pocket Crossing 🍃, Spirit Bathhouse 🏮, and Matcha Tea 🍵."
                        : checkoutProduct.id === "badbitch_pack"
                        ? "Unlocks 3 themes: 8-Ball 🎱, Long Nails 💅, and Sheer ✨."
                        : checkoutProduct.id === "screamo_pack"
                        ? "Unlocks 3 themes: Vampire Romance 🦇, Sunday Showdown 🎤, and Quiet Things 🎧."
                        : checkoutProduct.id === "teen_idol_pack"
                        ? "Unlocks 3 themes: Oops Pink 🎀, Frosted Tips ⭐, and Wannabe Leopard 🐆."
                        : checkoutProduct.id === "skateland_punk_pack"
                        ? "Unlocks 3 themes: Sk8er Boi 🛹, Rock Show 182 🎸, and Boulevard Stencil 💥."
                        : checkoutProduct.id === "file_share_pack"
                        ? "Unlocks 3 themes: LemonWire 🍋, Napster Kitty 🐱, and Winamp Classic 📻."
                        : checkoutProduct.id === "socialite_gossip_pack"
                        ? "Unlocks 3 themes: Simple Life 👑, Metallic Razr 📱, and Gossip Blog ✍️."
                        : "Unlocks 3 themes: Straw Hat Pirate ⚓, Slayer Blade ⚔️, and Sorcery Curse 💀."}
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "10px" }}>
                    <button onClick={() => setShowCheckoutModal(false)}>Cancel</button>
                    <button className="default" onClick={handleSimulatePurchase}>Buy Now</button>
                  </div>
                </>
              )}

              {checkoutStep === "processing" && (
                <div style={{ textAlign: "center", padding: "20px 0" }}>
                  <div className="retro-blink" style={{ fontWeight: "bold", color: "#003399", marginBottom: "15px" }}>
                    {checkoutStatusText}
                  </div>
                  <div style={{ width: "100%", height: "12px", backgroundColor: "#dfdfdf", border: "1px solid #808080", padding: "1px", boxSizing: "border-box" }}>
                    <div style={{ width: "100%", height: "100%", background: "linear-gradient(90deg, #003399 0%, #ff66cc 100%)" }} />
                  </div>
                </div>
              )}

              {checkoutStep === "success" && (
                <>
                  <div style={{ textAlign: "center", fontSize: "28px", color: "green", margin: "10px 0" }}>✅ APPROVED</div>
                  <p style={{ margin: 0, fontWeight: "bold", textAlign: "center", color: "green" }}>
                    Purchase Successful!
                  </p>
                  <p style={{ margin: "6px 0", fontSize: "12px", textAlign: "center" }}>
                    The "{checkoutProduct.id === "cozy_pack" ? "Cozy Village" 
                          : checkoutProduct.id === "badbitch_pack" ? "Y2K Glam" 
                          : checkoutProduct.id === "screamo_pack" ? "Mall Goth / Screamo"
                          : checkoutProduct.id === "teen_idol_pack" ? "Teen Idol"
                          : checkoutProduct.id === "skateland_punk_pack" ? "Skateland Punk"
                          : checkoutProduct.id === "file_share_pack" ? "P2P File Share"
                          : checkoutProduct.id === "socialite_gossip_pack" ? "Socialite Gossip"
                          : "Otaku Legends"}" themes bundle has been permanently unlocked and credited to your node.
                  </p>
                  <div style={{ display: "flex", justifyContent: "center", marginTop: "10px" }}>
                    <button className="default" onClick={handleCloseSuccess}>OK</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
