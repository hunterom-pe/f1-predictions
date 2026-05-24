import { useState } from "react";
import TitleBar from "./TitleBar";
import { searchVenues } from "../services/foursquare";

const EMOJI_PRESETS = ["👥", "🥃", "💖", "😎", "⚡", "😍", "🎧", "🌧️", "🖤", "🍹", "🌵", "🥂", "🍕", "🎱", "👾", "💾", "📟", "🛹", "🎸", "🎤", "🍻", "🔥", "✨", "🌟", "🎈", "🎉"];

/**
 * MySpace/Web 2.0 styled Creation Wizard for missed connections.
 * @param {object} props
 * @param {Function} props.onClose Close handler
 * @param {Function} props.onSubmit Submit handler (saves post to db)
 */
export default function Wizard({ onClose, onSubmit, preselectedVenue = null }) {
  const [step, setStep] = useState(preselectedVenue ? 2 : 1);
  const [searchQuery, setSearchQuery] = useState("");
  const [venuesList, setVenuesList] = useState([]);
  const [selectedVenue, setSelectedVenue] = useState(preselectedVenue);
  const [isSearching, setIsSearching] = useState(false);

  // Step 2 Form States (36-Hour Scarcity)
  const [datetimeVal, setDatetimeVal] = useState(() => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  });

  // Step 3 Form States (Mad Libs Matrix)
  const [fieldA, setFieldA] = useState("");
  const [fieldB, setFieldB] = useState("");
  const [fieldC, setFieldC] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [showHelp, setShowHelp] = useState(false);

  // Step 4 Profile Customization States
  const [username, setUsername] = useState("");
  const [mood, setMood] = useState("Chillin' 😎");
  const [bio, setBio] = useState("Just browsing the local nightlife spots.");
  const [profileTheme, setProfileTheme] = useState("classic");
  const [emojiAvatar, setEmojiAvatar] = useState("👥🥃💖");

  const handleAddEmoji = (em) => {
    const current = Array.from(emojiAvatar);
    if (current.length < 3) {
      setEmojiAvatar(current.concat(em).join(""));
    }
  };

  const handleRemoveEmojiAtIndex = (index) => {
    const current = Array.from(emojiAvatar);
    current.splice(index, 1);
    setEmojiAvatar(current.join(""));
  };

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const results = await searchVenues(searchQuery);
      setVenuesList(results);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const validateText = (input) => {
    // Strict text check: No base64 images, no <img> tags, no markdown image tags
    const hasBase64Image = /data:image\//i.test(input);
    const hasHtmlImage = /<img/i.test(input);
    const hasMarkdownImage = /!\[.*\]\(.*\)/i.test(input);
    const hasImageExtensions = /\.(jpg|jpeg|png|gif|webp|svg)/i.test(input);

    if (hasBase64Image || hasHtmlImage || hasMarkdownImage || hasImageExtensions) {
      return "ERROR: File attachments, images, and HTML/markdown tags are strictly prohibited. Text only.";
    }
    return "";
  };

  const formatDatetime = (dtStr) => {
    if (!dtStr) return { dateStr: "", timeStr: "" };
    const dt = new Date(dtStr);
    const dateStr = dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const timeStr = dt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    return { dateStr, timeStr };
  };

  const handleNext = () => {
    if (step === 1 && !selectedVenue) {
      setErrorMsg("Please select a nightlife venue to continue.");
      return;
    }
    if (step === 2) {
      if (!datetimeVal) {
        setErrorMsg("Please select a valid date and time.");
        return;
      }
      const selectedTime = new Date(datetimeVal).getTime();
      const cutoffTime = Date.now() - 36 * 60 * 60 * 1000;
      if (selectedTime < cutoffTime) {
        setErrorMsg("Error: Encounter timestamp cannot be older than 36 hours. Connection expired.");
        return;
      }
      if (selectedTime > Date.now()) {
        setErrorMsg("Error: Encounter timestamp cannot be in the future.");
        return;
      }
    }
    if (step === 3) {
      if (!fieldA.trim() || !fieldB.trim() || !fieldC.trim()) {
        setErrorMsg("Please fill out all description fields.");
        return;
      }
      if (fieldA.length > 50) {
        setErrorMsg("User Description must be 50 characters or less.");
        return;
      }
      if (fieldB.length > 50) {
        setErrorMsg("Target Description must be 50 characters or less.");
        return;
      }
      if (fieldC.length > 140) {
        setErrorMsg("Context Details must be 140 characters or less.");
        return;
      }
      const valErrorA = validateText(fieldA);
      const valErrorB = validateText(fieldB);
      const valErrorC = validateText(fieldC);
      if (valErrorA || valErrorB || valErrorC) {
        setErrorMsg(valErrorA || valErrorB || valErrorC);
        return;
      }
    }
    if (step === 4) {
      if (!username.trim()) {
        setErrorMsg("Please enter a username or alias for your profile card.");
        return;
      }
      if (username.length > 25) {
        setErrorMsg("Username must be 25 characters or less.");
        return;
      }
      if (bio.length > 500) {
        setErrorMsg("Biography must be 500 characters or less.");
        return;
      }
      if (Array.from(emojiAvatar).length !== 3) {
        setErrorMsg("Please select exactly 3 emojis for your avatar.");
        return;
      }
    }

    setErrorMsg("");
    setStep(prev => prev + 1);
  };

  const handleBack = () => {
    setErrorMsg("");
    setStep(prev => prev - 1);
  };

  const handleFinish = () => {
    const { dateStr, timeStr } = formatDatetime(datetimeVal);
    const concatenatedText = `About Me: ${fieldA} | About You: ${fieldB} | Context: ${fieldC}`;
    onSubmit({
      venueId: selectedVenue.fsq_id,
      venueName: selectedVenue.name,
      venueAddress: selectedVenue.address,
      venueCity: selectedVenue.city,
      venueZone: selectedVenue.zone,
      date: dateStr,
      timeRange: timeStr,
      text: concatenatedText,
      username,
      mood,
      bio,
      profileTheme,
      emoji_avatar: emojiAvatar,
      encounterTimestamp: new Date(datetimeVal).getTime()
    });
  };

  return (
    <div className="window" style={{ width: "100%", flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      <TitleBar title="Add Missed Connection Wizard" onClose={onClose} />
      
      {/* Wizard Header Banner */}
      <div className="wizard-header-banner">
        <h1>Create Missed Connection</h1>
        <p>Step {step} of 5 - Post your encounter online</p>
      </div>

      <div className="window-body" style={{ flex: 1, backgroundColor: "#fff", padding: "16px", display: "flex", flexDirection: "column", margin: 0, minHeight: 0 }}>
        
        {/* Step Content */}
        <div style={{ flex: 1, overflowY: "auto", minHeight: 0, paddingRight: "4px" }}>
          
          {step === 1 && (
            <div>
              <h3 style={{ margin: "0 0 8px 0", fontSize: "16px", color: "#003399" }}>Step 1: Choose Location</h3>
              <p style={{ margin: "0 0 12px 0", fontSize: "13px", lineHeight: "1.4", color: "#555" }}>
                Search for the bar, lounge, or club where you encountered the person.
              </p>
              
              <form onSubmit={handleSearch} style={{ display: "flex", gap: "6px", marginBottom: "12px" }}>
                <input 
                  type="text" 
                  placeholder="e.g. Cobra Arcade" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ flex: 1, minHeight: "44px" }}
                />
                <button type="submit" disabled={isSearching} style={{ minHeight: "44px" }}>
                  {isSearching ? "Searching..." : "Search"}
                </button>
              </form>

              <div className="beveled-box" style={{ height: "180px", overflowY: "auto", padding: "0", border: "1px solid #ccc" }}>
                {venuesList.length === 0 ? (
                  <p style={{ margin: "20px 10px", fontSize: "13px", color: "#808080", fontStyle: "italic", textAlign: "center" }}>
                    Search for a venue above (try "Cobra", "Valley", "Casey", "Union")
                  </p>
                ) : (
                  <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                    {venuesList.map(v => (
                      <li 
                        key={v.fsq_id}
                        onClick={() => setSelectedVenue(v)}
                        style={{
                          padding: "10px 12px",
                          fontSize: "13px",
                          cursor: "pointer",
                          borderBottom: "1px solid #eee",
                          backgroundColor: selectedVenue?.fsq_id === v.fsq_id ? "#003399" : "transparent",
                          color: selectedVenue?.fsq_id === v.fsq_id ? "white" : "black"
                        }}
                      >
                        <strong>{v.name}</strong> - {v.address} ({v.zone})
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {selectedVenue && (
                <div style={{ fontSize: "12px", marginTop: "8px", color: "#333", backgroundColor: "#f2f6ff", padding: "8px", border: "1px solid #6699ff", borderRadius: "4px" }}>
                  📍 Selected: <strong>{selectedVenue.name}</strong>, {selectedVenue.formatted_address}
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div>
              <h3 style={{ margin: "0 0 8px 0", fontSize: "16px", color: "#003399" }}>Step 2: Choose Date & Time</h3>
              <p style={{ margin: "0 0 12px 0", fontSize: "13px", lineHeight: "1.4", color: "#555" }}>
                Select the exact date and time when you crossed paths with the mystery connection. Encounters are strictly limited to the last 36 hours.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div className="field-row-stacked" style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label htmlFor="wizard-datetime" style={{ fontWeight: "bold", fontSize: "13px" }}>Date & Time of Encounter:</label>
                  <input 
                    id="wizard-datetime" 
                    type="datetime-local" 
                    value={datetimeVal} 
                    onChange={(e) => setDatetimeVal(e.target.value)} 
                    min={new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString().slice(0, 16)}
                    max={new Date().toISOString().slice(0, 16)}
                    style={{ width: "100%" }}
                  />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ margin: "0 0 4px 0", fontSize: "16px", color: "#003399" }}>Step 3: Write Description</h3>
                <span 
                  onClick={() => setShowHelp(!showHelp)} 
                  style={{ fontSize: "11px", textDecoration: "underline", cursor: "pointer", color: "#003399" }}
                >
                  {showHelp ? "Hide Tags Help" : "Show Formatting Help (?) "}
                </span>
              </div>
              <p style={{ margin: "0 0 10px 0", fontSize: "12px", color: "#b22222", fontWeight: "bold" }}>
                ⚠️ STRICT TEXT-ONLY ZONE. NO IMAGES, URLS, OR HTML TAGS ALLOWED.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  <label htmlFor="wizard-field-a" style={{ fontSize: "13px", fontWeight: "bold" }}>Field A: About Me / User Description (Max 50 chars):</label>
                  <input 
                    id="wizard-field-a"
                    type="text"
                    value={fieldA}
                    onChange={(e) => setFieldA(e.target.value)}
                    placeholder="e.g. Guy in vintage Galaga polaroid tee"
                    maxLength={50}
                    style={{ width: "100%" }}
                  />
                  <span style={{ fontSize: "10px", color: "#666", alignSelf: "flex-end" }}>{fieldA.length}/50</span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  <label htmlFor="wizard-field-b" style={{ fontSize: "13px", fontWeight: "bold" }}>Field B: About You / Target Description (Max 50 chars):</label>
                  <input 
                    id="wizard-field-b"
                    type="text"
                    value={fieldB}
                    onChange={(e) => setFieldB(e.target.value)}
                    placeholder="e.g. Girl beating Galaga high score"
                    maxLength={50}
                    style={{ width: "100%" }}
                  />
                  <span style={{ fontSize: "10px", color: "#666", alignSelf: "flex-end" }}>{fieldB.length}/50</span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  <label htmlFor="wizard-field-c" style={{ fontSize: "13px", fontWeight: "bold" }}>Field C: Context & Night Details (Max 140 chars):</label>
                  <textarea 
                    id="wizard-field-c"
                    rows={showHelp ? "3" : "4"}
                    value={fieldC}
                    onChange={(e) => setFieldC(e.target.value)}
                    placeholder="e.g. Near Galaga machine around 11 PM. You played 'Love Will Tear Us Apart' twice. Drinks on me?"
                    maxLength={140}
                    style={{ width: "100%", fontSize: "14px", fontFamily: "Arial, sans-serif" }}
                  />
                  <span style={{ fontSize: "10px", color: "#666", alignSelf: "flex-end" }}>{fieldC.length}/140</span>
                </div>
              </div>

              {showHelp && (
                <div style={{ fontSize: "11px", backgroundColor: "#f9f9f9", padding: "6px", border: "1px dashed #ccc", lineHeight: "1.4", margin: "8px 0" }}>
                  <strong>Custom BBCode Formatting Guide (allowed for styling):</strong>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: "4px 8px", marginTop: "4px" }}>
                    <div><code>[b]Bold[/b]</code></div><div><strong>Bold text</strong></div>
                    <div><code>[i]Italics[/i]</code></div><div><em>Italic text</em></div>
                    <div><code>[blink]Blink[/blink]</code></div><div><span className="retro-blink">Blinking text</span></div>
                    <div><code>[glow=red]Glow[/glow]</code></div><div>Glowing text</div>
                    <div><code>[color=pink]Pink[/color]</code></div><div>Colored text</div>
                    <div><code>[size=16]Size[/size]</code></div><div>Text size (10-28)</div>
                    <div><code>[mono]code[/mono]</code></div><div>Typewriter font</div>
                  </div>
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginTop: "4px", color: "#666" }}>
                <span>BBCode styling tags allowed. Strict plain-text only.</span>
                <span>{fieldA.length + fieldB.length + fieldC.length} / 240 total characters</span>
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <h3 style={{ margin: "0 0 8px 0", fontSize: "16px", color: "#003399" }}>Step 4: Customize asl Profile</h3>
              <p style={{ margin: "0 0 12px 0", fontSize: "13px", lineHeight: "1.4", color: "#555" }}>
                Configure how your Profile Card will appear when other users click your name on this post.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div className="field-row-stacked" style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label htmlFor="wizard-username" style={{ fontWeight: "bold", fontSize: "13px" }}>asl Alias / Display Name:</label>
                  <input 
                    id="wizard-username"
                    type="text"
                    placeholder="e.g. Tom, retro_babe, bar_legend"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    style={{ width: "100%" }}
                  />
                </div>
                <div className="field-row-stacked" style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontWeight: "bold", fontSize: "13px" }}>Emoji Avatar (Select exactly 3):</label>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "4px" }}>
                    <div style={{ display: "flex", gap: "6px" }}>
                      {Array.from(emojiAvatar).map((em, idx) => (
                        <span 
                          key={idx} 
                          onClick={() => handleRemoveEmojiAtIndex(idx)}
                          style={{ fontSize: "28px", cursor: "pointer", border: "1px inset #fff", padding: "4px", backgroundColor: "#fff" }}
                          title="Click to remove"
                        >
                          {em}
                        </span>
                      ))}
                      {Array.from(emojiAvatar).length === 0 && (
                        <span style={{ fontSize: "12px", color: "#666" }}>None selected</span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: "2px", width: "100%", maxHeight: "80px", overflowY: "auto", border: "1px solid #ccc", padding: "4px", backgroundColor: "#fff" }}>
                    {EMOJI_PRESETS.map((em) => (
                      <span 
                        key={em} 
                        onClick={() => handleAddEmoji(em)}
                        style={{ fontSize: "18px", cursor: "pointer", textAlign: "center" }}
                      >
                        {em}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="field-row-stacked" style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label htmlFor="wizard-mood" style={{ fontWeight: "bold", fontSize: "13px" }}>Current Mood Emoticon:</label>
                  <select 
                    id="wizard-mood"
                    value={mood}
                    onChange={(e) => setMood(e.target.value)}
                    style={{ width: "100%" }}
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
                <div className="field-row-stacked" style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label htmlFor="wizard-bio" style={{ fontWeight: "bold", fontSize: "13px" }}>asl Profile Bio:</label>
                  <textarea 
                    id="wizard-bio"
                    rows="3"
                    placeholder="Write something about yourself or your night out..."
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    style={{ width: "100%", fontFamily: "Arial, sans-serif", fontSize: "14px" }}
                  />
                </div>
                <div className="field-row-stacked" style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label htmlFor="wizard-theme" style={{ fontWeight: "bold", fontSize: "13px" }}>Profile Theme Style Preset:</label>
                  <select 
                    id="wizard-theme"
                    value={profileTheme}
                    onChange={(e) => setProfileTheme(e.target.value)}
                    style={{ width: "100%" }}
                  >
                    <option value="classic">Classic asl (Blue/Pink)</option>
                    <option value="glitter">Pink Glitter & Hearts 💖</option>
                    <option value="cyberpunk">Cyberpunk CRT (Black/Neon Green)</option>
                    <option value="sunset">Retro Sunset Gradient 🌅</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {step === 5 && (
            <div>
              <h3 style={{ margin: "0 0 8px 0", fontSize: "16px", color: "#003399" }}>Step 5: Confirm Installation</h3>
              <p style={{ margin: "0 0 12px 0", fontSize: "13px", lineHeight: "1.4", color: "#555" }}>
                Your connection report is compiled and ready to write to the Firestore board. Review the properties below:
              </p>

              <div className="beveled-box" style={{ height: "180px", overflowY: "auto", fontSize: "13px", gap: "6px", border: "1px solid #ccc", padding: "10px" }}>
                <div>📂 <strong>Target Venue:</strong> {selectedVenue?.name}</div>
                <div>📍 <strong>Address:</strong> {selectedVenue?.formatted_address}</div>
                <div>📅 <strong>Date/Time:</strong> {formatDatetime(datetimeVal).dateStr} @ {formatDatetime(datetimeVal).timeStr}</div>
                <div>👤 <strong>Poster Profile:</strong> {username} (Avatar: {emojiAvatar}, Mood: {mood}, Theme: {profileTheme})</div>
                <div style={{ borderTop: "1px solid #eee", marginTop: "8px", paddingTop: "8px" }}>
                  <strong>Message Summary:</strong>
                  <p style={{ margin: "4px 0 0 0", fontStyle: "italic", whiteSpace: "pre-wrap", color: "#333", lineHeight: "1.4" }}>
                    "About Me: {fieldA} | About You: {fieldB} | Context: {fieldC}"
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Error notifications */}
        {errorMsg && (
          <div style={{ color: "red", fontSize: "12px", fontWeight: "bold", padding: "8px", backgroundColor: "#fff", border: "1px solid red", borderRadius: "4px", marginBottom: "10px" }}>
            {errorMsg}
          </div>
        )}

        {/* Wizard Navigation Actions */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", borderTop: "1px solid #eee", paddingTop: "12px", marginTop: "12px" }}>
          <button 
            onClick={handleBack} 
            disabled={step === 1}
            style={{ minHeight: "44px", cursor: "pointer" }}
          >
            &lt; Back
          </button>
          
          {step < 5 ? (
            <button onClick={handleNext} style={{ minHeight: "44px", cursor: "pointer" }}>
              Next &gt;
            </button>
          ) : (
            <button onClick={handleFinish} className="default" style={{ minHeight: "44px", cursor: "pointer", backgroundColor: "#ffcc99", color: "#cc6600", fontWeight: "bold" }}>
              Finish
            </button>
          )}

          <button onClick={onClose} style={{ minHeight: "44px", cursor: "pointer" }}>
            Cancel
          </button>
        </div>

      </div>
    </div>
  );
}
