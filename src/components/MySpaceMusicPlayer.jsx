import { useState, useEffect, useRef } from "react";

const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins < 10 ? "0" : ""}${mins}:${secs < 10 ? "0" : ""}${secs}`;
};

const MOCK_TRACK_DATABASE = {
  "4PTG3Z6ehGkBF3zI7YSp6g": { title: "Such Great Heights", artist: "The Postal Service", duration: 266, durationStr: "04:26" },
  "298gs9ATwr2rD9tGYJKlQR": { title: "Dance Our Tears Away", artist: "John de Sohn", duration: 180, durationStr: "03:00" },
  "0VjIjW4GlUZAMYd2vXMi6b": { title: "Blinding Lights", artist: "The Weeknd", duration: 200, durationStr: "03:20" },
  "1u8c2t27vOIyUARilX3B6k": { title: "Seven Nation Army", artist: "The White Stripes", duration: 231, durationStr: "03:51" },
  "7w87Iwjcl627Ty80Gc73UI": { title: "Get Lucky", artist: "Daft Punk", duration: 369, durationStr: "06:09" },
  "3n3Pp39vTxncFG7510v5dr": { title: "Doin' It Right", artist: "Daft Punk", duration: 251, durationStr: "04:11" },
  "4iV5W9uYEdY5a7niJjQ6yP": { title: "Get Lucky", artist: "Daft Punk", duration: 369, durationStr: "06:09" },
  "6habF0tbwRg1uXwZ4uXk3t": { title: "Starlight", artist: "Muse", duration: 240, durationStr: "04:00" },
  "3aW0v27ARuU3w2oH6EgPGg": { title: "Supermassive Black Hole", artist: "Muse", duration: 209, durationStr: "03:29" },
  "7ouMYWpwJ422jWrk72SpbW": { title: "Hysteria", artist: "Muse", duration: 227, durationStr: "03:47" },
  "1Q5vVFVmC5jH3Y9F2lZ0kC": { title: "Uprising", artist: "Muse", duration: 303, durationStr: "05:03" }
};

/**
 * MySpace Music Player integrated with Spotify Embed IFrame API and Mock fallback.
 * @param {object} props
 * @param {string} props.spotifyTrackUri The unique spotify:track:URI to stream
 */
export default function MySpaceMusicPlayer({ 
  spotifyTrackUri = "spotify:track:4PTG3Z6ehGkBF3zI7YSp6g",
  spotifySongTitle = "",
  spotifyArtistName = ""
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [trackInfo, setTrackInfo] = useState({
    title: "Such Great Heights",
    artist: "The Postal Service",
    duration: 266,
    durationStr: "04:26"
  });
  
  const [embedController, setEmbedController] = useState(null);
  const [audioInitialized, setAudioInitialized] = useState(false);
  const [spotifyActive, setSpotifyActive] = useState(false);
  
  const containerRef = useRef(null);

  // 1. Fetch Track Metadata via Spotify Oembed API
  useEffect(() => {
    if (!spotifyTrackUri) return;
    
    // Reset playback stats on track change
    setTimeout(() => {
      setAudioInitialized(false);
      setIsPlaying(false);
      setSpotifyActive(false);
      setCurrentTime(0);
    }, 0);

    const trackId = spotifyTrackUri.split(":")[2] || spotifyTrackUri;
    const mockTrack = MOCK_TRACK_DATABASE[trackId];

    // Determine values based on user inputs or local mock database
    const finalTitle = spotifySongTitle || (mockTrack ? mockTrack.title : "");
    const finalArtist = spotifyArtistName || (mockTrack ? mockTrack.artist : "");

    // If both fields are successfully resolved, apply directly and skip fetching
    if (finalTitle && finalArtist) {
      setTimeout(() => {
        setTrackInfo({
          title: finalTitle,
          artist: finalArtist,
          duration: mockTrack?.duration || 240,
          durationStr: mockTrack?.durationStr || "04:00"
        });
      }, 0);
      return;
    }

    const fetchMetadata = async () => {
      try {
        const res = await fetch(`https://open.spotify.com/oembed?url=https://open.spotify.com/track/${trackId}`);
        if (res.ok) {
          const data = await res.json();
          const rawTitle = data.title || "Unknown Song";
          
          let parsedTitle = finalTitle || rawTitle;
          let parsedArtist = finalArtist || "Spotify Artist";
          
          if (!finalArtist) {
            // Match "Song Title - Song by Artist Name" (case-insensitive)
            const match = rawTitle.match(/(.+?)\s+-\s+song\s+by\s+(.+)/i);
            if (match) {
              if (!finalTitle) parsedTitle = match[1];
              parsedArtist = match[2];
            } else {
              const parts = rawTitle.split(" - ");
              if (parts.length > 1) {
                const secondPart = parts[1].toLowerCase();
                const isEditTag = ["radio edit", "edit", "remix", "single version", "album version", "remastered", "live"].some(tag => secondPart.includes(tag));
                if (!isEditTag) {
                  if (!finalTitle) parsedTitle = parts[0];
                  parsedArtist = parts[1];
                } else {
                  if (!finalTitle) parsedTitle = rawTitle;
                  parsedArtist = "Spotify Artist";
                }
              } else {
                parsedArtist = "Spotify Artist";
              }
            }
          }

          setTrackInfo({
            title: parsedTitle,
            artist: parsedArtist,
            duration: mockTrack?.duration || 240,
            durationStr: mockTrack?.durationStr || "04:00"
          });
        } else {
          setTrackInfo({
            title: finalTitle || "Spotify Track",
            artist: finalArtist || "Spotify Artist",
            duration: mockTrack?.duration || 240,
            durationStr: mockTrack?.durationStr || "04:00"
          });
        }
      } catch (err) {
        console.error("Failed to load Spotify oembed details:", err);
        setTrackInfo({
          title: finalTitle || "Spotify Track",
          artist: finalArtist || "Active Session",
          duration: mockTrack?.duration || 240,
          durationStr: mockTrack?.durationStr || "04:00"
        });
      }
    };

    fetchMetadata();
  }, [spotifyTrackUri, spotifySongTitle, spotifyArtistName]);

  // 2. Initialize/Mount Spotify Embed Controller
  useEffect(() => {
    let active = true;

    const initController = (IFrameAPI) => {
      if (!active || !containerRef.current) return;

      // Clear any previous iframe mounts inside container
      containerRef.current.innerHTML = "";
      const tempDiv = document.createElement("div");
      containerRef.current.appendChild(tempDiv);

      const options = {
        uri: spotifyTrackUri || "spotify:track:4PTG3Z6ehGkBF3zI7YSp6g",
        width: "100%",
        height: "80"
      };

      IFrameAPI.createController(tempDiv, options, (controller) => {
        if (!active) return;
        
        setEmbedController(controller);

        controller.addListener("playback_update", (e) => {
          if (!active) return;
          const { position, duration, isPaused } = e.data;
          
          setCurrentTime(Math.floor(position / 1000));
          setIsPlaying(!isPaused);
          
          if (duration) {
            setTrackInfo((prev) => ({
              ...prev,
              duration: Math.floor(duration / 1000),
              durationStr: formatTime(Math.floor(duration / 1000))
            }));
          }

          // Clear autoplay compliance block on actual playback start from Spotify
          if (!isPaused && position >= 0) {
            setAudioInitialized(true);
            setSpotifyActive(true);
          }
        });
      });
    };

    if (window.SpotifyIframeApi) {
      initController(window.SpotifyIframeApi);
    } else {
      const scriptId = "spotify-iframe-api";
      let script = document.getElementById(scriptId);
      if (!script) {
        script = document.createElement("script");
        script.id = scriptId;
        script.src = "https://open.spotify.com/embed/iframe-api/v1";
        script.async = true;
        document.body.appendChild(script);
      }

      const existingCallback = window.onSpotifyIframeApiReady;
      window.onSpotifyIframeApiReady = (IFrameAPI) => {
        window.SpotifyIframeApi = IFrameAPI;
        if (existingCallback) {
          existingCallback(IFrameAPI);
        }
        initController(IFrameAPI);
      };
    }

    return () => {
      active = false;
    };
  }, [spotifyTrackUri]);

  // 3. Simulated Playback interval for mock mode (active only when Spotify embed is inactive or blocked)
  useEffect(() => {
    let interval = null;
    if (isPlaying && !spotifyActive) {
      interval = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= trackInfo.duration) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, trackInfo.duration, spotifyActive]);

  const handlePlay = () => {
    setAudioInitialized(true);
    setIsPlaying(true);
    if (embedController) {
      embedController.play();
    }
  };

  const handlePause = () => {
    setIsPlaying(false);
    if (embedController) {
      embedController.pause();
    }
  };

  const progressPercent = (currentTime / trackInfo.duration) * 100;

  return (
    <div className="myspace-player-widget beveled-box">
      <div className="player-inner">
        
        {/* Headless Audio Mount Container */}
        <div 
          style={{ 
            position: "absolute", 
            width: "1px", 
            height: "1px", 
            opacity: 0.001, 
            pointerEvents: "none", 
            zIndex: -100, 
            overflow: "hidden" 
          }}
        >
          <div ref={containerRef} />
        </div>

        {/* LCD Screen */}
        <div className="player-screen" style={{ position: "relative" }}>
          
          {/* Autoplay Compliance Gate Blinking Overlay */}
          {!audioInitialized && (
            <div 
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                backgroundColor: "var(--player-screen-bg)",
                color: "var(--player-accent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "bold",
                fontSize: "11px",
                zIndex: 10,
                fontFamily: "monospace",
                textAlign: "center",
                cursor: "pointer",
                padding: "4px",
                boxSizing: "border-box"
              }}
              onClick={handlePlay}
            >
              <span className="retro-blink">&gt;&gt; CLICK PLAY TO TUNE IN &lt;&lt;</span>
            </div>
          )}

          <div className="track-info">
            <span className="lcd-text scrolling-title">
              🎧 {trackInfo.artist} - {trackInfo.title}
            </span>
          </div>
          <div className="playback-stats">
            <span className="time-display">{formatTime(currentTime)} / {trackInfo.durationStr}</span>
            <span className="kbps-label">56Kbps</span>
          </div>
          <div className="visualizer-container">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((barId) => (
              <div 
                key={barId} 
                className={`visualizer-bar bar-${barId} ${isPlaying ? "playing" : ""}`}
              />
            ))}
          </div>
        </div>

        {/* Player Controls */}
        <div className="player-controls">
          <div className="controls-row" style={{ display: "flex", gap: "4px", width: "100%" }}>
            
            {/* Custom Vintage Play/Pause Vector Buttons */}
            <button 
              onClick={handlePlay} 
              className="player-btn play-btn" 
              style={{ flex: 1 }} 
              title="Play"
            >
              <svg width="12" height="12" viewBox="0 0 10 10" style={{ fill: isPlaying ? "var(--player-btn-active)" : "var(--player-btn-inactive)", pointerEvents: "none" }}>
                <path d="M2,1 L8,5 L2,9 Z" />
              </svg>
            </button>
            <button 
              onClick={handlePause} 
              className="player-btn pause-btn" 
              style={{ flex: 1 }} 
              title="Pause"
            >
              <svg width="12" height="12" viewBox="0 0 10 10" style={{ fill: !isPlaying ? "var(--player-btn-active)" : "var(--player-btn-inactive)", pointerEvents: "none" }}>
                <path d="M2,1 H4 V9 H2 Z M6,1 H8 V9 H6 Z" />
              </svg>
            </button>

          </div>
          
          <div className="progress-bar-container">
            <div className="progress-bar-track">
              <div className="progress-bar-fill" style={{ width: `${progressPercent}%`, background: "var(--player-progress-fill)" }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
