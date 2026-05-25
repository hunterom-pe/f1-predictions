import { useState, useEffect, useRef } from "react";
import TitleBar from "./TitleBar";
import { 
  dbOnSnapshot, 
  dbAddDoc, 
  dbUpdateDoc, 
  dbGetDoc,
  dbSetDoc
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
 * @param {object} props.userDoc Profile document of current user
 * @param {Function} props.onClose Close handler
 */
export default function AIMChat({ chatId, connection, currentUser, userDoc, onClose }) {
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
      "Report User:\nAre you sure you want to flag this user for safety policy violations? 3 unique reports will result in an immediate system ban."
    );
    if (!confirmFlag) return;

    try {
      // ── Spite-Ban Shield Checks ──────────────────────────────────────────
      let passShield = true;
      const reporterSnap = await dbGetDoc("users", currentUser.uid);

      if (!reporterSnap.exists()) {
        passShield = false;
      } else {
        const reporterData = reporterSnap.data();

        // Check A: Reporter must be a permanent (non-anonymous) account
        if (currentUser.isAnonymous || reporterData.isAnonymous) {
          passShield = false;
        }

        // Check B: Reporter account must be >= 48 hours old
        const ageMs = Date.now() - (reporterData.createdAt || 0);
        if (ageMs < 48 * 60 * 60 * 1000) {
          passShield = false;
        }
      }

      // Check C: Reporter must be an actual participant of this conversation
      if (passShield && connection && connection.id) {
        const connSnap = await dbGetDoc("connections", connection.id);
        if (!connSnap.exists()) {
          passShield = false;
        } else {
          const connData = connSnap.data();
          const isParticipant =
            (connData.senderId === currentUser.uid && connData.receiverId === otherUserId) ||
            (connData.receiverId === currentUser.uid && connData.senderId === otherUserId);
          if (!isParticipant) passShield = false;
        }
      } else {
        passShield = false;
      }

      if (!passShield) {
        alert("Report could not be submitted. Your account does not meet the minimum requirements to file a report.");
        return;
      }

      // ── Daily Report Rate Limit (max 3 per calendar day) ────────────────
      const reporterData2 = reporterSnap.data();
      const todayStr = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
      const reporterDailyDate = reporterData2.dailyReportDate || "";
      const reporterDailyCount = reporterDailyDate === todayStr
        ? (reporterData2.dailyReportCount || 0)
        : 0;

      if (reporterDailyCount >= 3) {
        alert("Daily Report Limit Reached: You can only file 3 reports per day. This limit prevents system abuse. Try again tomorrow.");
        return;
      }

      // ── Unique Reporter Enforcement ──────────────────────────────────────
      const otherUserSnap = await dbGetDoc("users", otherUserId);
      if (!otherUserSnap.exists()) {
        alert("User not found.");
        return;
      }

      const otherUserData = otherUserSnap.data();
      const existingReporters = Array.isArray(otherUserData.reporterIds) ? otherUserData.reporterIds : [];

      // Check D: This user has already reported this person — one report per user
      if (existingReporters.includes(currentUser.uid)) {
        alert("You have already reported this user. No further action is needed — our team has been notified.");
        onClose();
        return;
      }

      // Append reporter and check ban threshold (3 unique reporters)
      const updatedReporters = [...existingReporters, currentUser.uid];
      const shouldBan = updatedReporters.length >= 3;

      // Write report to target user AND increment reporter's daily count atomically
      await Promise.all([
        dbUpdateDoc("users", otherUserId, {
          reporterIds: updatedReporters,
          flag_count: updatedReporters.length,
          ...(shouldBan ? { isBanned: true, bannedAt: Date.now() } : {})
        }),
        dbUpdateDoc("users", currentUser.uid, {
          dailyReportCount: reporterDailyCount + 1,
          dailyReportDate: todayStr
        })
      ]);

      if (shouldBan) {
        alert("Report submitted. This user has reached the report threshold and has been removed from the platform.");
      } else {
        alert("Report submitted. Safety team has been notified. This conversation has been closed.");
      }

      onClose();
    } catch (err) {
      console.error("Error flagging user:", err);
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
      <div className="window" style={{ height: "500px", display: "flex", flexDirection: "column", backgroundColor: "#f0f0f0" }}>
        <TitleBar title={`💬 AIM - Instant Message with Buddy`} onClose={onClose} />
        
        {/* AIM Header Details */}
        <div className="aim-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 8px" }}>
          <span>⚡ Location: {connection.venueName}</span>
          <span style={{ fontSize: "11px", color: "green", fontWeight: "bold" }}>🔒 Encrypted</span>
        </div>

        {/* AIM Subheader / Actions Bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", backgroundColor: "#c0c0c0", padding: "6px 8px", borderBottom: "1px solid #808080", gap: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "20px" }}>🤖</span>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "12px", fontWeight: "bold" }}>Buddy</span>
              <span style={{ fontSize: "10px", color: "green" }}>Online</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: "6px" }}>
            <button 
              onClick={handleWarnUser}
              style={{ 
                minHeight: "34px", 
                padding: "2px 8px", 
                fontSize: "12px", 
                color: "#b22222", 
                fontWeight: "bold",
                backgroundColor: "#ffcccc",
                border: "1px solid #b22222",
                cursor: "pointer"
              }}
            >
              ⚠️ Flag
            </button>
            <button 
              onClick={handleBlockUser}
              style={{ 
                minHeight: "34px", 
                padding: "2px 8px", 
                fontSize: "12px", 
                color: "#000000", 
                fontWeight: "bold",
                backgroundColor: "#dfdfdf",
                border: "1px solid #808080",
                cursor: "pointer"
              }}
            >
              🚫 Block
            </button>
            <button 
              onClick={onClose}
              style={{ minHeight: "34px", padding: "2px 8px", fontSize: "12px", cursor: "pointer" }}
            >
              Close
            </button>
          </div>
        </div>

        <div style={{ display: "flex", flex: 1, overflow: "hidden", flexDirection: "column", padding: "4px" }}>
          {/* AIM Chat Log Box */}
          <div className="aim-layout" style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div className="aim-chat-log" style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
              <div className="aim-message" style={{ marginBottom: "8px" }}>
                <span className="aim-msg-system">
                  System: Conversing anonymously on asl. Screenshots are strictly blocked.
                </span>
              </div>
              
              {messages.map((m) => {
                const isSelf = m.senderId === currentUser.uid;
                const senderLabel = isSelf ? "You" : "Buddy";
                const senderClass = isSelf ? "aim-msg-self" : "aim-msg-buddy";
                
                return (
                  <div key={m.id} className="aim-message" style={{ marginBottom: "6px" }}>
                    <span className={`aim-msg-sender ${senderClass}`} style={{ fontWeight: "bold" }}>
                      {senderLabel}:
                    </span>{" "}
                    <span style={{ fontFamily: "Arial, sans-serif", fontSize: "14px" }}>
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
                height: "24px", 
                backgroundColor: "#c0c0c0", 
                borderTop: "1px solid #808080", 
                borderBottom: "1px solid #808080",
                display: "flex",
                alignItems: "center",
                padding: "0 6px",
                gap: "8px",
                fontSize: "12px"
              }}
            >
              <span style={{ fontWeight: "bold", cursor: "pointer", padding: "0 2px" }}>A</span>
              <span style={{ fontStyle: "italic", cursor: "pointer", padding: "0 2px" }}>A</span>
              <span style={{ textDecoration: "underline", cursor: "pointer", padding: "0 2px" }}>A</span>
              <span style={{ borderLeft: "1px solid #808080", height: "12px", margin: "0 2px" }} />
              <span style={{ color: "red", cursor: "pointer" }}>🎨</span>
              <span style={{ fontSize: "11px" }}>Tahoma</span>
            </div>

            {/* Send Input Area */}
            <form onSubmit={handleSendMessage} className="aim-input-area" style={{ display: "flex", padding: "4px", gap: "6px", backgroundColor: "#f0f0f0", borderTop: "1px solid #808080", minHeight: "54px" }}>
              <textarea 
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type message here..."
                style={{ flex: 1, resize: "none", fontSize: "14px", fontFamily: "Arial, sans-serif", padding: "6px", minHeight: "44px" }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(e);
                  }
                }}
              />
              <button type="submit" style={{ padding: "2px 12px", fontSize: "14px", fontWeight: "bold", minHeight: "44px", cursor: "pointer" }}>
                Send
              </button>
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
                  style={{ width: "80px", fontWeight: "bold", minHeight: "36px" }}
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
