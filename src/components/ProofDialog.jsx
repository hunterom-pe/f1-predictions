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

  const handleSubmit = (e) => {
    e.preventDefault();
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

    onSubmit(proofText);
  };

  return (
    <div className="window" style={{ width: "100%", display: "flex", flexDirection: "column" }}>
      <TitleBar title="Verify Connection - Blind Proof" onClose={onClose} />
      
      <form onSubmit={handleSubmit}>
        <div className="window-body" style={{ gap: "10px" }}>
          <fieldset>
            <legend>Connection Proof Details</legend>
            <p style={{ margin: "0 0 10px 0", fontSize: "11px", lineHeight: "1.3", color: "#303030" }}>
              Prove to the poster of <strong>{post.venueName}</strong> that you are the person they saw. 
              Type a blind details verification message (e.g. what you were wearing, what you ordered, or a secret word).
            </p>

            <div className="field-row-stacked">
              <label htmlFor="proof-input">Enter Proof Description:</label>
              <textarea 
                id="proof-input"
                rows="5"
                value={proofText}
                onChange={(e) => setProofText(e.target.value)}
                placeholder="e.g. I was wearing the green corduroy jacket and sitting at the corner of the bar next to the jukebox..."
                style={{ width: "100%", fontSize: "14px", fontFamily: "Arial, sans-serif", minHeight: "80px" }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginTop: "4px", color: "#505050" }}>
              <span>Strict text-only rules apply.</span>
              <span>{proofText.length} / 500 characters</span>
            </div>
          </fieldset>

          {errorMsg && (
            <div style={{ color: "red", fontSize: "12px", fontWeight: "bold", padding: "6px", backgroundColor: "#fff", border: "1px solid red", borderRadius: "4px" }}>
              {errorMsg}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "4px" }}>
            <button type="submit" className="default" style={{ minWidth: "100px", minHeight: "44px", cursor: "pointer" }}>
              Submit Proof
            </button>
            <button type="button" onClick={onClose} style={{ minWidth: "80px", minHeight: "44px", cursor: "pointer" }}>
              Cancel
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
