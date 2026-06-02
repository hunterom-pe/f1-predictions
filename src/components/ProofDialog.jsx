import { useState } from "react";
import TitleBar from "./TitleBar";

/**
 * "Blind Proof" Connection Verification dialog box.
 * @param {object} props
 * @param {object} props.post The post document being claimed
 * @param {Function} props.onClose Close handler
 * @param {Function} props.onSubmit Submit handler (saves connection request)
 */
export default function ProofDialog({ post, onClose, onSubmit }) {
  const [proofText, setProofText] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const validateText = (input) => {
    const hasBase64Image = /data:image\//i.test(input);
    const hasHtmlImage = /<img/i.test(input);
    const hasMarkdownImage = /!\[.*\]\(.*\)/i.test(input);
    const hasImageExtensions = /\.(jpg|jpeg|png|gif|webp|svg)/i.test(input);

    if (hasBase64Image || hasHtmlImage || hasMarkdownImage || hasImageExtensions) {
      return "ERROR: Images, media attachments, and HTML/markdown tags are strictly prohibited. Text only.";
    }
    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    if (!proofText.trim()) {
      setErrorMsg("Please enter a proof description to send.");
      return;
    }

    const validationError = validateText(proofText);
    if (validationError) {
      setErrorMsg(validationError);
      return;
    }

    if (proofText.length > 500) {
      setErrorMsg("Verification message must be under 500 characters.");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    try {
      await onSubmit(proofText);
    } catch (err) {
      setErrorMsg(err.message || String(err));
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      width: "100%", 
      display: "flex", 
      flexDirection: "column", 
      border: "1px solid #6699cc", 
      backgroundColor: "#ffffff", 
      boxShadow: "0px 4px 15px rgba(0,0,0,0.15)",
      fontFamily: "Arial, sans-serif" 
    }}>
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
        <span>Verify Connection - Blind Proof</span>
        <span 
          onClick={loading ? undefined : onClose} 
          style={{ 
            cursor: loading ? "not-allowed" : "pointer", 
            fontWeight: "bold", 
            fontSize: "16px",
            color: "#ffffff",
            padding: "0 4px",
            opacity: loading ? 0.5 : 1
          }}
        >
          ✕
        </span>
      </div>
      
      <form onSubmit={handleSubmit} style={{ margin: 0 }}>
        <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ border: "1px solid #ff99cc", padding: "12px", backgroundColor: "#fff5fa" }}>
            <h4 style={{ margin: "0 0 6px 0", color: "#b30059", fontSize: "13px", fontWeight: "bold" }}>
              Connection Proof Details
            </h4>
            <p style={{ margin: 0, fontSize: "11px", lineHeight: "1.4", color: "#555" }}>
              Prove to the poster of <strong>{post.venueName}</strong> that you are the person they saw. 
              Type a blind details verification message (e.g. what you were wearing, what you ordered, or a secret word).
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label htmlFor="proof-input" style={{ fontSize: "12px", fontWeight: "bold", color: "#333" }}>
              Enter Proof Description:
            </label>
            <textarea 
              id="proof-input"
              rows="5"
              value={proofText}
              onChange={(e) => setProofText(e.target.value)}
              disabled={loading}
              placeholder="e.g. I was wearing the green corduroy jacket and sitting at the corner of the bar next to the jukebox..."
              style={{ 
                width: "100%", 
                fontSize: "13px", 
                fontFamily: "Arial, sans-serif", 
                minHeight: "100px",
                padding: "8px",
                border: "1px solid #ccc",
                boxSizing: "border-box",
                opacity: loading ? 0.7 : 1
              }}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#666" }}>
            <span>Strict text-only rules apply.</span>
            <span>{proofText.length} / 500 characters</span>
          </div>

          {errorMsg && (
            <div style={{ color: "red", fontSize: "12px", fontWeight: "bold", padding: "8px", backgroundColor: "#fff0f0", border: "1px solid red", borderRadius: "4px" }}>
              {errorMsg}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "4px" }}>
            <button 
              type="submit" 
              disabled={loading}
              style={{ 
                minWidth: "120px", 
                minHeight: "36px", 
                cursor: loading ? "wait" : "pointer", 
                backgroundColor: loading ? "#a0c0e0" : "#6699cc", 
                color: "white", 
                fontWeight: "bold", 
                border: "1px solid #4a7ebb",
                fontSize: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                opacity: loading ? 0.8 : 1
              }}
            >
              {loading ? (
                <>
                  <span className="retro-spinner"></span>
                  Submitting...
                </>
              ) : (
                "Submit Proof"
              )}
            </button>
            <button 
              type="button" 
              onClick={onClose} 
              disabled={loading}
              style={{ 
                minWidth: "80px", 
                minHeight: "36px", 
                cursor: loading ? "not-allowed" : "pointer", 
                backgroundColor: "#dfdfdf", 
                color: "#333", 
                border: "1px solid #b5b5b5",
                fontSize: "12px",
                opacity: loading ? 0.6 : 1
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
