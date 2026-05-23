import { useState } from "react";
import TitleBar from "./TitleBar";
import { parseBBCode } from "../services/bbcode";
import MySpaceMusicPlayer from "./MySpaceMusicPlayer";

const TOP_8_FRIENDS = [
  { name: "Tom", avatar: "👥🥃💖", role: "Co-Founder", tagline: "Your first friend." },
  { name: "Gracie", avatar: "🍹🤠✨", role: "Bar Owner", tagline: "Pouring the tax bar." },
  { name: "aim_admin", avatar: "🏃‍♂️📟💾", role: "AIM Staff", tagline: "Dial-up runner." },
  { name: "dialup_hero", avatar: "📠🔌⚡", role: "Sysop", tagline: "56k bps lifer." },
  { name: "disco_queen", avatar: "💃🌟🔥", role: "Regular", tagline: "Always dancing." },
  { name: "neon_light", avatar: "💡👾🎮", role: "Regular", tagline: "Glowing vibes." },
  { name: "tax_collector", avatar: "💰🏦🎱", role: "Regular", tagline: "Gracies regular." },
  { name: "mystery_stranger", avatar: "🕵️🥃🖤", role: "Mystery", tagline: "Spot me?" }
];

const EMOJI_PRESETS = ["👥", "🥃", "💖", "😎", "⚡", "😍", "🎧", "🌧️", "🖤", "🍹", "🌵", "🥂", "🍕", "🎱", "👾", "💾", "📟", "🛹", "🎸", "🎤", "🍻", "🔥", "✨", "🌟", "🎈", "🎉"];

