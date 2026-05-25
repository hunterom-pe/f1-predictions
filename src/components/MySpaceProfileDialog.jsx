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
  headline = "Everyone's favorite dial-up partner",
  onClose,
  onOpenChat,
  userId,
  currentUserId,
  onSaveProfile,
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
  const [editHeadline, setEditHeadline] = useState(headline);
  const [showHelp, setShowHelp] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [friendProfiles, setFriendProfiles] = useState({});

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
              <div style={{ border: "1px solid #ccc", backgroundColor: "#fff", padding: "8px", marginBottom: "8px" }}>
                <div style={{ fontSize: "11px", fontWeight: "bold", marginBottom: "6px" }}>Customize Avatar (pick exactly 3):</div>
                
                {/* Currently selected emojis */}
                <div style={{ display: "flex", gap: "6px", marginBottom: "8px", minHeight: "48px", alignItems: "center" }}>
                  {Array.from(editEmojiAvatar).map((em, idx) => (
                    <span 
                      key={idx} 
                      onClick={() => handleRemoveEmojiAtIndex(idx)}
                      style={{ fontSize: "36px", cursor: "pointer", border: "1px inset #999", padding: "4px", backgroundColor: "#f0f0f0", borderRadius: "2px" }}
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
                <div style={{ 
                  display: "grid", 
                  gridTemplateColumns: "repeat(8, 1fr)", 
                  gap: "3px", 
                  width: "100%", 
                  height: "220px", 
                  overflowY: "scroll", 
                  border: "1px inset #ccc", 
                  padding: "4px", 
                  backgroundColor: "#fafafa",
                  boxSizing: "border-box"
                }}>
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

            <div className="profile-details-table">
              {isEditing ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "4px", margin: "4px 0" }}>
                  <label style={{ fontSize: "11px", fontWeight: "bold" }}>Mood:</label>
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
              <>
                <MySpaceMusicPlayer spotifyTrackUri={spotify_track_uri} />
                <div style={{ fontSize: "9px", color: "#666", textAlign: "center", marginTop: "2px", fontStyle: "italic", fontFamily: "Tahoma, sans-serif" }}>
                  💡 Log in to Spotify on this browser to play full songs; otherwise, a 30s preview plays.
                </div>
              </>
            )}

            {/* Custom Theme Selector (only visible in edit mode) */}
            {isEditing && (
              <>
                <div style={{ display: "flex", flexDirection: "column", gap: "2px", margin: "4px 0", padding: "6px", border: "1px solid #ccc", backgroundColor: "#fff" }}>
                  <label style={{ fontSize: "11px", fontWeight: "bold" }}>Profile Theme:</label>
                  <select 
                    value={editProfileTheme} 
                    onChange={(e) => setEditProfileTheme(e.target.value)}
                    style={{ width: "100%", padding: "2px" }}
                  >
                    <option value="classic">Classic (Blue/Pink)</option>
                    <option value="glitter">Glitter 💖</option>
                    <option value="cyberpunk">Cyberpunk 🟢</option>
                    <option value="sunset">Sunset 🌅</option>
                  </select>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "2px", margin: "4px 0", padding: "6px", border: "1px solid #ccc", backgroundColor: "#fff" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <label style={{ fontSize: "11px", fontWeight: "bold" }}>Spotify Track URI:</label>
                    <button 
                      type="button"
                      onClick={() => setShowHelpModal(true)} 
                      style={{ 
                        padding: "0 6px", 
                        fontSize: "10px", 
                        cursor: "pointer", 
                        height: "18px", 
                        minHeight: "18px",
                        lineHeight: "14px",
                        backgroundColor: "#dfdfdf",
                        border: "1px solid #808080",
                        fontWeight: "bold"
                      }}
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
            <div className="beveled-box" style={{ marginTop: "12px", padding: "6px", backgroundColor: "#ffffff", border: "1px solid #ff99cc" }}>
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
                      style={{
                        padding: "6px 8px",
                        border: "1px solid #ffe6f2",
                        backgroundColor: "#fff0f5",
                        cursor: "pointer",
                        fontSize: "12px",
                        fontWeight: "bold",
                        color: "#003399",
                        textDecoration: "underline",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                      }}
                      title="Click to view bar details"
                    >
                      <span>🍹 {venue.name}</span>
                      <span style={{ fontSize: "10px", color: "#666", textDecoration: "none" }}>{venue.zone} ➡️</span>
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
    </div>
  );
}
