import { useEffect, useState } from "react";
import { dbAddDoc } from "../firebase";

/**
 * Full-screen Windows 98 Blue Screen of Death (BSOD) lockout component.
 */
export default function BSOD({ currentUser, deviceUuid }) {
  const [keypressCount, setKeypressCount] = useState(0);
  const [appealText, setAppealText] = useState("");
  const [appealSent, setAppealSent] = useState(false);
  const [appealError, setAppealError] = useState("");

  useEffect(() => {
    // Intercept all keyboard events only if they are not typing in the textarea
    const handleKeyDown = (e) => {
      if (e.target.tagName === "TEXTAREA" || e.target.tagName === "INPUT") {
        return;
      }
      e.preventDefault();
      setKeypressCount(prev => prev + 1);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleAppealSubmit = async (e) => {
    e.preventDefault();
    if (!appealText.trim()) return;
    try {
      await dbAddDoc("appeals", {
        userId: currentUser?.uid || "unknown",
        email: currentUser?.email || "anonymous",
        deviceUuid: deviceUuid || "",
        reason: appealText.trim(),
        timestamp: Date.now(),
        status: "pending"
      });
      setAppealSent(true);
      setAppealText("");
    } catch (err) {
      setAppealError(err.message || "Failed to submit appeal.");
    }
  };

  return (
    <div className="bsod-screen" style={{ overflowY: "auto", padding: "20px" }}>
      <div className="bsod-content" style={{ maxWidth: "650px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "30px" }}>
          <span className="bsod-title">asl</span>
        </div>

        <p>A fatal exception 0x000000FA has occurred at system governance layer. The current user session has been terminated due to policy violations.</p>
        
        <p style={{ margin: "20px 0" }}>
          *  3 flag reports have been filed against this account by independent peers.<br />
          *  The account credentials have been suspended in Firebase Auth database.<br />
          *  The Capacitor Device UUID has been added to the hardware blocklist.<br />
          *  Any subsequent guest or registration registrations from this device are blocked.
        </p>

        <p>System access terminated due to policy violation. Pressing keys will not restore connection.</p>
        
        {keypressCount > 0 && (
          <p style={{ color: "#ffff55", fontWeight: "bold", marginTop: "20px", textTransform: "uppercase", textAlign: "center" }}>
            *** Keypress detected: {keypressCount} attempt(s). Connection remains blocked. ***
          </p>
        )}

        <div style={{ border: "2px dashed #ffffff", padding: "15px", marginTop: "30px", backgroundColor: "rgba(0,0,0,0.2)" }}>
          <h4 style={{ margin: "0 0 10px 0", color: "#ffff55" }}>SYSOP APPEAL CHANNELS</h4>
          
          {appealSent ? (
            <p style={{ color: "#55ff55", fontWeight: "bold", margin: 0 }}>
              YOUR APPEAL TRANSMISSION WAS RECEIVED. SYSOP ADMINISTRATOR WILL AUDIT TERMINAL LOGS.
            </p>
          ) : (
            <form onSubmit={handleAppealSubmit}>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <label htmlFor="appeal-input" style={{ fontSize: "12px" }}>
                  IF THIS IS AN UNJUST BAN, ENTER BRIEF APPEAL EXPLANATION BELOW:
                </label>
                <textarea
                  id="appeal-input"
                  value={appealText}
                  onChange={(e) => setAppealText(e.target.value)}
                  maxLength={300}
                  style={{
                    backgroundColor: "transparent",
                    color: "#ffffff",
                    border: "1px solid #ffffff",
                    fontFamily: "Courier New, monospace",
                    fontSize: "13px",
                    padding: "8px",
                    width: "100%",
                    minHeight: "60px",
                    boxSizing: "border-box"
                  }}
                  placeholder="e.g. Please review logs, flags are unjustified spite bans..."
                />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "11px" }}>Max 300 characters</span>
                  <button
                    type="submit"
                    style={{
                      backgroundColor: "#ffffff",
                      color: "#0000aa",
                      border: "none",
                      padding: "6px 12px",
                      fontFamily: "Courier New, monospace",
                      fontWeight: "bold",
                      cursor: "pointer"
                    }}
                  >
                    SEND APPEAL
                  </button>
                </div>
              </div>
            </form>
          )}
          {appealError && <p style={{ color: "red", margin: "10px 0 0 0" }}>{appealError}</p>}
        </div>

        <div style={{ textAlign: "center", marginTop: "40px" }}>
          Press any key to remain locked in safe mode . . .
        </div>
      </div>
    </div>
  );
}

