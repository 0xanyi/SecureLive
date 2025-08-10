"use client";

import { useEffect, useState } from "react";
import { Play, VolumeX, Loader2 } from "lucide-react";

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
  const [showUnmuteOverlay, setShowUnmuteOverlay] = useState(false);
  const [showPlayOverlay, setShowPlayOverlay] = useState(false);
  const [streamingSettings, setStreamingSettings] = useState({
    hlsUrl:
      "https://cdn3.wowza.com/5/NVF5TVdNQmR5OHRI/cln/smil:clnout.smil/playlist.m3u8",
    playerId: "46fbbf30-5af9-4860-b4b1-6706ac91984e",
    playerToken:
      "eyJraWQiOiJYMzdESU55UmF6bFEiLCJ0eXAiOiJKV1QiLCJhbGciOiJFUzI1NiJ9.eyJjIjoie1wiYWNsXCI6MzgsXCJpZFwiOlwiWDM3RElOeVJhemxRXCJ9IiwiaXNzIjoiRmxvd3BsYXllciJ9._rtVLPQzfdsbtI4UHrjX1IzwwfGTPQK988D8W0C9sEOrvZEG82i9S4ApbIkxYY5sQwq38h2DWFypXM2d15AYng",
    autoplay: false,
    muted: true,
  });

  // Load streaming settings
  useEffect(() => {
    const loadStreamingSettings = async () => {
      try {
        const response = await fetch("/api/admin/streaming-settings");
        const data = await response.json();
        if (data.success && data.streamingSettings) {
          setStreamingSettings(data.streamingSettings);
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

        // Listen for unmute event
        const handlePlayerUnmuted = () => {
          console.log("Player unmuted, hiding overlay");
          setShowUnmuteOverlay(false);
        };

        // Listen for autoplay failure
        const handleAutoplayFailed = () => {
          console.log("Autoplay failed, showing play overlay");
          setShowPlayOverlay(true);
          setShowUnmuteOverlay(false); // Hide unmute overlay when showing play overlay
        };

        window.addEventListener("flowplayer-ready", handlePlayerReady);
        window.addEventListener("flowplayer-unmuted", handlePlayerUnmuted);
        window.addEventListener("flowplayer-autoplay-failed", handleAutoplayFailed);

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
                autoplay: ${streamingSettings.autoplay ? 'true' : 'false'},
                muted: ${streamingSettings.muted ? 'true' : 'false'}
              });
              
              // Hide loading as soon as player is ready
              if (player && player.on) {
                player.on('ready', () => {
                  console.log('Player is ready, hiding loading...');
                  window.dispatchEvent(new CustomEvent('flowplayer-ready'));
                  
                  // Show unmute overlay if stream is muted (regardless of autoplay)
                  if (${streamingSettings.muted}) {
                    setTimeout(() => {
                      setShowUnmuteOverlay(true);
                    }, 1000);
                  }
                  
                  // If autoplay is enabled, try to start playback
                  if (${streamingSettings.autoplay}) {
                    console.log('Autoplay is enabled, attempting to start playback...');
                    setTimeout(() => {
                      try {
                        player.play().then(() => {
                          console.log('Autoplay successful');
                        }).catch((error) => {
                          console.log('Autoplay failed (likely due to browser policy):', error);
                          console.log('User interaction will be required to start playback');
                          window.dispatchEvent(new CustomEvent('flowplayer-autoplay-failed'));
                        });
                      } catch (error) {
                        console.log('Autoplay attempt failed:', error);
                        window.dispatchEvent(new CustomEvent('flowplayer-autoplay-failed'));
                      }
                    }, 500);
                  }
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
          window.removeEventListener("flowplayer-unmuted", handlePlayerUnmuted);
          window.removeEventListener("flowplayer-autoplay-failed", handleAutoplayFailed);
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
      <div className="aspect-video bg-gray-900 rounded-lg flex items-center justify-center">
        <div className="text-center text-white">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" />
          <p className="text-lg">Loading video player...</p>
        </div>
      </div>
    );
  }

  const handleUnmute = () => {
    try {
      // Try to unmute the Flowplayer instance
      if (window.flowplayerInstance) {
        window.flowplayerInstance.muted = false;
        window.flowplayerInstance.volume = 1;
        console.log("Unmuted via overlay");
        setShowUnmuteOverlay(false);
      } else {
        // Fallback: try to find and click the player's unmute button
        const playerElement = document.getElementById(
          `player-${streamingSettings.playerId}`
        );
        if (playerElement) {
          const muteButton = playerElement.querySelector(
            '[data-testid="mute"], .fp-mute, [aria-label*="mute"], [title*="mute"]'
          );
          if (muteButton) {
            (muteButton as HTMLElement).click();
          }
        }
        setShowUnmuteOverlay(false);
      }
    } catch (error) {
      console.error("Error unmuting:", error);
      setShowUnmuteOverlay(false);
    }
  };

  const handlePlay = () => {
    try {
      if (window.flowplayerInstance) {
        window.flowplayerInstance.play();
        console.log("Started playback via overlay");
        setShowPlayOverlay(false);
      }
    } catch (error) {
      console.error("Error starting playback:", error);
      setShowPlayOverlay(false);
    }
  };

  return (
    <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden relative">
      <div
        id={`player-${streamingSettings.playerId}`}
        className="w-full h-full"
      />

      {/* Play Overlay (for autoplay failures) */}
      {showPlayOverlay && !isLoading && !error && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-20">
          <button
            onClick={handlePlay}
            className="bg-white/90 hover:bg-white text-gray-900 px-8 py-4 rounded-lg flex items-center gap-3 transition-all duration-200 hover:scale-105 shadow-lg"
          >
            <Play className="w-6 h-6" />
            <div className="text-left">
              <div className="font-semibold text-lg">Click to Play</div>
              <div className="text-sm text-gray-600">
                Autoplay was blocked by your browser
              </div>
            </div>
          </button>
        </div>
      )}

      {/* Unmute Overlay */}
      {showUnmuteOverlay && !showPlayOverlay && !isLoading && !error && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
          <button
            onClick={handleUnmute}
            className="bg-white/90 hover:bg-white text-gray-900 px-8 py-4 rounded-lg flex items-center gap-3 transition-all duration-200 hover:scale-105 shadow-lg"
          >
            <VolumeX className="w-6 h-6" />
            <div className="text-left">
              <div className="font-semibold text-lg">Click to Unmute</div>
              <div className="text-sm text-gray-600">
                Stream audio is muted by default
              </div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
