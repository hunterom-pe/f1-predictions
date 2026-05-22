import { useEffect, useState } from "react";

/**
 * Full-screen Windows 98 Blue Screen of Death (BSOD) lockout component.
 */
export default function BSOD() {
  const [keypressCount, setKeypressCount] = useState(0);

  useEffect(() => {
    // Intercept all keyboard events to enforce the lockout message
    const handleKeyDown = (e) => {
      e.preventDefault();
      setKeypressCount(prev => prev + 1);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div className="bsod-screen">
      <div className="bsod-content">
        <div style={{ textAlign: "center", marginBottom: "30px" }}>
          <span className="bsod-title">RetroConnect</span>
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

        <div style={{ textAlign: "center", marginTop: "40px" }}>
          Press any key to remain locked in safe mode . . .
        </div>
      </div>
    </div>
  );
}
