"use client";

import { useEffect, useState } from "react";
import { Play, Loader2 } from "lucide-react";

// Extend Window interface to include flowplayerInstance
declare global {
  interface Window {
    flowplayerInstance?: any;
  }
}

interface VideoPlayerProps {
  sessionId: string;
  embedCode?: string;
}

export function VideoPlayer({ sessionId, embedCode }: VideoPlayerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const [streamingSettings, setStreamingSettings] = useState({
    hlsUrl:
      "https://cdn3.wowza.com/5/czJVZ2VkUjllaVQx/SecureLive/smil:out.smil/playlist.m3u8",
    playerId: "46fbbf30-5af9-4860-b4b1-6706ac91984e",
    playerToken:
      "eyJraWQiOiJYMzdESU55UmF6bFEiLCJ0eXAiOiJKV1QiLCJhbGciOiJFUzI1NiJ9.eyJjIjoie1wiYWNsXCI6MzgsXCJpZFwiOlwiWDM3RElOeVJhemxRXCJ9IiwiaXNzIjoiRmxvd3BsYXllciJ9._rtVLPQzfdsbtI4UHrjX1IzwwfGTPQK988D8W0C9sEOrvZEG82i9S4ApbIkxYY5sQwq38h2DWFypXM2d15AYng",
    posterImage: "",
  });

  // Load streaming settings
  useEffect(() => {
    const loadStreamingSettings = async () => {
      try {
        const response = await fetch("/api/admin/settings");
        const data = await response.json();
        if (data.success && data.settings?.streaming) {
          setStreamingSettings(data.settings.streaming);
        }
      } catch (error) {
        console.error("Failed to load streaming settings:", error);
      }
    };

    loadStreamingSettings();
  }, []);

  useEffect(() => {
    // Send heartbeat to keep session active
    const heartbeatInterval = setInterval(async () => {
      try {
        await fetch("/api/sessions/heartbeat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
      } catch (err) {
        console.error("Heartbeat failed:", err);
      }
    }, 30000); // Every 30 seconds

    return () => clearInterval(heartbeatInterval);
  }, [sessionId]);

  useEffect(() => {
    const initializeFlowplayer = () => {
      try {
        setIsLoading(true);
        console.log("Starting Flowplayer initialization...");

        // Listen for player ready event
        const handlePlayerReady = () => {
          console.log("Received player ready event");
          setIsLoading(false);
        };

        // Listen for play events
        const handlePlayerPlay = () => {
          console.log("Received player play event");
          setIsPlaying(true);
        };

        const handlePlayerPause = () => {
          console.log("Received player pause event");
          setIsPlaying(false);
        };

        window.addEventListener("flowplayer-ready", handlePlayerReady);
        window.addEventListener("flowplayer-play", handlePlayerPlay);
        window.addEventListener("flowplayer-pause", handlePlayerPause);

        // Create script and add to head immediately
        const script = document.createElement("script");
        script.type = "module";
        script.innerHTML = `
          import flowplayer from "https://embed.wowza.com/${
            streamingSettings.playerId
          }.js";
          
          const initPlayer = () => {
            const playerElement = document.getElementById('player-${
              streamingSettings.playerId
            }');
            if (!playerElement) {
              console.log('Player element not found, retrying in 50ms...');
              setTimeout(initPlayer, 50);
              return;
            }
            
            console.log('Player element found, initializing Flowplayer...');
            console.log('Streaming settings:', ${JSON.stringify(streamingSettings)});
            console.log('Autoplay setting:', ${streamingSettings.autoplay});
            console.log('Muted setting:', ${streamingSettings.muted});
            try {
              const player = flowplayer("#player-${
                streamingSettings.playerId
              }", {
                "src": "${streamingSettings.hlsUrl}",
                ${
                  streamingSettings.playerToken
                    ? `token: "${streamingSettings.playerToken}",`
                    : ""
                }
                ${
                  streamingSettings.posterImage
                    ? `poster: "${streamingSettings.posterImage}",`
                    : ""
                }
                autoplay: false,
                muted: false
              });
              
              // Hide loading as soon as player is ready
              if (player && player.on) {
                player.on('ready', () => {
                  console.log('Player is ready, hiding loading...');
                  window.dispatchEvent(new CustomEvent('flowplayer-ready'));
                });
                
                // Track playing state
                player.on('play', () => {
                  console.log('Player started playing');
                  window.dispatchEvent(new CustomEvent('flowplayer-play'));
                });
                
                player.on('pause', () => {
                  console.log('Player paused');
                  window.dispatchEvent(new CustomEvent('flowplayer-pause'));
                });
                
                player.on('ended', () => {
                  console.log('Player ended');
                  window.dispatchEvent(new CustomEvent('flowplayer-pause'));
                });
                
                player.on('loadstart', () => {
                  console.log('Video loading started');
                  window.dispatchEvent(new CustomEvent('flowplayer-loading'));
                });
                
                // Listen for volume changes to hide overlay
                player.on('volumechange', () => {
                  if (player.muted === false && player.volume > 0) {
                    window.dispatchEvent(new CustomEvent('flowplayer-unmuted'));
                  }
                });
                
                // Debug autoplay events
                player.on('play', () => {
                  console.log('Player started playing');
                });
                
                player.on('pause', () => {
                  console.log('Player paused');
                });
                
                player.on('error', (e) => {
                  console.error('Player error:', e);
                });
                
                // Store player reference globally for unmute overlay
                window.flowplayerInstance = player;
              }
              
              console.log('Flowplayer initialized successfully');
            } catch (error) {
              console.error('Flowplayer initialization error:', error);
            }
          };
          
          // Start trying to initialize after a small delay
          setTimeout(initPlayer, 200);
        `;

        document.head.appendChild(script);
        console.log("Flowplayer script added to head");

        // Fallback timeout - reduced to 1 second
        setTimeout(() => {
          console.log("Fallback timeout - setting loading to false");
          setIsLoading(false);
        }, 1000);

        // Cleanup
        return () => {
          window.removeEventListener("flowplayer-ready", handlePlayerReady);
          window.removeEventListener("flowplayer-play", handlePlayerPlay);
          window.removeEventListener("flowplayer-pause", handlePlayerPause);
        };
      } catch (err) {
        console.error("Failed to initialize Flowplayer:", err);
        setError("Failed to load video player");
        setIsLoading(false);
      }
    };

    return initializeFlowplayer();
  }, [streamingSettings]);

  if (error) {
    return (
      <div className="aspect-video bg-red-900/20 border border-red-500/30 rounded-lg flex items-center justify-center">
        <div className="text-center text-red-400">
          <div className="text-4xl mb-4">⚠️</div>
          <h3 className="text-xl font-semibold mb-2">Video Player Error</h3>
          <p className="text-red-300">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="aspect-video bg-gray-900 rounded-lg flex items-center justify-center relative overflow-hidden">
        {streamingSettings.posterImage && (
          <div 
            className="absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${streamingSettings.posterImage})` }}
          />
        )}
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center z-10">
          <div className="text-center text-white">
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" />
            <p className="text-lg">Loading video player...</p>
          </div>
        </div>
      </div>
    );
  }

  const handlePlay = () => {
    try {
      if (window.flowplayerInstance) {
        // Ensure audio is unmuted when user clicks play
        window.flowplayerInstance.muted = false;
        window.flowplayerInstance.volume = 1;
        window.flowplayerInstance.play();
        setIsPlaying(true);
        console.log("Started playback with audio enabled");
      }
    } catch (error) {
      console.error("Error starting playback:", error);
    }
  };

  return (
    <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden relative">
      {/* Poster Image Background - Always visible when not playing */}
      {streamingSettings.posterImage && !isPlaying && (
        <div 
          className="absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat z-5"
          style={{ backgroundImage: `url(${streamingSettings.posterImage})` }}
        />
      )}
      <div
        id={`player-${streamingSettings.playerId}`}
        className="w-full h-full relative z-10"
      />

      {/* Play Overlay - Show when not playing */}
      {!isLoading && !error && !isPlaying && (
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center z-20">
          <button
            onClick={handlePlay}
            className="bg-white/90 hover:bg-white text-gray-900 px-8 py-4 rounded-lg flex items-center gap-3 transition-all duration-200 hover:scale-105 shadow-lg"
          >
            <Play className="w-6 h-6" />
            <div className="text-left">
              <div className="font-semibold text-lg">Click to Play</div>
              <div className="text-sm text-gray-600">
                Start streaming with audio
              </div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
