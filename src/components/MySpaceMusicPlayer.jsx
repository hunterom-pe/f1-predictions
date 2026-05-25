import { useState, useEffect, useRef } from "react";

const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins < 10 ? "0" : ""}${mins}:${secs < 10 ? "0" : ""}${secs}`;
};

/**
 * MySpace Music Player integrated with Spotify Embed IFrame API and Mock fallback.
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
  
  const [embedController, setEmbedController] = useState(null);
  const [audioInitialized, setAudioInitialized] = useState(false);
  const [spotifyActive, setSpotifyActive] = useState(false);
  
  const containerRef = useRef(null);

  // 1. Fetch Track Metadata via Spotify Oembed API
  useEffect(() => {
    if (!spotifyTrackUri) return;
    
    // Reset playback stats on track change
    setAudioInitialized(false);
    setIsPlaying(false);
    setSpotifyActive(false);
    setCurrentTime(0);

    const fetchMetadata = async () => {
      try {
        const trackId = spotifyTrackUri.split(":")[2] || spotifyTrackUri;
        const res = await fetch(`https://open.spotify.com/oembed?url=https://open.spotify.com/track/${trackId}`);
        if (res.ok) {
          const data = await res.json();
          
          const rawTitle = data.title || "Unknown Song";
          let parsedTitle = rawTitle;
          let parsedArtist = "Unknown Artist";
          
          // Match "Song Title - Song by Artist Name" (case-insensitive)
          const match = rawTitle.match(/(.+?)\s+-\s+song\s+by\s+(.+)/i);
          if (match) {
            parsedTitle = match[1];
            parsedArtist = match[2];
          } else {
            const parts = rawTitle.split(" - ");
            if (parts.length > 1) {
              parsedTitle = parts[0];
              parsedArtist = parts[1];
            }
          }

          setTrackInfo({
            title: parsedTitle,
            artist: parsedArtist,
            duration: 240, // default placeholder
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
    <div className="myspace-player-widget beveled-box" style={{ padding: "8px", border: "1px solid #ff99cc" }}>
      <div className="player-inner" style={{ backgroundColor: "#003399" }}>
        
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
        <div className="player-screen" style={{ backgroundColor: "#000", color: "#ff66cc", position: "relative" }}>
          
          {/* Autoplay Compliance Gate Blinking Overlay */}
          {!audioInitialized && (
            <div 
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                backgroundColor: "#000",
                color: "#ff007f",
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

          <div className="track-info" style={{ borderBottom: "1px dashed #ff007f" }}>
            <span className="lcd-text scrolling-title" style={{ color: "#ff66cc" }}>
              🎧 {trackInfo.artist} - {trackInfo.title}
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
          <div className="controls-row" style={{ display: "flex", gap: "4px", width: "100%" }}>
            
            {/* Custom Vintage Play/Pause Vector Buttons */}
            <button 
              onClick={handlePlay} 
              className={`player-btn play-btn ${isPlaying ? "active" : ""}`} 
              style={{ flex: 1 }} 
              title="Play"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" style={{ fill: isPlaying ? "#39ff14" : "#ff66cc" }}>
                <path d="M2,1 L8,5 L2,9 Z" />
              </svg>
            </button>
            <button 
              onClick={handlePause} 
              className={`player-btn pause-btn ${!isPlaying ? "active" : ""}`} 
              style={{ flex: 1 }} 
              title="Pause"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" style={{ fill: !isPlaying ? "#39ff14" : "#ff66cc" }}>
                <path d="M2,1 H4 V9 H2 Z M6,1 H8 V9 H6 Z" />
              </svg>
            </button>

          </div>
          
          <div className="progress-bar-container">
            <div className="progress-bar-track">
              <div className="progress-bar-fill" style={{ width: `${progressPercent}%`, background: "linear-gradient(90deg, #ff66cc 0%, #ff007f 100%)" }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
