import { useState, useEffect, useRef } from "react";
import TitleBar from "./TitleBar";
import { 
  dbOnSnapshot,
  dbAddDoc,
  dbUpdateDoc,
  dbSetDoc,
  dbSubmitReport,
  dbGetDoc
} from "../firebase";
import { 
  enableScreenshotBlocking, 
  disableScreenshotBlocking, 
  setupWebScreenshotDetector,
  moderateChatMessage
} from "../services/security";

// Helper to safely extract milliseconds from various timestamp formats (Number, Firestore Timestamp, Date)
const getTimestampMillis = (ts) => {
  if (!ts) return 0;
  if (typeof ts === "number") return ts;
  if (typeof ts.toMillis === "function") return ts.toMillis();
  if (ts.seconds !== undefined) return ts.seconds * 1000 + (ts.nanoseconds || 0) / 1000000;
  if (ts instanceof Date) return ts.getTime();
  return 0;
};

/**
 * AIM (AOL Instant Messenger) style Chat window.
 * @param {object} props
 * @param {string} props.chatId The ID of the active chat document
 * @param {object} props.connection Associated connection details
 * @param {object} props.currentUser Current authenticated user
 * @param {object} props.userDoc Profile document of current user
 * @param {Function} props.onClose Close handler
 */
export default function AIMChat({ chatId, connection, currentUser, userDoc, onClose }) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [showSecurityAlert, setShowSecurityAlert] = useState(false);
  const [alertReason, setAlertReason] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState(""); // inline moderation error
  
  const chatLogEndRef = useRef(null);

  const otherUserId = connection.senderId === currentUser.uid ? connection.receiverId : connection.senderId;

  const [buddyProfile, setBuddyProfile] = useState(null);

  useEffect(() => {
    if (!otherUserId) return;
    dbGetDoc("profiles", otherUserId).then(snap => {
      if (snap.exists()) {
        setBuddyProfile(snap.data());
      }
    }).catch(err => console.error("Error loading buddy profile in chat:", err));
  }, [otherUserId]);

  // 1. Subscribe to Chat Messages
  useEffect(() => {
    if (!chatId) return;

    const unsub = dbOnSnapshot(
      `chats/${chatId}/messages`,
      [], // We sort them client-side in case timestamp indexing is not built yet
      (snapshot) => {
        const msgs = [];
        snapshot.docs.forEach(doc => {
          msgs.push({ id: doc.id, ...doc.data() });
        });
        // Sort ascending by timestamp (oldest first, newest at the bottom)
        msgs.sort((a, b) => getTimestampMillis(a.timestamp) - getTimestampMillis(b.timestamp));
        setMessages(msgs);
      }
    );

    return () => unsub();
  }, [chatId]);

  // 2. Enable Screenshot Protection on Mount
  useEffect(() => {
    // Enable native Capacitor blocking
    enableScreenshotBlocking();

    // Setup simulated web blocking (detector keys & visibility check)
    const cleanupWebDetector = setupWebScreenshotDetector((reason) => {
      setAlertReason(reason);
      setShowSecurityAlert(true);
    });

    return () => {
      // Disable native blocking
      disableScreenshotBlocking();
      // Cleanup web event listeners
      cleanupWebDetector();
    };
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    chatLogEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || isSending) return;

    // Hard client-side checks: no images or URLs (mirrors Firestore rule)
    const cleanText = inputText.trim();
    const hasBase64Image = /data:image\//i.test(cleanText);
    const hasHtmlImage = /<img/i.test(cleanText);
    const hasMarkdownImage = /!\[.*\]\(.*\)/i.test(cleanText);
    const hasImageExtensions = /\.(jpg|jpeg|png|gif|webp|svg)/i.test(cleanText);

    if (hasBase64Image || hasHtmlImage || hasMarkdownImage || hasImageExtensions) {
      setSendError("System: Images and attachments are not allowed in chat.");
      return;
    }

    setSendError("");
    setIsSending(true);

    try {
      // Light-touch Gemini moderation for chat (blocks hate speech, threats, doxxing;
      // allows mild profanity between consenting adults)
      const modResult = await moderateChatMessage(cleanText);
      if (!modResult.approved) {
        const categoryMessages = {
          doxxing: "System: Personal info, links, and social handles are not allowed in chat.",
          hate: "System: That message was flagged for hate speech or threats and was not sent.",
          threat: "System: That message was flagged as a threat and was not sent.",
          explicit: "System: Explicit content is not allowed in chat.",
          spam: "System: That message looks like spam and was not sent."
        };
        setSendError(categoryMessages[modResult.category] || "System: Message blocked by safety filter.");
        setIsSending(false);
        return;
      }

      // Add message to subcollection
      await dbAddDoc(`chats/${chatId}/messages`, {
        senderId: currentUser.uid,
        text: cleanText,
        timestamp: Date.now()
      });

      // Update parent chat document
      await dbUpdateDoc("chats", chatId, {
        lastMessage: cleanText,
        lastTimestamp: Date.now()
      });

      setInputText("");
      setSendError("");
    } catch (err) {
      console.error("Error sending message:", err);
      setSendError("System: Failed to send message. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  // Red Flag Reporting (AIM Warning Button)
  const handleWarnUser = async () => {
    const confirmFlag = window.confirm(
      "Report User:\nAre you sure you want to flag this user for safety policy violations? 3 unique reports will result in an immediate system ban."
    );
    if (!confirmFlag) return;

    try {
      await dbSubmitReport({ targetUserId: otherUserId, reason: "policy_violation" });
      alert("Report submitted. Safety team has been notified. This conversation has been closed.");
      onClose();
    } catch (err) {
      const code = err?.code || "";
      if (code === "functions/already-exists") {
        alert("You have already reported this user. No further action is needed — our team has been notified.");
        onClose();
      } else if (code === "functions/resource-exhausted") {
        alert("Daily Report Limit Reached: You can only file 3 reports per day. Try again tomorrow.");
      } else if (code === "functions/failed-precondition") {
        alert("Report could not be submitted. Your account does not meet the minimum requirements to file a report.");
      } else if (code === "functions/unauthenticated") {
        alert("You must be signed in with a registered account to report users.");
      } else {
        console.error("Error flagging user:", err);
        alert("Failed to submit report. Please try again.");
      }
    }
  };

  const handleBlockUser = async () => {
    const confirmBlock = window.confirm(
      "Block this user?\nYou will no longer receive messages from them, and their posts will be hidden from your feed."
    );
    if (!confirmBlock) return;

    try {
      const currentBlocked = Array.isArray(userDoc?.blockedUsers) 
        ? userDoc.blockedUsers 
        : [];
      
      if (!currentBlocked.includes(otherUserId)) {
        await dbSetDoc("users", currentUser.uid, {
          blockedUsers: [...currentBlocked, otherUserId]
        }, true);
      }
      alert("User has been blocked. This conversation is now closed.");
      onClose();
    } catch (err) {
      console.error("Error blocking user:", err);
      alert("Failed to block user. Please try again.");
    }
  };


  return (
    <>
      <div className="myspace-im-container">
        {/* Flat MySpace Header */}
        <div className="myspace-im-header">
          <span>💬 ASL - Instant Message with {buddyProfile?.username || "Buddy"}</span>
          <span onClick={onClose} className="myspace-im-close-btn">
            ✕
          </span>
        </div>
        
        {/* Location & Encryption Row */}
        <div className="myspace-im-location-bar">
          <span>⚡ Location: <strong>{connection.venueName}</strong></span>
          <span style={{ color: "green", fontWeight: "bold" }}>🔒 Encrypted</span>
        </div>

        {/* AIM Subheader / Actions Bar */}
        <div className="myspace-im-subheader">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "24px" }}>{buddyProfile?.emoji_avatar || "🤖"}</span>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "13px", fontWeight: "bold", color: "#003399" }}>{buddyProfile?.username || "Buddy"}</span>
              <span style={{ fontSize: "11px", color: "green", display: "flex", alignItems: "center", gap: "4px" }}>
                <span style={{ width: "6px", height: "6px", backgroundColor: "green", borderRadius: "50%", display: "inline-block" }}></span> Online
              </span>
            </div>
          </div>
          <div style={{ display: "flex", gap: "6px" }}>
            <button 
              onClick={handleWarnUser}
              className="myspace-im-btn myspace-im-btn-flag"
            >
              ⚠️ Flag
            </button>
            <button 
              onClick={handleBlockUser}
              className="myspace-im-btn myspace-im-btn-block"
            >
              🚫 Block
            </button>
            <button 
              onClick={onClose}
              className="myspace-im-btn myspace-im-btn-close"
            >
              Close
            </button>
          </div>
        </div>

        <div style={{ display: "flex", flex: 1, overflow: "hidden", flexDirection: "column", padding: "8px" }}>
          {/* Flat Chat Area */}
          <div className="myspace-im-chat-area">
            <div className="aim-chat-log" style={{ flex: 1, overflowY: "auto", padding: "12px", backgroundColor: "#ffffff" }}>
              <div className="aim-message" style={{ marginBottom: "8px" }}>
                <span className="aim-msg-system" style={{ fontSize: "11px", color: "#888" }}>
                  System: Conversing anonymously on asl. Screenshots are strictly blocked.
                </span>
              </div>
              
              {messages.map((m) => {
                const isSelf = m.senderId === currentUser.uid;
                const senderLabel = isSelf ? "You" : (buddyProfile?.username || "Buddy");
                const senderColor = isSelf ? "#003399" : "#ff007f";
                
                return (
                  <div key={m.id} className="aim-message" style={{ marginBottom: "8px", fontSize: "13px", lineHeight: "1.4" }}>
                    <span style={{ color: senderColor, fontWeight: "bold" }}>
                      {senderLabel}:
                    </span>{" "}
                    <span style={{ color: "#333" }}>
                      {m.text}
                    </span>
                  </div>
                );
              })}
              <div ref={chatLogEndRef} />
            </div>

            {/* Text Formatting Toolbar (Visual/Retro only) */}
            <div className="myspace-im-toolbar">
              <span style={{ fontWeight: "bold", cursor: "pointer", padding: "0 2px" }}>A</span>
              <span style={{ fontStyle: "italic", cursor: "pointer", padding: "0 2px" }}>A</span>
              <span style={{ textDecoration: "underline", cursor: "pointer", padding: "0 2px" }}>A</span>
              <span style={{ borderLeft: "1px solid #ddd", height: "12px", margin: "0 2px" }} />
              <span style={{ cursor: "pointer" }}>🎨</span>
              <span style={{ fontSize: "11px" }}>Arial</span>
            </div>

            {/* Send Input Area */}
            <form onSubmit={handleSendMessage} className="myspace-im-input-form">
              {sendError && (
                <div style={{
                  padding: "6px 10px",
                  fontSize: "11px",
                  color: "#990000",
                  backgroundColor: "#fff0f0",
                  borderBottom: "1px solid #ffcccc",
                  fontFamily: "Arial, sans-serif",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px"
                }}>
                  <span>⚠️</span>
                  <span>{sendError}</span>
                </div>
              )}
              <div style={{ display: "flex", padding: "8px", gap: "8px", alignItems: "flex-end" }}>
                <textarea 
                  value={inputText}
                  onChange={(e) => { setInputText(e.target.value); if (sendError) setSendError(""); }}
                  placeholder="Type message here..."
                  disabled={isSending}
                  className="myspace-im-textarea"
                  style={{ opacity: isSending ? 0.6 : 1 }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(e);
                    }
                  }}
                />
                <button 
                  type="submit" 
                  disabled={isSending || !inputText.trim()}
                  className="myspace-im-send-btn"
                >
                  {isSending ? "..." : "Send"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Stylized System Security Alert (Screenshot Protection Popup) */}
      {showSecurityAlert && (
        <div 
          className="window-container" 
          style={{
            position: "fixed",
            top: "40%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "320px",
            zIndex: 150000,
            boxShadow: "2px 2px 30px rgba(0,0,0,0.6)"
          }}
        >
          <div className="window">
            <TitleBar title="Windows System Security" onClose={() => setShowSecurityAlert(false)} />
            <div className="window-body" style={{ gap: "12px", padding: "10px" }}>
              <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                <span style={{ fontSize: "36px" }}>🛑</span>
                <div>
                  <h4 style={{ margin: "0 0 4px 0", fontSize: "13px", color: "red" }}>Security Violation</h4>
                  <p style={{ margin: 0, fontSize: "12px", lineHeight: "1.4" }}>
                    A screen capture attempt was detected ({alertReason === "key_shortcut" ? "keystroke shortcut" : "window focus changed"}). 
                    asl security policy strictly prohibits screenshots inside private chats. This incident has been logged.
                  </p>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "10px" }}>
                <button 
                  onClick={() => setShowSecurityAlert(false)} 
                  style={{ minWidth: "80px", fontWeight: "bold", minHeight: "36px" }}
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
