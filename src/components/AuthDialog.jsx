import { useState } from "react";
import TitleBar from "./TitleBar";
import { 
  firebaseSignInWithEmailAndPassword, 
  firebaseLinkWithCredential 
} from "../firebase";

/**
 * Windows 98-styled Login / Registration Dialog Box.
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
      <div 
        className="window-container mobile-maximized"
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "350px",
          zIndex: 110000,
          boxShadow: "2px 2px 20px rgba(0, 0, 0, 0.4)"
        }}
      >
        <div className="window">
          <TitleBar title="Enter Network Password" onClose={onClose} />
          
          <menu role="tablist" style={{ padding: "6px 6px 0 6px", margin: 0 }}>
            <li role="tab" aria-selected={activeTab === "register"}>
              <a href="#register" onClick={(e) => { e.preventDefault(); setActiveTab("register"); }}>
                New Registration
              </a>
            </li>
            <li role="tab" aria-selected={activeTab === "login"}>
              <a href="#login" onClick={(e) => { e.preventDefault(); setActiveTab("login"); }}>
                Existing Account Log In
              </a>
            </li>
          </menu>

          <div className="window" role="tabpanel" style={{ borderTop: "none" }}>
            <form onSubmit={handleSubmit}>
              <div className="window-body" style={{ gap: "12px" }}>
                <fieldset>
                  <legend>
                    {activeTab === "register" 
                      ? "Upgrade Anonymous Account" 
                      : "Type a user name and password to log in"}
                  </legend>
                  
                  <p style={{ margin: "0 0 10px 0", fontSize: "11px", lineHeight: "1.3" }}>
                    {activeTab === "register"
                      ? "By registering, you upgrade your temporary guest account to a permanent profile. Your history and connection drafts will be preserved."
                      : "Connecting to RetroConnect network neighborhood database."}
                  </p>

                  <div className="field-row-stacked" style={{ marginBottom: "8px" }}>
                    <label htmlFor="auth-email">Email Address:</label>
                    <input 
                      id="auth-email" 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading}
                      placeholder="username@domain.com"
                      style={{ width: "100%", boxSizing: "border-box" }}
                    />
                  </div>

                  <div className="field-row-stacked" style={{ marginBottom: "8px" }}>
                    <label htmlFor="auth-pass">Password:</label>
                    <input 
                      id="auth-pass" 
                      type="password" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                      style={{ width: "100%", boxSizing: "border-box" }}
                    />
                  </div>

                  {activeTab === "register" && (
                    <div className="field-row-stacked">
                      <label htmlFor="auth-confirm">Confirm Password:</label>
                      <input 
                        id="auth-confirm" 
                        type="password" 
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        disabled={loading}
                        style={{ width: "100%", boxSizing: "border-box" }}
                      />
                    </div>
                  )}
                </fieldset>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px", marginTop: "4px" }}>
                  <button 
                    type="submit" 
                    className="default" 
                    disabled={loading}
                    style={{ width: "80px" }}
                  >
                    {loading ? "Waiting..." : activeTab === "register" ? "Register" : "OK"}
                  </button>
                  <button 
                    type="button" 
                    onClick={onClose} 
                    disabled={loading}
                    style={{ width: "80px" }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          </div>
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
            boxShadow: "1px 1px 15px rgba(0, 0, 0, 0.5)"
          }}
        >
          <div className="window">
            <TitleBar title="Network Error" onClose={() => setShowErrorDialog(false)} />
            <div className="window-body" style={{ gap: "10px" }}>
              <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                <span style={{ fontSize: "28px" }}>⚠️</span>
                <p style={{ margin: 0, fontSize: "11px", lineHeight: "1.3" }}>
                  {errorMsg}
                </p>
              </div>
              <div style={{ display: "flex", justifyContent: "center", marginTop: "6px" }}>
                <button 
                  onClick={() => setShowErrorDialog(false)} 
                  style={{ width: "60px" }}
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