export default function MySpaceProfileDialog({ 
  username, 
  mood, 
  bio, 
  profileTheme = "classic", 
  emoji_avatar = "👥🥃💖",
  spotify_track_uri = "spotify:track:4PTG3Z6ehGkBF3zI7YSp6g",
  onClose,
  onOpenChat,
  userId,
  currentUserId,
  onSaveProfile
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editUsername, setEditUsername] = useState(username);
  const [editMood, setEditMood] = useState(mood);
  const [editBio, setEditBio] = useState(bio);
  const [editProfileTheme, setEditProfileTheme] = useState(profileTheme);
  const [editEmojiAvatar, setEditEmojiAvatar] = useState(emoji_avatar);
  const [editSpotifyTrackUri, setEditSpotifyTrackUri] = useState(spotify_track_uri);
  const [showHelp, setShowHelp] = useState(false);

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
    if (editBio.length > 500) {
      alert("Biography must be 500 characters or less.");
      return;
    }
    if (Array.from(editEmojiAvatar).length !== 3) {
      alert("Please select exactly 3 emojis for your avatar.");
      return;
    }

    if (onSaveProfile) {
      onSaveProfile({
        username: editUsername,
        mood: editMood,
        bio: editBio,
        profileTheme: editProfileTheme,
        emoji_avatar: editEmojiAvatar,
        spotify_track_uri: editSpotifyTrackUri
      });
      setIsEditing(false);
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
            <div style={{ display: "flex", flexDirection: "column", gap: "2px", width: "100%" }}>
              <label style={{ fontSize: "11px", fontWeight: "bold" }}>Display Name:</label>
              <input 
                type="text" 
                value={editUsername} 
                onChange={(e) => setEditUsername(e.target.value)} 
                style={{ width: "100%", fontSize: "16px", padding: "4px" }}
              />
            </div>
          ) : (
            <>
              <h2 className="profile-name-header" style={{ margin: "0 0 4px 0" }}>{username}</h2>
              <p className="profile-headline">"Everyone's favorite dial-up partner"</p>
            </>
          )}
        </div>

        <div className="profile-main-grid">
          {/* Left Column: Avatar & Bio */}
          <div className="profile-left-col">
            <div className="profile-photo-box beveled-box" style={{ flexDirection: "column", padding: "8px", minHeight: "150px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {isEditing ? (
                <>
                  <div style={{ display: "flex", gap: "6px", marginBottom: "4px" }}>
                    {Array.from(editEmojiAvatar).map((em, idx) => (
                      <span 
                        key={idx} 
                        onClick={() => handleRemoveEmojiAtIndex(idx)}
                        style={{ fontSize: "36px", cursor: "pointer", border: "1px inset #fff", padding: "4px", backgroundColor: "#fff" }}
                        title="Click to remove"
                      >
                        {em}
                      </span>
                    ))}
                    {Array.from(editEmojiAvatar).length === 0 && (
                      <span style={{ fontSize: "12px", color: "#666" }}>Select 3 emojis:</span>
                    )}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "2px", width: "100%", maxHeight: "80px", overflowY: "auto", border: "1px solid #ccc", padding: "2px", backgroundColor: "#fff" }}>
                    {EMOJI_PRESETS.map((em) => (
                      <span 
                        key={em} 
                        onClick={() => handleAddEmoji(em)}
                        style={{ fontSize: "16px", cursor: "pointer", textAlign: "center" }}
                      >
                        {em}
                      </span>
                    ))}
                  </div>
                </>
              ) : (
                <span className="profile-avatar-emoji" style={{ fontSize: "52px" }}>
                  {emoji_avatar || "👥🥃💖"}
                </span>
              )}
            </div>
            
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
                  </select>
                </div>
              ) : (
                <p><strong>Mood:</strong> {mood || "Chillin' 😎"}</p>
              )}
              <p><strong>Status:</strong> Online 📡</p>
              <p><strong>Region:</strong> Phoenix Area</p>
            </div>

            {!isEditing && (
              <MySpaceMusicPlayer spotifyTrackUri={spotify_track_uri} />
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
                    <option value="classic">Classic (Blue/Orange)</option>
                    <option value="glitter">Glitter 💖</option>
                    <option value="cyberpunk">Cyberpunk 🟢</option>
                    <option value="sunset">Sunset 🌅</option>
                  </select>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "2px", margin: "4px 0", padding: "6px", border: "1px solid #ccc", backgroundColor: "#fff" }}>
                  <label style={{ fontSize: "11px", fontWeight: "bold" }}>Spotify Track URI:</label>
                  <input 
                    type="text" 
                    value={editSpotifyTrackUri}
                    onChange={(e) => setEditSpotifyTrackUri(e.target.value)}
                    placeholder="e.g. spotify:track:4PTG3Z6ehGkBF3zI7YSp6g"
                    style={{ width: "100%", fontSize: "12px", padding: "4px", minHeight: "28px", height: "28px" }}
                  />
                </div>
              </>
            )}

            {/* Contact / Operations Table */}
            {userId === currentUserId ? (
              <div className="contact-box" style={{ width: "100%", marginTop: "4px" }}>
                <div className="contact-box-header">Profile Operations</div>
                <div style={{ padding: "8px", display: "flex", flexDirection: "column", gap: "6px" }}>
                  {isEditing ? (
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button 
                        className="default" 
                        onClick={handleSave} 
                        style={{ flex: 1, minHeight: "38px" }}
                      >
                        💾 Save
                      </button>
                      <button 
                        onClick={() => setIsEditing(false)} 
                        style={{ flex: 1, minHeight: "38px" }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setIsEditing(true)} 
                      style={{ width: "100%", minHeight: "38px" }}
                    >
                      ⚙️ Edit My Profile
                    </button>
                  )}
                </div>
              </div>
            ) : (
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

          {/* Right Column: Top 8 Friends */}
          <div className="profile-right-col">
            <div className="top8-container beveled-box">
              <div className="section-header-orange">{username}'s Friend Space (Top 8)</div>
              <div className="top8-grid">
                {TOP_8_FRIENDS.map((f) => (
                  <div 
                    key={f.name} 
                    className="top8-friend"
                    onClick={() => alert(`This is ${f.name} (${f.role}) - ${f.tagline}`)}
                  >
                    <div className="friend-avatar-wrapper">
                      <span className="friend-avatar">{f.avatar}</span>
                    </div>
                    <span className="friend-name">{f.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
