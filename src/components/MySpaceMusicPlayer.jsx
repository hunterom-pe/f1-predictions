import { useState, useEffect } from "react";

/**
 * MySpace Music Player integrated with Spotify Web Playback SDK and Oembed lookup.
 * @param {object} props
 * @param {string} props.spotifyTrackUri The unique spotify:track:URI to stream
 */
export default function MySpaceMusicPlayer({ spotifyTrackUri = "spotify:track:4PTG3Z6ehGkBF3zI7YSp6g" }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [trackInfo, setTrackInfo] = useState({
    title: "Such Great Heights",
    artist: "The Postal Service",
    duration: 266,
    durationStr: "04:26"
  });
  
  const [token, setToken] = useState(localStorage.getItem("asl_spotify_token") || "");
  const [spotifyPlayer, setSpotifyPlayer] = useState(null);
  const [sdkReady, setSdkReady] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // 1. Fetch Track Metadata via Spotify Oembed API
  useEffect(() => {
    if (!spotifyTrackUri) return;
    
    const fetchMetadata = async () => {
      try {
        const trackId = spotifyTrackUri.split(":")[2] || spotifyTrackUri;
        const res = await fetch(`https://open.spotify.com/oembed?url=https://open.spotify.com/track/${trackId}`);
        if (res.ok) {
          const data = await res.json();
          // Oembed title is usually "Song Title" and author_name is "Artist"
          setTrackInfo({
            title: data.title || "Unknown Song",
            artist: data.author_name || "Unknown Artist",
            duration: 240, // default placeholder duration
            durationStr: "04:00"
          });
        } else {
          setTrackInfo({
            title: "Spotify Track",
            artist: spotifyTrackUri,
            duration: 240,
            durationStr: "04:00"
          });
        }
      } catch (err) {
        console.error("Failed to load Spotify oembed details:", err);
        setTrackInfo({
          title: "Spotify Track",
          artist: "Active Session",
          duration: 240,
          durationStr: "04:00"
        });
      }
    };

    fetchMetadata();
  }, [spotifyTrackUri]);

  // 2. Simulated Playback interval if running without SDK active connection
  useEffect(() => {
    let interval = null;
    if (isPlaying && !spotifyPlayer) {
      interval = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= trackInfo.duration) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isPlaying, trackInfo.duration, spotifyPlayer]);

  // 3. Spotify SDK script loader & initialization
  useEffect(() => {
    if (!token) return;

    // Load Spotify SDK script
    const scriptId = "spotify-player-sdk";
    let script = document.getElementById(scriptId);
    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://sdk.scdn.co/spotify-player.js";
      script.async = true;
      document.body.appendChild(script);
    }

    const initPlayer = () => {
      if (!window.Spotify) return;
      
      const player = new window.Spotify.Player({
        name: "asl Playback Node",
        getOAuthToken: (cb) => cb(token),
        volume: 0.5
      });

      player.addListener("initialization_error", ({ message }) => setErrorMsg(message));
      player.addListener("authentication_error", ({ message }) => {
        setErrorMsg("Auth Token Expired. Check developer.spotify.com.");
        setToken("");
        localStorage.removeItem("asl_spotify_token");
      });
      player.addListener("account_error", ({ message }) => setErrorMsg(message));
      player.addListener("playback_error", ({ message }) => setErrorMsg(message));

      player.addListener("player_state_changed", (state) => {
        if (state) {
          setIsPlaying(!state.paused);
          setCurrentTime(Math.floor(state.position / 1000));
          if (state.track_window.current_track) {
            setTrackInfo({
              title: state.track_window.current_track.name,
              artist: state.track_window.current_track.artists.map(a => a.name).join(", "),
              duration: Math.floor(state.duration / 1000),
              durationStr: formatTime(Math.floor(state.duration / 1000))
            });
          }
        }
      });

      player.addListener("ready", ({ device_id }) => {
        console.log("[Spotify SDK] Connected. Device ID:", device_id);
        setErrorMsg("");
        
        // Command device local application to stream track URI
        fetch(`https://api.spotify.com/v1/me/player/play?device_id=${device_id}`, {
          method: "PUT",
          body: JSON.stringify({ uris: [spotifyTrackUri] }),
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          }
        });
      });

      player.connect();
      setSpotifyPlayer(player);
    };

    if (window.Spotify) {
      initPlayer();
    } else {
      window.onSpotifyWebPlaybackSDKReady = initPlayer;
    }

    return () => {
      if (spotifyPlayer) {
        spotifyPlayer.disconnect();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, spotifyTrackUri]);

  const handlePlayPause = () => {
    if (spotifyPlayer) {
      spotifyPlayer.togglePlay();
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const handleTokenSubmit = (e) => {
    e.preventDefault();
    const inputToken = e.target.elements.tokenInput.value.trim();
    if (inputToken) {
      setToken(inputToken);
      localStorage.setItem("asl_spotify_token", inputToken);
    }
  };

  const handleClearToken = () => {
    setToken("");
    localStorage.removeItem("asl_spotify_token");
    if (spotifyPlayer) {
      spotifyPlayer.disconnect();
      setSpotifyPlayer(null);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins < 10 ? "0" : ""}${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const progressPercent = (currentTime / trackInfo.duration) * 100;

  return (
    <div className="myspace-player-widget beveled-box" style={{ padding: "8px", border: "1px solid #ff99cc" }}>
      <div className="player-inner" style={{ backgroundColor: "#003399" }}>
        {/* LCD Screen */}
        <div className="player-screen" style={{ backgroundColor: "#000", color: "#ff66cc" }}>
          <div className="track-info" style={{ borderBottom: "1px dashed #ff007f" }}>
            <span className="lcd-text scrolling-title" style={{ color: "#ff66cc" }}>
              {token ? "📟 [SDK Mode] " : "🎧 [Mock Mode] "} {trackInfo.artist} - {trackInfo.title}
            </span>
          </div>
          <div className="playback-stats" style={{ color: "#ff99cc" }}>
            <span className="time-display">{formatTime(currentTime)} / {trackInfo.durationStr}</span>
            <span className="kbps-label" style={{ color: "#ff007f" }}>56Kbps</span>
          </div>
          <div className="visualizer-container" style={{ border: "1px solid #ff007f" }}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((barId) => (
              <div 
                key={barId} 
                className={`visualizer-bar bar-${barId} ${isPlaying ? "playing" : ""}`}
                style={{ backgroundColor: "#ff66cc" }}
              />
            ))}
          </div>
        </div>

        {/* Player Controls */}
        <div className="player-controls">
          <div className="controls-row">
            <button onClick={handlePlayPause} className="player-btn play-btn" style={{ flex: 1 }} title={isPlaying ? "Pause" : "Play"}>
              {isPlaying ? "⏸" : "▶"}
            </button>
          </div>
          
          <div className="progress-bar-container">
            <div className="progress-bar-track">
              <div className="progress-bar-fill" style={{ width: `${progressPercent}%`, background: "linear-gradient(90deg, #ff66cc 0%, #ff007f 100%)" }} />
            </div>
          </div>
        </div>
      </div>

      {/* Spotify Developer Access Token Input */}
      <div style={{ marginTop: "6px", fontSize: "10px", color: "#666" }}>
        {!token ? (
          <form onSubmit={handleTokenSubmit} style={{ display: "flex", gap: "4px" }}>
            <input 
              name="tokenInput"
              type="text" 
              placeholder="Paste Spotify Auth Token..."
              style={{ flex: 1, minHeight: "22px", height: "22px", padding: "2px 4px", fontSize: "10px !important" }}
            />
            <button type="submit" style={{ minHeight: "22px", padding: "0 6px !important", fontSize: "10px !important" }}>Link</button>
          </form>
        ) : (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "green" }}>● Spotify Connected</span>
            <span onClick={handleClearToken} style={{ textDecoration: "underline", cursor: "pointer" }}>Disconnect</span>
          </div>
        )}
        {errorMsg && <div style={{ color: "red", marginTop: "2px" }}>{errorMsg}</div>}
      </div>
    </div>
  );
}
