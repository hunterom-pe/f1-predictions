import { useState } from "react";
import TitleBar from "./TitleBar";
import { searchVenues } from "../services/foursquare";

/**
 * Windows 98 Setup Wizard for creating missed connections.
 * @param {object} props
 * @param {Function} props.onClose Close handler
 * @param {Function} props.onSubmit Submit handler (saves post to db)
 */
export default function Wizard({ onClose, onSubmit }) {
  const [step, setStep] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [venuesList, setVenuesList] = useState([]);
  const [selectedVenue, setSelectedVenue] = useState(null);
  const [isSearching, setIsSearching] = useState(false);

  // Step 2 Form States
  const [date, setDate] = useState(new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }));
  const [timeRange, setTimeRange] = useState("10:00 PM - 11:30 PM");

  // Step 3 Form States
  const [text, setText] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

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

  const handleNext = () => {
    if (step === 1 && !selectedVenue) {
      setErrorMsg("Please select a nightlife venue to continue.");
      return;
    }
    if (step === 2 && !date) {
      setErrorMsg("Please input a valid date.");
      return;
    }
    if (step === 3) {
      const validationError = validateText(text);
      if (validationError) {
        setErrorMsg(validationError);
        return;
      }
      if (!text.trim()) {
        setErrorMsg("Please type a description of your missed connection.");
        return;
      }
      if (text.length > 1000) {
        setErrorMsg("Character limit exceeded (maximum 1000 characters).");
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
    onSubmit({
      venueId: selectedVenue.fsq_id,
      venueName: selectedVenue.name,
      venueAddress: selectedVenue.address,
      venueCity: selectedVenue.city,
      venueZone: selectedVenue.zone,
      date,
      timeRange,
      text
    });
  };

  return (
    <div 
      className="window-container mobile-maximized"
      style={{
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: "480px",
        height: "360px",
        zIndex: 105000,
        boxShadow: "2px 2px 25px rgba(0, 0, 0, 0.4)"
      }}
    >
      <div className="window" style={{ height: "100%" }}>
        <TitleBar title="Add Missed Connection Wizard" onClose={onClose} />
        
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          {/* Wizard Classic Left Sidebar */}
          <div 
            className="start-menu-sidebar" 
            style={{ 
              width: "40px", 
              writingMode: "vertical-rl", 
              padding: "15px 4px", 
              fontSize: "16px",
              letterSpacing: "2px",
              boxSizing: "border-box"
            }}
          >
            Connection Wizard
          </div>

          {/* Wizard Content Right Area */}
          <div className="window-body" style={{ flex: 1, backgroundColor: "#dcdcdc", padding: "12px", display: "flex", flexDirection: "column", justifyContent: "space-between", overflowY: "auto" }}>
            
            {/* Step Content */}
            <div style={{ flex: 1 }}>
              
              {step === 1 && (
                <div>
                  <h3 style={{ margin: "0 0 8px 0", fontSize: "14px" }}>Step 1: Choose Location</h3>
                  <p style={{ margin: "0 0 10px 0", fontSize: "11px", lineHeight: "1.3" }}>
                    Search for the bar, lounge, or club where you encountered the person. Foursquare Places database will fetch address information.
                  </p>
                  
                  <form onSubmit={handleSearch} style={{ display: "flex", gap: "4px", marginBottom: "8px" }}>
                    <input 
                      type="text" 
                      placeholder="e.g. Cobra Arcade" 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <button type="submit" disabled={isSearching}>
                      {isSearching ? "Searching..." : "Search"}
                    </button>
                  </form>

                  <div className="beveled-box" style={{ height: "110px", overflowY: "auto", padding: "0" }}>
                    {venuesList.length === 0 ? (
                      <p style={{ margin: "10px", fontSize: "11px", color: "#808080", fontStyle: "italic", textAlign: "center" }}>
                        Search for a venue above (try "Cobra", "Valley", "Casey", "Union")
                      </p>
                    ) : (
                      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                        {venuesList.map(v => (
                          <li 
                            key={v.fsq_id}
                            onClick={() => setSelectedVenue(v)}
                            style={{
                              padding: "4px 8px",
                              fontSize: "11px",
                              cursor: "pointer",
                              backgroundColor: selectedVenue?.fsq_id === v.fsq_id ? "#000080" : "transparent",
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
                    <div style={{ fontSize: "10px", marginTop: "4px", color: "#404040" }}>
                      📍 Selected: <strong>{selectedVenue.name}</strong>, {selectedVenue.formatted_address}
                    </div>
                  )}
                </div>
              )}

              {step === 2 && (
                <div>
                  <h3 style={{ margin: "0 0 8px 0", fontSize: "14px" }}>Step 2: Choose Date & Time</h3>
                  <p style={{ margin: "0 0 10px 0", fontSize: "11px", lineHeight: "1.3" }}>
                    Select the date and time interval when you crossed paths with the mystery connection.
                  </p>

                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <div className="field-row-stacked">
                      <label htmlFor="wizard-date">Date:</label>
                      <input 
                        id="wizard-date" 
                        type="text" 
                        value={date} 
                        onChange={(e) => setDate(e.target.value)} 
                        placeholder="e.g. May 22, 2026"
                      />
                    </div>
                    
                    <div className="field-row-stacked">
                      <label htmlFor="wizard-time">Approximate Time Range:</label>
                      <select 
                        id="wizard-time" 
                        value={timeRange} 
                        onChange={(e) => setTimeRange(e.target.value)}
                        style={{ width: "100%" }}
                      >
                        <option>9:00 PM - 10:00 PM</option>
                        <option>10:00 PM - 11:00 PM</option>
                        <option>11:00 PM - 12:00 AM</option>
                        <option>12:00 AM - 1:00 AM</option>
                        <option>1:00 AM - 2:00 AM</option>
                        <option>2:00 AM - 3:00 AM</option>
                        <option>Other / Daytime</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div>
                  <h3 style={{ margin: "0 0 8px 0", fontSize: "14px" }}>Step 3: Write Description</h3>
                  <p style={{ margin: "0 0 6px 0", fontSize: "11px", color: "#b22222", fontWeight: "bold" }}>
                    ⚠️ STRICT TEXT-ONLY ZONE. NO IMAGES, URLS, OR FILES ALLOWED.
                  </p>

                  <div className="field-row-stacked">
                    <label htmlFor="wizard-text">Describe the encounter (what they looked like, what they wore, etc.):</label>
                    <textarea 
                      id="wizard-text"
                      rows="6"
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder="I was standing near the arcade machine..."
                      style={{ width: "100%", fontSize: "11px", fontFamily: "Tahoma, sans-serif" }}
                    />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", marginTop: "2px", color: "#505050" }}>
                    <span>Strict plain-text formatting enforced.</span>
                    <span>{text.length} / 1000 characters</span>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div>
                  <h3 style={{ margin: "0 0 8px 0", fontSize: "14px" }}>Step 4: Confirm Installation</h3>
                  <p style={{ margin: "0 0 10px 0", fontSize: "11px", lineHeight: "1.3" }}>
                    Your connection report is compiled and ready to write to the Firestore board. Review the properties below:
                  </p>

                  <div className="beveled-box" style={{ height: "130px", overflowY: "auto", fontSize: "11px", gap: "4px" }}>
                    <div>📂 <strong>Target Venue:</strong> {selectedVenue?.name}</div>
                    <div>📍 <strong>Address:</strong> {selectedVenue?.formatted_address}</div>
                    <div>📅 <strong>Date/Time:</strong> {date} @ {timeRange}</div>
                    <div style={{ borderTop: "1px solid #808080", marginTop: "4px", paddingTop: "4px" }}>
                      📝 <strong>Message Summary:</strong>
                      <p style={{ margin: "4px 0 0 0", fontStyle: "italic", whiteSpace: "pre-wrap", color: "#303030" }}>
                        "{text}"
                      </p>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Error notifications */}
            {errorMsg && (
              <div style={{ color: "red", fontSize: "11px", fontWeight: "bold", padding: "4px", backgroundColor: "#fff", border: "1px solid red", marginBottom: "8px" }}>
                {errorMsg}
              </div>
            )}

            {/* Wizard Navigation Actions */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px", borderTop: "1px solid #808080", paddingTop: "8px", marginTop: "8px" }}>
              <button 
                onClick={handleBack} 
                disabled={step === 1}
              >
                &lt; Back
              </button>
              
              {step < 4 ? (
                <button onClick={handleNext}>
                  Next &gt;
                </button>
              ) : (
                <button onClick={handleFinish} className="default">
                  Finish
                </button>
              )}

              <button onClick={onClose}>
                Cancel
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
