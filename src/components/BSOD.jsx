import { useState } from "react";
import { dbAddDoc } from "../firebase";

/**
 * Full-screen Windows 98 Blue Screen of Death (BSOD) lockout component (Simplified).
 */
export default function BSOD({ currentUser, deviceUuid }) {
  const [appealText, setAppealText] = useState("");
  const [appealSent, setAppealSent] = useState(false);
  const [appealError, setAppealError] = useState("");

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
    <div className="bsod-screen" style={{ overflowY: "auto", padding: "40px 20px", display: "flex", alignItems: "center", minHeight: "100vh", boxSizing: "border-box" }}>
      <div className="bsod-content" style={{ maxWidth: "600px", margin: "0 auto", width: "100%", fontFamily: "Courier New, monospace" }}>
        
        <h1 style={{ fontSize: "28px", color: "#ffffff", fontWeight: "bold", margin: "0 0 20px 0", lineHeight: "1.3" }}>
          Three strikes...you've been banned :)
        </h1>
        
        <h2 style={{ fontSize: "24px", color: "#ffffff", fontWeight: "bold", margin: "0 0 40px 0" }}>
          GTFO
        </h2>

        <div style={{ border: "2px dashed #ffffff", padding: "20px", backgroundColor: "rgba(0,0,0,0.2)" }}>
          {appealSent ? (
            <p style={{ color: "#55ff55", fontWeight: "bold", margin: 0, fontSize: "14px" }}>
              YOUR APPEAL TRANSMISSION WAS RECEIVED. SYSOP ADMINISTRATOR WILL AUDIT TERMINAL LOGS.
            </p>
          ) : (
            <form onSubmit={handleAppealSubmit}>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <label htmlFor="appeal-input" style={{ fontSize: "16px", fontWeight: "bold", color: "#ffff55" }}>
                  "I promise to be a good boy"
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
                    fontSize: "14px",
                    padding: "10px",
                    width: "100%",
                    minHeight: "80px",
                    boxSizing: "border-box",
                    outline: "none"
                  }}
                  placeholder="Explain why you should be unbanned..."
                />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "11px", color: "#ccc" }}>Max 300 characters</span>
                  <button
                    type="submit"
                    style={{
                      backgroundColor: "#ffffff",
                      color: "#0000aa",
                      border: "none",
                      padding: "8px 20px",
                      fontFamily: "Courier New, monospace",
                      fontSize: "14px",
                      fontWeight: "bold",
                      cursor: "pointer"
                    }}
                  >
                    SEND
                  </button>
                </div>
              </div>
            </form>
          )}
          {appealError && <p style={{ color: "#ff5555", margin: "10px 0 0 0", fontWeight: "bold" }}>{appealError}</p>}
        </div>

      </div>
    </div>
  );
}
