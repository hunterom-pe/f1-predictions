import { useState } from "react";
import { dbCallFunction } from "../firebase";

/**
 * Full-screen Windows 98 Blue Screen of Death (BSOD) lockout component (Simplified & Mobile Optimized).
 */
export default function BSOD({ currentUser, deviceUuid }) {
  const [appealText, setAppealText] = useState("");
  const [appealSent, setAppealSent] = useState(false);
  const [appealError, setAppealError] = useState("");

  const handleAppealSubmit = async (e) => {
    e.preventDefault();
    if (!appealText.trim()) return;
    try {
      await dbCallFunction("submitAppealSecure", {
        userId: currentUser?.uid || "unknown",
        email: currentUser?.email || "anonymous",
        deviceUuid: deviceUuid || "",
        reason: appealText.trim()
      });
      setAppealSent(true);
      setAppealText("");
    } catch (err) {
      setAppealError(err.message || "Failed to submit appeal.");
    }
  };

  return (
    <div className="bsod-screen" style={{ overflowY: "auto", padding: "30px 15px", display: "flex", alignItems: "center", minHeight: "100vh", boxSizing: "border-box" }}>
      <div className="bsod-content" style={{ maxWidth: "420px", margin: "0 auto", width: "100%", fontFamily: "Courier New, monospace" }}>
        
        <h1 style={{ fontSize: "20px", color: "#ffffff", fontWeight: "bold", margin: "0 0 15px 0", lineHeight: "1.4", textAlign: "left" }}>
          Three strikes...you've been banned :)
        </h1>
        
        <h2 style={{ fontSize: "18px", color: "#ffffff", fontWeight: "bold", margin: "0 0 30px 0", textAlign: "left" }}>
          GTFO
        </h2>

        <div style={{ border: "2px dashed #ffffff", padding: "15px", backgroundColor: "rgba(0,0,0,0.2)" }}>
          {appealSent ? (
            <p style={{ color: "#55ff55", fontWeight: "bold", margin: 0, fontSize: "13px", lineHeight: "1.4" }}>
              YOUR APPEAL TRANSMISSION WAS RECEIVED. SYSOP ADMINISTRATOR WILL AUDIT TERMINAL LOGS.
            </p>
          ) : (
            <form onSubmit={handleAppealSubmit}>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <label htmlFor="appeal-input" style={{ fontSize: "14px", fontWeight: "bold", color: "#ffff55" }}>
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
                    fontSize: "13px",
                    padding: "8px",
                    width: "100%",
                    minHeight: "85px",
                    boxSizing: "border-box",
                    outline: "none",
                    resize: "none"
                  }}
                  placeholder="Explain why you should be unbanned..."
                />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "10px", color: "#ccc" }}>Max 300 characters</span>
                  <button
                    type="submit"
                    style={{
                      backgroundColor: "#ffffff",
                      color: "#0000aa",
                      border: "none",
                      padding: "6px 16px",
                      fontFamily: "Courier New, monospace",
                      fontSize: "13px",
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
          {appealError && <p style={{ color: "#ff5555", margin: "8px 0 0 0", fontWeight: "bold", fontSize: "11px" }}>{appealError}</p>}
        </div>

      </div>
    </div>
  );
}
