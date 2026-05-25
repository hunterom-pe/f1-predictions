import { useState, useEffect } from "react";
import TitleBar from "./TitleBar";
import { parseBBCode } from "../services/bbcode";
import MySpaceMusicPlayer from "./MySpaceMusicPlayer";
import { dbGetDoc } from "../firebase";

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
  onSaveProfile,
  unlockedThemes = [],
  favorited_bars = [],
  venues = [],
  onSelectVenue,
  acceptedConnections = [],
  onOpenProfile
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editUsername, setEditUsername] = useState(username);
  const [editMood, setEditMood] = useState(mood);
  const [editBio, setEditBio] = useState(bio);
  const [editProfileTheme, setEditProfileTheme] = useState(profileTheme);
  const [editEmojiAvatar, setEditEmojiAvatar] = useState(emoji_avatar);
  const [editSpotifyTrackUri, setEditSpotifyTrackUri] = useState(spotify_track_uri);
  const [editSpotifySongTitle, setEditSpotifySongTitle] = useState(spotify_song_title);
  const [editSpotifyArtistName, setEditSpotifyArtistName] = useState(spotify_artist_name);
  const [editHeadline, setEditHeadline] = useState(headline);
  const [showHelp, setShowHelp] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [friendProfiles, setFriendProfiles] = useState({});

  // IAP Simulation states
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutProduct, setCheckoutProduct] = useState(null);
  const [checkoutStep, setCheckoutStep] = useState("idle");
  const [checkoutStatusText, setCheckoutStatusText] = useState("");

  const ownedThemes = unlockedThemes && unlockedThemes.length ? unlockedThemes : ["classic", "glitter", "cyberpunk", "sunset", "goth", "pokemon"];

  const isThemeUnlocked = (themeName) => {
    const freeThemes = ["classic", "glitter", "cyberpunk", "sunset", "goth", "pokemon"];
    if (freeThemes.includes(themeName)) return true;
    return ownedThemes.includes(themeName);
  };

  const handleSimulatePurchase = () => {
    setCheckoutStep("processing");
    setCheckoutStatusText("CONNECTING TO APPLE APP STORE...");
    
    setTimeout(() => {
      setCheckoutStatusText("PROCESSING SECURE TRANSACTION...");
      
      setTimeout(() => {
        setCheckoutStatusText("VERIFYING PURCHASES RECEIPT...");
        
        setTimeout(async () => {
          if (onSaveProfile) {
            const isCozy = checkoutProduct.id === "cozy_pack";
            const isBadBitch = checkoutProduct.id === "badbitch_pack";
            const themesToUnlock = isCozy 
              ? ["animal-crossing", "spirited-away", "matcha-tea"]
              : isBadBitch
              ? ["8-ball", "long-nails", "sheer"]
              : ["one-piece", "demon-slayer", "jujutsu-kaisen"];
            const updatedUnlocked = [
              ...new Set([...ownedThemes, ...themesToUnlock])
            ];
            await onSaveProfile({
              unlockedThemes: updatedUnlocked
            });
          }
          setCheckoutStep("success");
        }, 800);
      }, 800);
    }, 800);
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
        const snap = await dbGetDoc("users", friendId);
        if (snap.exists()) {
          setFriendProfiles(prev => ({ ...prev, [friendId]: snap.data() }));
        }
      } catch (e) {
        // silently ignore
      }
    });
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
      onSaveProfile({
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
    switch (isEditing ? editProfileTheme : profileTheme) {
      case "glitter": return "myspace-theme-glitter";
      case "cyberpunk": return "myspace-theme-cyberpunk";
      case "sunset": return "myspace-theme-sunset";
      case "goth": return "myspace-theme-goth";
      case "pokemon": return "myspace-theme-pokemon";
      case "one-piece": return "myspace-theme-onepiece";
      case "demon-slayer": return "myspace-theme-demonslayer";
      case "jujutsu-kaisen": return "myspace-theme-jujutsukaisen";
      case "animal-crossing": return "myspace-theme-animalcrossing";
      case "spirited-away": return "myspace-theme-spiritedaway";
      case "matcha-tea": return "myspace-theme-matchatea";
      case "8-ball": return "myspace-theme-8ball";
      case "long-nails": return "myspace-theme-longnails";
      case "sheer": return "myspace-theme-sheer";
      default: return "myspace-theme-classic";
    }
  };

  return (
    <div className={`window ${getThemeClass()}`} style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
      <TitleBar title={`asl - ${isEditing ? "Editing Profile" : `${username}'s Profile`}`} onClose={onClose} />
      
      <div className="window-body myspace-profile-body" style={{ flex: 1, overflowY: "auto", padding: "12px", margin: 0 }}>
        
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
                    <option>Goth Emo 🖤</option>
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
              <p><strong>Status:</strong> Online 📡</p>
              <p><strong>Region:</strong> Phoenix Area</p>
            </div>

            {!isEditing && (
              <MySpaceMusicPlayer 
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
                      if (!isThemeUnlocked(selectedTheme)) {
                        const cozyThemes = ["animal-crossing", "spirited-away", "matcha-tea"];
                        const badBitchThemes = ["8-ball", "long-nails", "sheer"];
                        const isCozy = cozyThemes.includes(selectedTheme);
                        const isBadBitch = badBitchThemes.includes(selectedTheme);
                        setCheckoutProduct(
                          isCozy
                            ? { id: "cozy_pack", name: "Cozy Girl Theme Bundle", cost: "$1.99", themes: cozyThemes, targetTheme: selectedTheme }
                            : isBadBitch
                            ? { id: "badbitch_pack", name: "Bad Bitch Theme Bundle", cost: "$1.99", themes: badBitchThemes, targetTheme: selectedTheme }
                            : { id: "weeb_pack", name: "Weeb Theme Bundle", cost: "$1.99", themes: ["one-piece", "demon-slayer", "jujutsu-kaisen"], targetTheme: selectedTheme }
                        );
                        setCheckoutStep("idle");
                        setShowCheckoutModal(true);
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
                    <option value="pokemon">Pokémon ⚡</option>
                    <option value="one-piece">
                      {isThemeUnlocked("one-piece") ? "One Piece ⚓" : "One Piece ⚓ (🔒 Weeb Pack - $1.99)"}
                    </option>
                    <option value="demon-slayer">
                      {isThemeUnlocked("demon-slayer") ? "Demon Slayer ⚔️" : "Demon Slayer ⚔️ (🔒 Weeb Pack - $1.99)"}
                    </option>
                    <option value="jujutsu-kaisen">
                      {isThemeUnlocked("jujutsu-kaisen") ? "Jujutsu Kaisen 💀" : "Jujutsu Kaisen 💀 (🔒 Weeb Pack - $1.99)"}
                    </option>
                    <option value="animal-crossing">
                      {isThemeUnlocked("animal-crossing") ? "Animal Crossing 🍃" : "Animal Crossing 🍃 (🔒 Cozy Girl Pack - $1.99)"}
                    </option>
                    <option value="spirited-away">
                      {isThemeUnlocked("spirited-away") ? "Spirited Away 🏮" : "Spirited Away 🏮 (🔒 Cozy Girl Pack - $1.99)"}
                    </option>
                    <option value="matcha-tea">
                      {isThemeUnlocked("matcha-tea") ? "Matcha Tea 🍵" : "Matcha Tea 🍵 (🔒 Cozy Girl Pack - $1.99)"}
                    </option>
                    <option value="8-ball">
                      {isThemeUnlocked("8-ball") ? "8-Ball 🎱" : "8-Ball 🎱 (🔒 Bad Bitch Pack - $1.99)"}
                    </option>
                    <option value="long-nails">
                      {isThemeUnlocked("long-nails") ? "Long Nails 💅" : "Long Nails 💅 (🔒 Bad Bitch Pack - $1.99)"}
                    </option>
                    <option value="sheer">
                      {isThemeUnlocked("sheer") ? "Sheer ✨" : "Sheer ✨ (🔒 Bad Bitch Pack - $1.99)"}
                    </option>
                  </select>
                  <div style={{ marginTop: "4px", fontSize: "10px" }}>
                    <button
                      type="button"
                      style={{ background: "none", border: "none", color: "blue", textDecoration: "underline", cursor: "pointer", padding: 0 }}
                      onClick={async () => {
                        if (onSaveProfile) {
                          await onSaveProfile({
                            unlockedThemes: ["classic", "glitter", "cyberpunk", "sunset", "goth", "pokemon"]
                          });
                          alert("Theme purchases reset! Anime themes are now locked again.");
                        }
                      }}
                    >
                      Reset Theme Purchases (Developer Test)
                    </button>
                  </div>
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
                  <div className="contact-action" onClick={handleSendMessage}>
                    ✉️ Send Message (AIM)
                  </div>
                  <div className="contact-action" onClick={() => alert(`${username} added to friends list!`)}>
                    ➕ Add to Friends
                  </div>
                  <div className="contact-action" onClick={() => alert("Profile shared!")}>
                    🔗 Share Profile
                  </div>
                  <div className="contact-action" onClick={() => alert("Reported to system sysop.")}>
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
                  style={{ margin: "5px 0", fontSize: "13px", lineHeight: "1.3" }}
                  dangerouslySetInnerHTML={{ __html: parseBBCode(bio) || "This user is keeping it mysterious and hasn't written a biography yet." }}
                />
              )}
            </div>
          </div>

          {/* Right Column: Friend Space + Favorited Bars */}
          <div className="profile-right-col">
            <div className="top8-container beveled-box">
              <div className="section-header-orange">{username}'s Friend Space</div>

              {acceptedConnections.length === 0 ? (
                /* No real connections yet — show just Tom */
                <div style={{ padding: "10px 6px" }}>
                  <div
                    className="top8-friend"
                    onClick={() => onOpenProfile && onOpenProfile("tom", {
                      username: "Tom",
                      mood: "Friendly 🙂",
                      bio: "Co-founder of asl. Let me know if you have any questions!",
                      profileTheme: "classic",
                      emoji_avatar: "👥🥃💖"
                    })}
                    style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", width: "60px" }}
                  >
                    <span style={{ fontSize: "28px", lineHeight: 1 }}>👥🥃💖</span>
                    <span className="friend-name" style={{ maxWidth: "60px" }}>Tom</span>
                  </div>
                  <p style={{ fontSize: "10px", color: "#888", fontStyle: "italic", marginTop: "8px", lineHeight: "1.4" }}>
                    Your friend space fills up when someone matches your "That Was Me!" — or you match theirs.
                  </p>
                </div>
              ) : (
                <div className="top8-grid">
                  {/* Tom is always first */}
                  <div
                    className="top8-friend"
                    onClick={() => onOpenProfile && onOpenProfile("tom", {
                      username: "Tom",
                      mood: "Friendly 🙂",
                      bio: "Co-founder of asl.",
                      profileTheme: "classic",
                      emoji_avatar: "👥🥃💖"
                    })}
                  >
                    <span style={{ fontSize: "28px", lineHeight: 1 }}>👥🥃💖</span>
                    <span className="friend-name">Tom</span>
                  </div>

                  {/* Real accepted connections */}
                  {acceptedConnections.slice(0, 7).map(conn => {
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
        {userId === currentUserId && (
          <div className="contact-box" style={{ marginTop: "16px" }}>
            <div className="contact-box-header">Profile Operations</div>
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
                <button 
                  onClick={() => setIsEditing(true)} 
                  style={{ width: "100%", minHeight: "42px", fontSize: "14px" }}
                >
                  ⚙️ Edit My Profile
                </button>
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
                        ? "Unlocks 3 themes: Animal Crossing 🍃, Spirited Away 🏮, and Matcha Tea 🍵."
                        : "Unlocks 3 themes: One Piece ⚓, Demon Slayer ⚔️, and Jujutsu Kaisen 💀."}
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "10px" }}>
                    <button onClick={() => setShowCheckoutModal(false)}>Cancel</button>
                    <button className="default" onClick={handleSimulatePurchase}>Simulate Purchase</button>
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
                    The "{checkoutProduct.id === "cozy_pack" ? "Cozy Girl" : "Weeb"}" themes bundle has been permanently unlocked and credited to your node.
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
