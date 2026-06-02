import { useState } from "react";
import TitleBar from "./TitleBar";
import { searchVenues } from "../services/foursquare";
import { moderateTextWithGemini } from "../services/security";



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

/**
 * MySpace/Web 2.0 styled Creation Wizard for missed connections.
 * @param {object} props
 * @param {Function} props.onClose Close handler
 * @param {Function} props.onSubmit Submit handler (saves post to db)
 */
export default function Wizard({ onClose, onSubmit, preselectedVenue = null, currentUserProfile = null, onModerationError = null, city = "Phoenix" }) {
  const [step, setStep] = useState(preselectedVenue ? 2 : 1);
  const [searchQuery, setSearchQuery] = useState("");
  const [venuesList, setVenuesList] = useState([]);
  const [selectedVenue, setSelectedVenue] = useState(preselectedVenue);
  const [isSearching, setIsSearching] = useState(false);
  const [isModerating, setIsModerating] = useState(false);

  // Step 2 Form States (7-Day Scarcity)
  const [datetimeVal, setDatetimeVal] = useState(() => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  });
  const [minDatetime] = useState(() => new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16));
  const [maxDatetime] = useState(() => new Date().toISOString().slice(0, 16));

  // Step 3 Form States (Mad Libs Matrix)
  const [fieldA, setFieldA] = useState("");
  const [fieldB, setFieldB] = useState("");
  const [fieldC, setFieldC] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [showHelp, setShowHelp] = useState(false);

  // Step 4 Profile Customization States
  const username = currentUserProfile?.username || "";
  const mood = currentUserProfile?.mood || "Chillin' 😎";
  const bio = currentUserProfile?.bio || "Welcome to my ASL profile!";
  const profileTheme = currentUserProfile?.profileTheme || "classic";
  const emojiAvatar = currentUserProfile?.emoji_avatar || "👥🥃💖";

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const results = await searchVenues(searchQuery, city);
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

  const handleNext = async () => {
    if (step === 1) {
      if (!selectedVenue) {
        setErrorMsg("Please select a nightlife venue to continue.");
        return;
      }
      const userHomeCity = currentUserProfile?.homeCity || currentUserProfile?.selectedCity || city;
      if (selectedVenue.city.toLowerCase() !== userHomeCity.toLowerCase()) {
        const funnyMessages = [
          `Wrong city, bro. Stick to your own turf in ${userHomeCity}!`,
          `Nice try, traveler. The server admin caught you trying to post in ${selectedVenue.city} from your home node in ${userHomeCity}.`,
          `Error: Metropolitan mismatch. You are registered in ${userHomeCity}. No cross-posting allowed!`,
          `You sure you're there, fam? The database daemon says you're posting in ${selectedVenue.city} but your account is based in ${userHomeCity}.`,
          `Bzzzt! Portal mismatch. You cannot post to ${selectedVenue.city} while logged into the ${userHomeCity} node.`,
          `Geographic lock engaged. Go back to your own ${userHomeCity} node, bestie.`
        ];
        const randomMsg = funnyMessages[Math.floor(Math.random() * funnyMessages.length)];
        setErrorMsg(randomMsg);
        return;
      }
    }
    if (step === 2) {
      if (!datetimeVal) {
        setErrorMsg("Please select a valid date and time.");
        return;
      }
      const selectedTime = new Date(datetimeVal).getTime();
      const cutoffTime = Date.now() - 7 * 24 * 60 * 60 * 1000;
      if (selectedTime < cutoffTime) {
        setErrorMsg("Error: Encounter timestamp cannot be older than 7 days. Connection expired.");
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

      // Run Gemini moderation before moving to step 4 (Confirmation)
      setIsModerating(true);
      setErrorMsg("");
      try {
        const concatenatedText = `About Me: ${fieldA} | About You: ${fieldB} | Context: ${fieldC}`;
        const moderation = await moderateTextWithGemini(concatenatedText, "post");
        if (!moderation.approved) {
          const roasts = moderation.category === "doxxing" ? DOXXING_ROASTS : SPAM_ROASTS;
          const randomRoast = roasts[Math.floor(Math.random() * roasts.length)];
          if (onModerationError) {
            onModerationError(randomRoast);
          } else {
            setErrorMsg(randomRoast);
          }
          setIsModerating(false);
          return;
        }
      } catch (err) {
        console.error("Gemini Moderation Error:", err);
      } finally {
        setIsModerating(false);
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
    <div style={{ 
      width: "100%", 
      flex: 1, 
      display: "flex", 
      flexDirection: "column", 
      minHeight: 0,
      border: "1px solid #6699cc",
      backgroundColor: "#ffffff",
      boxShadow: "0px 4px 15px rgba(0,0,0,0.15)",
      fontFamily: "Arial, sans-serif"
    }}>
      {/* Title Bar */}
      <div style={{ 
        backgroundColor: "#6699cc", 
        color: "#ffffff", 
        fontWeight: "bold", 
        fontSize: "14px", 
        padding: "8px 12px", 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center" 
      }}>
        <span>Add Missed Connection Wizard</span>
        <span 
          onClick={onClose} 
          style={{ 
            cursor: "pointer", 
            fontWeight: "bold", 
            fontSize: "16px",
            color: "#ffffff",
            padding: "0 4px"
          }}
        >
          ✕
        </span>
      </div>
      
      {/* Wizard Header Banner */}
      <div style={{
        background: "linear-gradient(90deg, #6699cc 0%, #ff99cc 100%)",
        color: "white",
        padding: "16px 20px",
        textAlign: "left",
        width: "100%",
        boxSizing: "border-box"
      }}>
        <h1 style={{ margin: 0, fontSize: "20px", fontWeight: "bold", fontFamily: "Arial, sans-serif" }}>Create Missed Connection</h1>
        <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#fff0f5", fontFamily: "Arial, sans-serif" }}>Step {step} of 4 - Post your encounter online</p>
      </div>

      <div style={{ flex: 1, backgroundColor: "#fff", padding: "16px", display: "flex", flexDirection: "column", margin: 0, minHeight: 0 }}>
        
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
                  style={{ flex: 1, minHeight: "44px", padding: "0 10px", border: "1px solid #ff99cc", borderRadius: "2px" }}
                />
                <button 
                  type="submit" 
                  disabled={isSearching} 
                  style={{ 
                    minHeight: "44px", 
                    cursor: isSearching ? "not-allowed" : "pointer", 
                    backgroundColor: "#6699cc", 
                    color: "white", 
                    border: "1px solid #4a7ebb", 
                    fontWeight: "bold",
                    fontSize: "13px",
                    padding: "0 16px"
                  }}
                >
                  {isSearching ? "Searching..." : "Search"}
                </button>
              </form>

              <div style={{ height: "180px", overflowY: "auto", padding: "0", border: "1px solid #ff99cc" }}>
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
                          backgroundColor: selectedVenue?.fsq_id === v.fsq_id ? "#6699cc" : "transparent",
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
                <div style={{ fontSize: "12px", marginTop: "8px", color: "#333", backgroundColor: "#f2f6ff", padding: "8px", border: "1px solid #6699cc", borderRadius: "4px" }}>
                  📍 Selected: <strong>{selectedVenue.name}</strong>, {selectedVenue.formatted_address}
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div>
              <h3 style={{ margin: "0 0 8px 0", fontSize: "16px", color: "#003399" }}>Step 2: Choose Date & Time</h3>
              <p style={{ margin: "0 0 12px 0", fontSize: "13px", lineHeight: "1.4", color: "#555" }}>
                Select the exact date and time when you crossed paths with the mystery connection. Encounters are strictly limited to the last 7 days.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label htmlFor="wizard-datetime" style={{ fontWeight: "bold", fontSize: "13px" }}>Date & Time of Encounter:</label>
                  <input 
                    id="wizard-datetime" 
                    type="datetime-local" 
                    value={datetimeVal} 
                    onChange={(e) => setDatetimeVal(e.target.value)} 
                    min={minDatetime}
                    max={maxDatetime}
                    style={{ width: "100%", minHeight: "44px", padding: "0 10px", border: "1px solid #ff99cc", borderRadius: "2px", boxSizing: "border-box" }}
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
                    style={{ width: "100%", minHeight: "40px", padding: "0 10px", border: "1px solid #ff99cc", borderRadius: "2px", boxSizing: "border-box" }}
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
                    style={{ width: "100%", minHeight: "40px", padding: "0 10px", border: "1px solid #ff99cc", borderRadius: "2px", boxSizing: "border-box" }}
                  />
                  <span style={{ fontSize: "10px", color: "#666", alignSelf: "flex-end" }}>{fieldB.length}/50</span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  <label htmlFor="wizard-field-c" style={{ fontSize: "13px", fontWeight: "bold" }}>Field C: Context & Night Details (Max 140 chars):</label>
                  <textarea 
                    id="wizard-field-c"
                    rows={showHelp ? 3 : 4}
                    value={fieldC}
                    onChange={(e) => setFieldC(e.target.value)}
                    placeholder="e.g. Near Galaga machine around 11 PM. You played 'Love Will Tear Us Apart' twice. Drinks on me?"
                    maxLength={140}
                    style={{ width: "100%", fontSize: "14px", fontFamily: "Arial, sans-serif", padding: "8px 10px", border: "1px solid #ff99cc", borderRadius: "2px", boxSizing: "border-box" }}
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
              <h3 style={{ margin: "0 0 8px 0", fontSize: "16px", color: "#003399" }}>Step 4: Confirm Installation</h3>
              <p style={{ margin: "0 0 12px 0", fontSize: "13px", lineHeight: "1.4", color: "#555" }}>
                Your connection report is compiled and ready to write to the Firestore board. Review the properties below:
              </p>

              <div style={{ minHeight: "180px", height: "auto", fontSize: "13px", display: "flex", flexDirection: "column", gap: "6px", border: "1px solid #ff99cc", padding: "10px" }}>
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
          <div style={{ color: "red", fontSize: "12px", fontWeight: "bold", padding: "8px", backgroundColor: "#fff5fa", border: "1px solid red", borderRadius: "4px", marginBottom: "10px" }}>
            {errorMsg}
          </div>
        )}

        {/* Wizard Navigation Actions */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", borderTop: "1px solid #eee", paddingTop: "12px", marginTop: "12px" }}>
          <button 
            onClick={handleBack} 
            disabled={step === 1 || isModerating}
            style={{ 
              minHeight: "44px", 
              cursor: (step === 1 || isModerating) ? "not-allowed" : "pointer",
              backgroundColor: "#dfdfdf",
              color: "#333",
              border: "1px solid #b5b5b5",
              fontSize: "12px",
              padding: "0 16px",
              opacity: (step === 1 || isModerating) ? 0.5 : 1
            }}
          >
            &lt; Back
          </button>
          
          {step < 4 ? (
            <button 
              onClick={handleNext} 
              disabled={isModerating} 
              style={{ 
                minHeight: "44px", 
                cursor: isModerating ? "not-allowed" : "pointer",
                backgroundColor: "#6699cc",
                color: "white",
                border: "1px solid #4a7ebb",
                fontSize: "12px",
                padding: "0 16px",
                fontWeight: "bold"
              }}
            >
              {isModerating ? "Checking..." : "Next >"}
            </button>
          ) : (
            <button 
              onClick={handleFinish} 
              style={{ 
                minHeight: "44px", 
                cursor: "pointer", 
                backgroundColor: "#ffcc99", 
                color: "#cc6600", 
                border: "1px solid #cc9966",
                fontWeight: "bold",
                fontSize: "12px",
                padding: "0 16px"
              }}
            >
              Finish
            </button>
          )}

          <button 
            onClick={onClose} 
            style={{ 
              minHeight: "44px", 
              cursor: "pointer",
              backgroundColor: "#dfdfdf",
              color: "#333",
              border: "1px solid #b5b5b5",
              fontSize: "12px",
              padding: "0 16px"
            }}
          >
            Cancel
          </button>
        </div>

      </div>
    </div>
  );
}
