"use client";

import { useEffect, useRef, useState } from "react";

const YOUTUBE_VIDEO_ID = "nhr0igKYIMQ";

interface YTPlayer {
  playVideo: () => void;
  pauseVideo: () => void;
  stopVideo: () => void;
  mute: () => void;
  unMute: () => void;
  setVolume: (volume: number) => void;
  destroy: () => void;
}

interface YTEvent {
  data: number;
  target: YTPlayer;
}

declare global {
  interface Window {
    YT?: {
      Player: new (
        elementId: string | HTMLElement,
        options: {
          videoId: string;
          playerVars?: Record<string, number | string>;
          events?: {
            onReady?: (event: YTEvent) => void;
            onStateChange?: (event: YTEvent) => void;
            onError?: (event: YTEvent) => void;
          };
        }
      ) => YTPlayer;
      PlayerState: {
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
        CUED: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface YouTubeBackgroundProps {
  isMuted: boolean;
  onVideoStateChange?: (state: { isReady: boolean; hasEnded: boolean; hasError: boolean }) => void;
}

export function YouTubeBackground({ isMuted, onVideoStateChange }: YouTubeBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const hasEndedRef = useRef(false);

  const [isReady, setIsReady] = useState(false);
  const [hasEnded, setHasEnded] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    onVideoStateChange?.({ isReady, hasEnded, hasError });
  }, [isReady, hasEnded, hasError, onVideoStateChange]);

  // Sync mute state after player is ready
  useEffect(() => {
    const player = playerRef.current;
    if (!player || !isReady || hasError) return;
    try {
      if (isMuted) {
        player.mute();
      } else {
        player.unMute();
        player.setVolume(80);
      }
    } catch {
      // Ignore if player is not yet interactive
    }
  }, [isMuted, isReady, hasError]);

  useEffect(() => {
    let isMounted = true;
    let loadTimeout: ReturnType<typeof setTimeout> | null = null;

    const initPlayer = () => {
      if (!isMounted || !containerRef.current || !window.YT?.Player) return;
      if (playerRef.current) return;

      try {
        playerRef.current = new window.YT.Player(containerRef.current, {
          videoId: YOUTUBE_VIDEO_ID,
          playerVars: {
            autoplay: 1,
            mute: 1,
            controls: 0,
            disablekb: 1,
            fs: 0,
            iv_load_policy: 3,
            loop: 0,
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
          },
          events: {
            onReady: (event) => {
              if (!isMounted) return;
              setIsReady(true);
              if (loadTimeout) clearTimeout(loadTimeout);
              try {
                event.target.mute();
                if (!hasEndedRef.current) {
                  event.target.playVideo();
                }
              } catch {
                // Autoplay may be blocked by browser policy; fallback remains visible
              }
            },
            onStateChange: (event) => {
              if (!isMounted || !window.YT) return;
              // Play only ONE TIME: when video ends, stop playback and never replay
              if (event.data === window.YT.PlayerState.ENDED) {
                hasEndedRef.current = true;
                setHasEnded(true);
                try {
                  event.target.pauseVideo();
                } catch {
                  // Ignore
                }
              }
            },
            onError: () => {
              if (!isMounted) return;
              if (loadTimeout) clearTimeout(loadTimeout);
              setHasError(true);
            },
          },
        });
      } catch {
        if (isMounted) setHasError(true);
      }
    };

    // Fallback timeout if YouTube IFrame API fails to load (e.g., offline or blocked)
    loadTimeout = setTimeout(() => {
      if (isMounted && !isReady) {
        setHasError(true);
      }
    }, 10000);

    if (window.YT?.Player) {
      initPlayer();
    } else {
      const existingScript = document.querySelector<HTMLScriptElement>(
        'script[src="https://www.youtube.com/iframe_api"]'
      );

      const previousCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        previousCallback?.();
        initPlayer();
      };

      if (!existingScript) {
        const script = document.createElement("script");
        script.src = "https://www.youtube.com/iframe_api";
        script.async = true;
        script.onerror = () => {
          if (isMounted) setHasError(true);
        };
        document.head.appendChild(script);
      }
    }

    return () => {
      isMounted = false;
      if (loadTimeout) clearTimeout(loadTimeout);
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch {
          // Ignore cleanup errors
        }
        playerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#07070b] select-none"
    >
      {/* Gear 5 Fallback / Base Cinematic Layer (always present beneath video & visible if video fails or before load) */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.14)_0%,_rgba(220,38,38,0.16)_35%,_rgba(245,158,11,0.08)_60%,_#07070b_100%)]" />
      <div className="gear5-cloud-glow absolute -top-32 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-white/10 blur-[120px]" />
      <div className="absolute bottom-[-120px] right-[-80px] h-[420px] w-[420px] rounded-full bg-red-600/15 blur-[130px]" />
      <div className="absolute bottom-[15%] left-[-100px] h-[360px] w-[360px] rounded-full bg-amber-400/10 blur-[120px]" />

      {/* YouTube IFrame Player wrapper scaled to cover viewport without stretching (16:9) */}
      {!hasError && (
        <div
          className={`absolute inset-0 transition-opacity duration-1000 ${
            isReady ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="absolute top-1/2 left-1/2 h-[56.25vw] min-h-full w-[177.78vh] min-w-full -translate-x-1/2 -translate-y-1/2">
            <div ref={containerRef} className="h-full w-full" />
          </div>
        </div>
      )}

      {/* Subtle dark overlay + vignette so chat interface remains crisp and readable */}
      <div
        className={`absolute inset-0 transition-colors duration-1000 ${
          hasEnded
            ? "bg-gradient-to-b from-black/75 via-black/65 to-black/85"
            : "bg-gradient-to-b from-black/60 via-black/50 to-black/75"
        }`}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_25%,rgba(0,0,0,0.65)_100%)]" />
    </div>
  );
}
