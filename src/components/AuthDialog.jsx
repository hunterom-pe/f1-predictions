import { useState } from "react";
import { 
  firebaseSignInWithEmailAndPassword, 
  firebaseLinkWithCredential 
} from "../firebase";

/**
 * MySpace-styled Login / Registration Dialog Box.
 * @param {object} props
 * @param {Function} props.onClose Close handler
 * @param {Function} props.onSuccess Callback on successful authentication/link
 */
export default function AuthDialog({ onClose, onSuccess }) {
  const [activeTab, setActiveTab] = useState("register"); // Default to Register to encourage upgrading
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    
    if (!email || !password) {
      triggerError("Fields cannot be left blank.");
      return;
    }

    if (activeTab === "register") {
      if (password !== confirmPassword) {
        triggerError("Passwords do not match. Please verify settings.");
        return;
      }
      if (password.length < 6) {
        triggerError("Password must be at least 6 characters.");
        return;
      }

      setLoading(true);
      try {
        await firebaseLinkWithCredential(email, password);
        setLoading(false);
        onSuccess();
      } catch (err) {
        setLoading(false);
        let msg = err.message;
        if (msg.includes("email-already-in-use")) {
          msg = "This email is already registered. Please log in instead.";
        } else if (msg.includes("invalid-email")) {
          msg = "The email address is badly formatted.";
        }
        triggerError(msg);
      }
    } else {
      // Login mode
      setLoading(true);
      try {
        await firebaseSignInWithEmailAndPassword(email, password);
        setLoading(false);
        onSuccess();
      } catch (err) {
        setLoading(false);
        let msg = err.message;
        if (msg.includes("wrong-password") || msg.includes("user-not-found") || msg.includes("wrong-password-or-user")) {
          msg = "Invalid email or password. Access denied.";
        } else if (msg.includes("user-disabled")) {
          msg = "This account has been terminated due to policy violations.";
        }
        triggerError(msg);
      }
    }
  };

  const triggerError = (msg) => {
    setErrorMsg(msg);
    setShowErrorDialog(true);
  };

  return (
    <>
      <div className="auth-window" style={{ width: "100%", display: "flex", flexDirection: "column" }}>
        <div className="auth-title-bar">
          <div className="auth-title-bar-text">Enter Network Password</div>
          <button 
            type="button" 
            className="auth-close-button" 
            onClick={onClose}
            aria-label="Close"
          >
            X
          </button>
        </div>
        
        <div className="auth-tabs">
          <button 
            type="button"
            className={`auth-tab ${activeTab === "register" ? "active" : ""}`}
            onClick={() => setActiveTab("register")}
          >
            New Registration
          </button>
          <button 
            type="button"
            className={`auth-tab ${activeTab === "login" ? "active" : ""}`}
            onClick={() => setActiveTab("login")}
          >
            Existing Account Log In
          </button>
        </div>

        <div style={{ borderTop: "none", backgroundColor: "#f2f2f2" }}>
          <form onSubmit={handleSubmit}>
            <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "12px" }}>
              <fieldset className="auth-fieldset">
                <legend className="auth-legend">
                  {activeTab === "register" 
                    ? "Upgrade Anonymous Account" 
                    : "Type a user name and password to log in"}
                </legend>
                
                <p style={{ margin: "0 0 10px 0", fontSize: "11px", lineHeight: "1.3", color: "#333333" }}>
                  {activeTab === "register"
                    ? "By registering, you upgrade your temporary guest account to a permanent profile. Your history and connection drafts will be preserved."
                    : "Connecting to asl network neighborhood database."}
                </p>

                <div className="field-row-stacked" style={{ marginBottom: "8px", display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label htmlFor="auth-email" style={{ fontSize: "11px", fontWeight: "bold" }}>Email Address:</label>
                  <input 
                    id="auth-email" 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    placeholder="username@domain.com"
                    className="auth-input"
                    style={{ width: "100%" }}
                  />
                </div>

                <div className="field-row-stacked" style={{ marginBottom: "8px", display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label htmlFor="auth-pass" style={{ fontSize: "11px", fontWeight: "bold" }}>Password:</label>
                  <input 
                    id="auth-pass" 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    className="auth-input"
                    style={{ width: "100%" }}
                  />
                </div>

                {activeTab === "register" && (
                  <div className="field-row-stacked" style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <label htmlFor="auth-confirm" style={{ fontSize: "11px", fontWeight: "bold" }}>Confirm Password:</label>
                    <input 
                      id="auth-confirm" 
                      type="password" 
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={loading}
                      className="auth-input"
                      style={{ width: "100%" }}
                    />
                  </div>
                )}
              </fieldset>

              <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "4px" }}>
                <button 
                  type="submit" 
                  className="auth-btn-primary" 
                  disabled={loading}
                  style={{ minWidth: "100px", minHeight: "44px" }}
                >
                  {loading ? "Waiting..." : activeTab === "register" ? "Register" : "OK"}
                </button>
                <button 
                  type="button" 
                  className="auth-btn-secondary"
                  onClick={onClose} 
                  disabled={loading}
                  style={{ minWidth: "80px", minHeight: "44px" }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Critical System Error Popup Dialog */}
      {showErrorDialog && (
        <div 
          className="window-container" 
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "280px",
            zIndex: 120000,
            boxShadow: "5px 5px 0px rgba(0, 0, 0, 0.3)"
          }}
        >
          <div className="auth-window">
            <div className="auth-title-bar" style={{ backgroundColor: "#ff007f" }}>
              <div className="auth-title-bar-text">Network Error</div>
              <button 
                type="button" 
                className="auth-close-button" 
                onClick={() => setShowErrorDialog(false)}
                aria-label="Close"
              >
                X
              </button>
            </div>
            <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                <span style={{ fontSize: "28px" }}>⚠️</span>
                <p style={{ margin: 0, fontSize: "11px", lineHeight: "1.3", color: "#000000" }}>
                  {errorMsg}
                </p>
              </div>
              <div style={{ display: "flex", justifyContent: "center", marginTop: "6px" }}>
                <button 
                  type="button"
                  className="auth-btn-secondary"
                  onClick={() => setShowErrorDialog(false)} 
                  style={{ width: "60px", minHeight: "30px" }}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

