import { useState, useEffect } from "react";
import TitleBar from "./TitleBar";
import { 
  dbOnSnapshot, 
  dbUpdateDoc, 
  dbDeleteDoc, 
  dbAddDoc
} from "../firebase";

/**
 * MySpace Mail themed message client for connection requests.
 * @param {object} props
 * @param {object} props.currentUser Current authenticated user
 * @param {Function} props.onClose Close handler
 * @param {Function} props.onOpenChat Callback when connection is accepted and chat is opened
 */
export default function OutlookInbox({ currentUser, onClose, onOpenChat }) {
  const [activeFolder, setActiveFolder] = useState("inbox"); // inbox, sent, active
  const [connections, setConnections] = useState([]);
  const [selectedConn, setSelectedConn] = useState(null);

  // Subscribe to connections involving current user
  useEffect(() => {
    if (!currentUser) return;

    // We fetch all connections where current user is sender or receiver
    const unsub = dbOnSnapshot(
      "connections",
      [],
      (snapshot) => {
        const conns = [];
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          // Filter client-side to simplify index requirements
          if (data.senderId === currentUser.uid || data.receiverId === currentUser.uid) {
            conns.push({ id: doc.id, ...data });
          }
        });
        setConnections(conns);
      }
    );

    return () => unsub();
  }, [currentUser]);

  // Filter connections by active folder
  const filteredConns = connections.filter(c => {
    if (activeFolder === "inbox") {
      return c.receiverId === currentUser.uid && c.status === "pending";
    } else if (activeFolder === "sent") {
      return c.senderId === currentUser.uid && c.status === "pending";
    } else {
      return c.status === "accepted";
    }
  });

  const handleSelectConn = (conn) => {
    setSelectedConn(conn);
  };

  const handleAccept = async () => {
    if (!selectedConn) return;

    try {
      // 1. Upgrade connection status to accepted
      await dbUpdateDoc("connections", selectedConn.id, { status: "accepted" });

      // 2. Create the associated AIM chat window
      const chatRef = await dbAddDoc("chats", {
        connectionId: selectedConn.id,
        participants: [selectedConn.senderId, selectedConn.receiverId],
        lastMessage: "System: Connection accepted. Start chatting!",
        lastTimestamp: Date.now(),
        venueName: selectedConn.venueName
      });

      // Automatically open the AIM chat
      onOpenChat(chatRef.id, selectedConn);
      setSelectedConn(null);
    } catch (err) {
      console.error("Error accepting connection:", err);
    }
  };

  const handleDelete = async () => {
    if (!selectedConn) return;
    
    const isPurge = activeFolder === "inbox" && selectedConn.status === "pending";
    const confirmMessage = isPurge
      ? "Are you sure you want to purge this transmission? This will lock the sender out of outbound connections for 12 hours."
      : "Are you sure you want to delete and wipe this connection request?";
      
    const confirmWipe = window.confirm(confirmMessage);
    if (!confirmWipe) return;

    try {
      if (isPurge) {
        // Write handshake_cooldown to responder (senderId)
        const twelveHoursAhead = Date.now() + 12 * 60 * 60 * 1000;
        await dbUpdateDoc("users", selectedConn.senderId, {
          handshake_cooldown: twelveHoursAhead
        });
      }
      await dbDeleteDoc("connections", selectedConn.id);
      setSelectedConn(null);
    } catch (err) {
      console.error("Error deleting connection request:", err);
    }
  };

  const inboxCount = connections.filter(c => c.receiverId === currentUser.uid && c.status === "pending").length;
  const sentCount = connections.filter(c => c.senderId === currentUser.uid && c.status === "pending").length;
  const chatCount = connections.filter(c => c.status === "accepted").length;

  return (
    <div className="window" style={{ height: "550px", display: "flex", flexDirection: "column", backgroundColor: "#e5e5e5" }}>
      <TitleBar title="📬 asl Mail - Connections" onClose={onClose} />
      
      {/* Folder Tabs Row */}
      <div style={{ display: "flex", backgroundColor: "#003399", padding: "4px 8px 0 8px", gap: "4px" }}>
        <button 
          onClick={() => { setActiveFolder("inbox"); setSelectedConn(null); }}
          style={{
            borderRadius: "4px 4px 0 0",
            backgroundColor: activeFolder === "inbox" ? "#fff" : "#6699ff",
            color: activeFolder === "inbox" ? "#003399" : "#fff",
            fontWeight: "bold",
            padding: "8px 12px",
            minHeight: "38px",
            fontSize: "14px",
            border: "1px solid #003399",
            borderBottom: "none",
            cursor: "pointer"
          }}
        >
          📥 Inbox ({inboxCount})
        </button>
        <button 
          onClick={() => { setActiveFolder("sent"); setSelectedConn(null); }}
          style={{
            borderRadius: "4px 4px 0 0",
            backgroundColor: activeFolder === "sent" ? "#fff" : "#6699ff",
            color: activeFolder === "sent" ? "#003399" : "#fff",
            fontWeight: "bold",
            padding: "8px 12px",
            minHeight: "38px",
            fontSize: "14px",
            border: "1px solid #003399",
            borderBottom: "none",
            cursor: "pointer"
          }}
        >
          📤 Sent ({sentCount})
        </button>
        <button 
          onClick={() => { setActiveFolder("active"); setSelectedConn(null); }}
          style={{
            borderRadius: "4px 4px 0 0",
            backgroundColor: activeFolder === "active" ? "#fff" : "#6699ff",
            color: activeFolder === "active" ? "#003399" : "#fff",
            fontWeight: "bold",
            padding: "8px 12px",
            minHeight: "38px",
            fontSize: "14px",
            border: "1px solid #003399",
            borderBottom: "none",
            cursor: "pointer"
          }}
        >
          💬 Chats ({chatCount})
        </button>
      </div>

      {/* Main Mail View Area */}
      <div style={{ flex: 1, backgroundColor: "#fff", padding: "10px", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        
        {selectedConn ? (
          /* Message Detail View */
          <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: "10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button 
                onClick={() => setSelectedConn(null)}
                style={{ minHeight: "36px", padding: "4px 12px", fontSize: "13px" }}
              >
                ⬅️ Back to List
              </button>
              <span style={{ fontSize: "12px", color: "#666" }}>
                Received: {new Date(selectedConn.timestamp).toLocaleString()}
              </span>
            </div>

            <div style={{ border: "1px solid #6699ff", backgroundColor: "#f2f6ff", padding: "12px", borderRadius: "4px" }}>
              <div style={{ marginBottom: "6px", fontSize: "14px" }}>
                <strong>From:</strong> {selectedConn.senderId === currentUser.uid ? "You" : "Anonymous Connection"}
              </div>
              <div style={{ marginBottom: "6px", fontSize: "14px" }}>
                <strong>Location:</strong> 📍 {selectedConn.venueName}
              </div>
              <div style={{ fontSize: "14px" }}>
                <strong>Status:</strong> <span style={{ textTransform: "uppercase", fontWeight: "bold", color: selectedConn.status === "accepted" ? "green" : "#ff9900" }}>{selectedConn.status}</span>
              </div>
            </div>

            <div style={{ flex: 1, border: "1px solid #ccc", padding: "12px", overflowY: "auto", backgroundColor: "#fafafa", borderRadius: "4px", minHeight: "150px" }}>
              <div style={{ fontWeight: "bold", fontSize: "13px", color: "#cc6600", marginBottom: "8px", borderBottom: "1px solid #ddd", paddingBottom: "4px" }}>
                Verification Details:
              </div>
              <p style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: "14px", lineHeight: "1.5" }}>
                {selectedConn.proofText}
              </p>
            </div>

            {/* Action Buttons */}
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", borderTop: "1px solid #eee", paddingTop: "8px" }}>
              {activeFolder === "inbox" && selectedConn.status === "pending" && (
                <button 
                  onClick={handleAccept} 
                  style={{ backgroundColor: "#ffcc99", color: "#cc6600", fontWeight: "bold", minHeight: "44px" }}
                >
                  🤝 Accept Connection
                </button>
              )}
              
              {activeFolder === "active" && (
                <button 
                  onClick={() => onOpenChat(null, selectedConn)}
                  style={{ backgroundColor: "#6699ff", color: "#fff", fontWeight: "bold", minHeight: "44px" }}
                >
                  ⚡ Open AIM Chat
                </button>
              )}

              <button 
                onClick={handleDelete}
                style={{ backgroundColor: "#ff9999", color: "#990000", minHeight: "44px" }}
              >
                {activeFolder === "inbox" && selectedConn.status === "pending" ? "🗑️ [ Purge Transmission ]" : "🗑️ Delete Request"}
              </button>
            </div>
          </div>
        ) : (
          /* Messages List View */
          <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
            <div style={{ flex: 1, overflowY: "auto" }}>
              {filteredConns.length === 0 ? (
                <div style={{ padding: "40px 10px", textAlign: "center", color: "#808080", fontStyle: "italic", fontSize: "14px" }}>
                  No messages in this folder.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {filteredConns.map(c => {
                    const dateStr = new Date(c.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
                    return (
                      <div 
                        key={c.id} 
                        onClick={() => handleSelectConn(c)}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "12px",
                          border: "1px solid #ddd",
                          borderRadius: "4px",
                          cursor: "pointer",
                          backgroundColor: "#fcfcfc"
                        }}
                      >
                        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                          <span style={{ fontWeight: "bold", color: "#003399", fontSize: "14px" }}>📍 {c.venueName}</span>
                          <span style={{ fontSize: "12px", color: "#666" }}>
                            {c.senderId === currentUser.uid ? "To: Anonymous Poster" : "From: Anonymous Connection"}
                          </span>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
                          <span style={{ fontSize: "11px", color: "#999" }}>{dateStr}</span>
                          <span style={{ 
                            fontSize: "11px", 
                            padding: "2px 6px", 
                            borderRadius: "10px", 
                            backgroundColor: c.status === "accepted" ? "#e2fbe2" : "#fff2e2",
                            color: c.status === "accepted" ? "green" : "orange",
                            fontWeight: "bold",
                            textTransform: "uppercase"
                          }}>
                            {c.status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
