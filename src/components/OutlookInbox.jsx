import { useState, useEffect } from "react";
import TitleBar from "./TitleBar";
import { 
  dbOnSnapshot, 
  dbUpdateDoc, 
  dbDeleteDoc, 
  dbAddDoc
} from "../firebase";

/**
 * Outlook Express retro email client layout for connection requests.
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
    
    const confirmWipe = window.confirm("Are you sure you want to delete and wipe this connection request?");
    if (!confirmWipe) return;

    try {
      await dbDeleteDoc("connections", selectedConn.id);
      setSelectedConn(null);
    } catch (err) {
      console.error("Error deleting connection request:", err);
    }
  };

  return (
    <div 
      className="window-container mobile-maximized"
      style={{
        position: "absolute",
        top: "10px",
        left: "10px",
        right: "10px",
        height: "calc(100% - 20px)",
        maxWidth: "800px",
        margin: "0 auto",
        zIndex: 10000,
        boxShadow: "3px 3px 30px rgba(0,0,0,0.5)"
      }}
    >
      <div className="window" style={{ height: "100%" }}>
        <TitleBar title="Inbox - Outlook Express" onClose={onClose} />
        
        {/* Outlook Express Toolbar */}
        <div 
          className="window-body" 
          style={{ 
            flexDirection: "row", 
            gap: "4px", 
            padding: "4px", 
            backgroundColor: "#c0c0c0", 
            borderBottom: "2px solid #808080",
            flex: "none"
          }}
        >
          {activeFolder === "inbox" && selectedConn && (
            <button 
              onClick={handleAccept} 
              style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
            >
              🤝 Accept Connection
            </button>
          )}
          
          {selectedConn && (
            <button 
              onClick={handleDelete}
              style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
            >
              🗑️ Delete / Block
            </button>
          )}

          {activeFolder === "active" && selectedConn && (
            <button 
              onClick={() => onOpenChat(null, selectedConn)}
              style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontWeight: "bold" }}
            >
              ⚡ Open AIM Chat
            </button>
          )}
          
          <div style={{ flex: 1 }} />
          
          <button onClick={onClose} style={{ minWidth: "60px" }}>Close</button>
        </div>

        {/* Outlook Body Layout */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          
          {/* Left Folder Tree Pane */}
          <div 
            style={{ 
              width: "140px", 
              borderRight: "2px solid #808080", 
              backgroundColor: "#dcdcdc", 
              padding: "6px",
              boxSizing: "border-box",
              display: "flex",
              flexDirection: "column"
            }}
          >
            <strong style={{ fontSize: "11px", marginBottom: "6px", display: "block" }}>Folders</strong>
            <ul className="tree-view" style={{ flex: 1, padding: "2px", listStyle: "none", margin: 0, backgroundColor: "#fff" }}>
              <li>
                📁 Local Folders
                <ul style={{ listStyle: "none", paddingLeft: "12px", margin: 0 }}>
                  <li 
                    onClick={() => { setActiveFolder("inbox"); setSelectedConn(null); }}
                    style={{ 
                      cursor: "pointer", 
                      fontSize: "11px",
                      padding: "2px 4px",
                      backgroundColor: activeFolder === "inbox" ? "#000080" : "transparent",
                      color: activeFolder === "inbox" ? "white" : "black"
                    }}
                  >
                    📥 Inbox ({connections.filter(c => c.receiverId === currentUser.uid && c.status === "pending").length})
                  </li>
                  <li 
                    onClick={() => { setActiveFolder("sent"); setSelectedConn(null); }}
                    style={{ 
                      cursor: "pointer", 
                      fontSize: "11px",
                      padding: "2px 4px",
                      backgroundColor: activeFolder === "sent" ? "#000080" : "transparent",
                      color: activeFolder === "sent" ? "white" : "black"
                    }}
                  >
                    📤 Sent Items ({connections.filter(c => c.senderId === currentUser.uid && c.status === "pending").length})
                  </li>
                  <li 
                    onClick={() => { setActiveFolder("active"); setSelectedConn(null); }}
                    style={{ 
                      cursor: "pointer", 
                      fontSize: "11px",
                      padding: "2px 4px",
                      backgroundColor: activeFolder === "active" ? "#000080" : "transparent",
                      color: activeFolder === "active" ? "white" : "black"
                    }}
                  >
                    💬 Chat Rooms ({connections.filter(c => c.status === "accepted").length})
                  </li>
                </ul>
              </li>
            </ul>
          </div>

          {/* Right Split View Pane */}
          <div className="outlook-pane" style={{ flex: 1, padding: "6px", boxSizing: "border-box", overflow: "hidden" }}>
            
            {/* List Pane */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <div 
                style={{ 
                  display: "grid", 
                  gridTemplateColumns: "1.2fr 1fr 1fr", 
                  fontSize: "10px", 
                  fontWeight: "bold", 
                  backgroundColor: "#c0c0c0", 
                  border: "1px solid #808080",
                  padding: "2px 4px"
                }}
              >
                <span>Venue Name</span>
                <span>Sender ID</span>
                <span>Date Sent</span>
              </div>
              
              <ul className="outlook-list">
                {filteredConns.length === 0 ? (
                  <li style={{ padding: "12px", fontSize: "11px", color: "#808080", fontStyle: "italic", textAlign: "center" }}>
                    No messages in this folder.
                  </li>
                ) : (
                  filteredConns.map(c => {
                    const isSelected = selectedConn?.id === c.id;
                    const dateStr = new Date(c.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
                    return (
                      <li 
                        key={c.id} 
                        onClick={() => handleSelectConn(c)}
                        className={`outlook-item ${isSelected ? "selected" : ""}`}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1.2fr 1fr 1fr",
                          padding: "4px"
                        }}
                      >
                        <span style={{ fontWeight: "bold" }}>📍 {c.venueName}</span>
                        <span>{c.senderId === currentUser.uid ? "You (Pending)" : "Anonymous"}</span>
                        <span>{dateStr}</span>
                      </li>
                    );
                  })
                )}
              </ul>
            </div>

            {/* Preview Pane */}
            <div className="outlook-preview">
              {selectedConn ? (
                <div>
                  <div style={{ borderBottom: "1px solid #dfdfdf", paddingBottom: "6px", marginBottom: "6px", fontSize: "11px", color: "#404040" }}>
                    <strong>From:</strong> {selectedConn.senderId === currentUser.uid ? "You" : "Anonymous User"}<br />
                    <strong>Location:</strong> {selectedConn.venueName}<br />
                    <strong>Status:</strong> <span style={{ textTransform: "uppercase", fontWeight: "bold", color: selectedConn.status === "accepted" ? "green" : "blue" }}>{selectedConn.status}</span>
                  </div>
                  <p style={{ margin: 0, whiteSpace: "pre-wrap", color: "#000", fontSize: "11px", lineHeight: "1.4" }}>
                    {selectedConn.proofText}
                  </p>
                </div>
              ) : (
                <p style={{ margin: 0, color: "#808080", fontStyle: "italic", fontSize: "11px" }}>
                  Select a message to view description contents.
                </p>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
