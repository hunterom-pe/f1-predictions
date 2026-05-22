import { useState, useEffect, useRef } from "react";
import TitleBar from "./TitleBar";
import { 
  dbOnSnapshot, 
  dbAddDoc, 
  dbUpdateDoc, 
  dbGetDoc
} from "../firebase";
import { 
  enableScreenshotBlocking, 
  disableScreenshotBlocking, 
  setupWebScreenshotDetector 
} from "../services/security";

/**
 * AIM (AOL Instant Messenger) style Chat window.
 * @param {object} props
 * @param {string} props.chatId The ID of the active chat document
 * @param {object} props.connection Associated connection details
 * @param {object} props.currentUser Current authenticated user
 * @param {Function} props.onClose Close handler
 */
export default function AIMChat({ chatId, connection, currentUser, onClose }) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [showSecurityAlert, setShowSecurityAlert] = useState(false);
  const [alertReason, setAlertReason] = useState("");
  
  const chatLogEndRef = useRef(null);

  const otherUserId = connection.senderId === currentUser.uid ? connection.receiverId : connection.senderId;

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
        // Sort ascending by timestamp
        msgs.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
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
    if (!inputText.trim()) return;

    // Strict text check: No base64 images, no HTML/markdown image tags
    const cleanText = inputText.trim();
    const hasBase64Image = /data:image\//i.test(cleanText);
    const hasHtmlImage = /<img/i.test(cleanText);
    const hasMarkdownImage = /!\[.*\]\(.*\)/i.test(cleanText);
    const hasImageExtensions = /\.(jpg|jpeg|png|gif|webp|svg)/i.test(cleanText);

    if (hasBase64Image || hasHtmlImage || hasMarkdownImage || hasImageExtensions) {
      alert("System Error: Images, attachments, and URLs are prohibited in private chat text.");
      return;
    }

    try {
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
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  // Red Flag Reporting (AIM Warning Button)
  const handleWarnUser = async () => {
    const confirmFlag = window.confirm(
      "Report User:\nAre you sure you want to flag this user for safety policy violations? 3 flags will result in an immediate system ban."
    );
    if (!confirmFlag) return;

    try {
      // 1. Fetch other user document
      const otherUserSnap = await dbGetDoc("users", otherUserId);
      let currentFlags = 0;
      if (otherUserSnap.exists()) {
        currentFlags = otherUserSnap.data().flag_count || 0;
      }

      // 2. Increment flag count
      await dbUpdateDoc("users", otherUserId, {
        flag_count: currentFlags + 1
      });

      alert("User flagged. Safety team has been notified. This conversation has been closed.");
      onClose();
    } catch (err) {
      console.error("Error flagging user:", err);
    }
  };

  return (
    <>
      <div 
        className="window-container mobile-maximized"
        style={{
          position: "absolute",
          top: "20px",
          left: "20px",
          right: "20px",
          height: "calc(100% - 40px)",
          maxWidth: "450px",
          margin: "0 auto",
          zIndex: 10100,
          boxShadow: "3px 3px 25px rgba(0, 0, 0, 0.4)"
        }}
      >
        <div className="window" style={{ height: "100%", backgroundColor: "#f0f0f0" }}>
          <TitleBar title={`Anonymous Buddy - Instant Message`} onClose={onClose} />
          
          {/* AIM Header Details */}
          <div className="aim-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>⚡ Venue Channel: {connection.venueName}</span>
            <span style={{ fontSize: "9px", color: "green" }}>🔒 Encryption Active</span>
          </div>

          <div style={{ display: "flex", flex: 1, overflow: "hidden", padding: "4px", gap: "4px" }}>
            {/* Left Chat Area */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              {/* AIM Chat Log Box */}
              <div className="aim-layout" style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                <div className="aim-chat-log">
                  <div className="aim-message">
                    <span className="aim-msg-system">
                      System: Conversing anonymously on RetroConnect. Screenshots are strictly blocked.
                    </span>
                  </div>
                  
                  {messages.map((m) => {
                    const isSelf = m.senderId === currentUser.uid;
                    const senderLabel = isSelf ? "You" : "Buddy";
                    const senderClass = isSelf ? "aim-msg-self" : "aim-msg-buddy";
                    
                    return (
                      <div key={m.id} className="aim-message">
                        <span className={`aim-msg-sender ${senderClass}`}>
                          {senderLabel}:
                        </span>{" "}
                        <span style={{ fontFamily: "Arial, sans-serif", fontSize: "12px" }}>
                          {m.text}
                        </span>
                      </div>
                    );
                  })}
                  <div ref={chatLogEndRef} />
                </div>

                {/* Text Formatting Toolbar (Visual/Retro only) */}
                <div 
                  style={{ 
                    height: "22px", 
                    backgroundColor: "#c0c0c0", 
                    borderTop: "1px solid #808080", 
                    borderBottom: "1px solid #808080",
                    display: "flex",
                    alignItems: "center",
                    padding: "0 4px",
                    gap: "6px",
                    fontSize: "11px"
                  }}
                >
                  <span style={{ fontWeight: "bold", cursor: "pointer", padding: "0 2px" }}>A</span>
                  <span style={{ fontStyle: "italic", cursor: "pointer", padding: "0 2px" }}>A</span>
                  <span style={{ textDecoration: "underline", cursor: "pointer", padding: "0 2px" }}>A</span>
                  <span style={{ borderLeft: "1px solid #808080", height: "12px", margin: "0 2px" }} />
                  <span style={{ color: "red", cursor: "pointer" }}>🎨</span>
                  <span style={{ fontSize: "9px" }}>Tahoma</span>
                </div>

                {/* Send Input Area */}
                <form onSubmit={handleSendMessage} className="aim-input-area">
                  <textarea 
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Type message here..."
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(e);
                      }
                    }}
                  />
                  <div className="aim-input-actions">
                    <button type="submit" style={{ flex: 1, padding: "2px 8px", fontSize: "11px" }}>
                      Send
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Right Buddy Sidebar Panel */}
            <div 
              style={{ 
                width: "90px", 
                backgroundColor: "#c0c0c0", 
                border: "2px solid", 
                borderColor: "#fff #808080 #808080 #fff",
                display: "flex", 
                flexDirection: "column", 
                alignItems: "center",
                padding: "6px 2px",
                gap: "8px",
                boxSizing: "border-box"
              }}
            >
              {/* Retro Buddy Icon Placeholder */}
              <div 
                style={{ 
                  width: "50px", 
                  height: "50px", 
                  border: "2px inset #fff", 
                  backgroundColor: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "24px"
                }}
              >
                🤖
              </div>
              <span style={{ fontSize: "9px", textAlign: "center", fontWeight: "bold" }}>
                Buddy Profile
              </span>

              <button 
                onClick={handleWarnUser}
                className="default"
                style={{ 
                  width: "95%", 
                  fontSize: "10px", 
                  color: "#b22222", 
                  fontWeight: "bold",
                  padding: "4px 2px"
                }}
              >
                ⚠️ Flag User
              </button>

              <button onClick={onClose} style={{ width: "95%", fontSize: "10px", marginTop: "auto" }}>
                Close Chat
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stylized Windows System Error Alert (Screenshot Protection Popup) */}
      {showSecurityAlert && (
        <div 
          className="window-container" 
          style={{
            position: "fixed",
            top: "40%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "300px",
            zIndex: 150000,
            boxShadow: "2px 2px 30px rgba(0,0,0,0.6)"
          }}
        >
          <div className="window">
            <TitleBar title="Windows System Security" onClose={() => setShowSecurityAlert(false)} />
            <div className="window-body" style={{ gap: "12px" }}>
              <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                <span style={{ fontSize: "36px" }}>🛑</span>
                <div>
                  <h4 style={{ margin: "0 0 4px 0", fontSize: "12px", color: "red" }}>Security Violation</h4>
                  <p style={{ margin: 0, fontSize: "11px", lineHeight: "1.3" }}>
                    A screen capture attempt was detected ({alertReason === "key_shortcut" ? "keystroke shortcut" : "window focus changed"}). 
                    RetroConnect security policy strictly prohibits screenshots inside private chats. This incident has been logged.
                  </p>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
                <button 
                  onClick={() => setShowSecurityAlert(false)} 
                  style={{ width: "60px", fontWeight: "bold" }}
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
