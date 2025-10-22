"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import dynamic from "next/dynamic";
import { createClient } from "@/utils/supabase/client";
import {
  AlertCircle,
  Loader2,
  RefreshCw,
  Video,
  Cast,
  X,
} from "lucide-react";

const GoogleMeetStream = dynamic(
  () => Promise.resolve(GoogleMeetStreamInner),
  { ssr: false }
);

export default GoogleMeetStream;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type MeetSpace = {
  name: string;
  meetingCode?: string;
  meetingUri?: string;
  spaceType?: string;
  config?: {
    title?: string;
  };
  activeConference?: {
    conferenceRecord?: string;
  };
};

type RemoteStreamState =
  | { status: "idle" }
  | { status: "loading"; message?: string }
  | { status: "ready" }
  | { status: "error"; message: string };

type MediaSessionCreateResponse = {
  name?: string;
  answer?: {
    type?: string;
    sdp?: string;
  };
  iceCandidates?: Array<{
    candidate: string;
    sdpMid?: string | null;
    sdpMLineIndex?: number | null;
  }>;
};

type LookupSpaceResponse = {
  name?: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const RECEIVE_ONLY_CONSTRAINTS: RTCOfferOptions = {
  offerToReceiveAudio: true,
  offerToReceiveVideo: true,
};

function normalizeSpace(space: any): MeetSpace {
  return {
    name: space?.name ?? "",
    meetingCode: space?.meetingCode ?? undefined,
    meetingUri: space?.meetingUri ?? undefined,
    spaceType: space?.spaceType ?? undefined,
    config: space?.config ?? undefined,
    activeConference: space?.activeConference ?? undefined,
  };
}

function getDisplayName(space: MeetSpace) {
  return (
    space.config?.title ||
    (space.meetingCode
      ? space.meetingCode.replace(/-/g, " ").toUpperCase()
      : space.name)
  );
}

function extractMeetingCode(input: string) {
  if (!input) {
    return "";
  }
  const trimmed = input.trim();
  const urlMatch = trimmed.match(
    /https?:\/\/meet\.google\.com\/([a-z0-9-]+)/i
  );
  const candidate = urlMatch ? urlMatch[1] : trimmed;
  const codeMatch = candidate.match(
    /([a-zA-Z0-9]{3})-?([a-zA-Z0-9]{4})-?([a-zA-Z0-9]{3})/
  );
  if (codeMatch) {
    return `${codeMatch[1]}-${codeMatch[2]}-${codeMatch[3]}`.toLowerCase();
  }
  return candidate.replace(/[^a-zA-Z0-9-]/g, "").toLowerCase();
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
function GoogleMeetStreamInner() {
  const supabase = useMemo(() => createClient(), []);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [spaces, setSpaces] = useState<MeetSpace[]>([]);
  const [spacesLoading, setSpacesLoading] = useState(false);
  const [spacesError, setSpacesError] = useState<string | null>(null);
  const [selectedSpace, setSelectedSpace] = useState<string>("");
  const [meetingCode, setMeetingCode] = useState("");
  const [remoteState, setRemoteState] = useState<RemoteStreamState>({
    status: "idle",
  });
  const [viewerName, setViewerName] = useState("Embedded Viewer");

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const mediaSessionNameRef = useRef<string | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const candidateBufferRef = useRef<RTCIceCandidateInit[]>([]);
  const flushTimerRef = useRef<number | null>(null);

  // -------------------------------------------------------------------------
  // Fetch the Supabase provider token (Google OAuth access token)
  // -------------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    async function loadToken() {
      try {
        const { data } = await supabase.auth.getSession();
        if (!cancelled) {
          setAccessToken(data?.session?.provider_token ?? null);
        }
      } catch (error) {
        console.error("Failed to load session token", error);
        if (!cancelled) {
          setAccessToken(null);
        }
      }
    }
    void loadToken();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  // -------------------------------------------------------------------------
  // Load recent Meet spaces when token is available
  // -------------------------------------------------------------------------
  const fetchSpaces = useCallback(async () => {
    if (!accessToken) {
      setSpaces([]);
      return;
    }
    setSpacesLoading(true);
    setSpacesError(null);

    try {
      const url = new URL("https://meet.googleapis.com/v2/spaces");
      url.searchParams.set("pageSize", "25");
      url.searchParams.set("orderBy", "last_activity_time desc");

      const res = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "X-Goog-FieldMask":
            "spaces.name,spaces.meetingCode,spaces.meetingUri,spaces.config.title,spaces.activeConference.conferenceRecord,spaces.spaceType",
        },
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(
          text || `Failed to load spaces (${res.status.toString()})`
        );
      }

      const json = await res.json();
      const items = Array.isArray(json?.spaces) ? json.spaces : [];
      setSpaces(items.map(normalizeSpace));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to load Meet spaces.";
      console.error("Meet spaces fetch failed:", message);
      setSpacesError(message);
      setSpaces([]);
    } finally {
      setSpacesLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken) {
      setSpaces([]);
      return;
    }
    void fetchSpaces();
  }, [accessToken, fetchSpaces]);

  // -------------------------------------------------------------------------
  // Video element binding
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!videoRef.current || !remoteStreamRef.current) {
      return;
    }
    videoRef.current.srcObject = remoteStreamRef.current;
  }, [remoteState]);

  const cleanupPeerConnection = useCallback(async () => {
    candidateBufferRef.current = [];
    if (flushTimerRef.current) {
      window.clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }

    if (pcRef.current) {
      try {
        pcRef.current.getSenders().forEach((sender) => {
          sender.track?.stop();
        });
        pcRef.current.getReceivers().forEach((receiver) => {
          receiver.track?.stop();
        });
        pcRef.current.close();
      } catch (error) {
        console.warn("Failed to cleanup peer connection:", error);
      }
      pcRef.current = null;
    }

    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach((track) => track.stop());
      remoteStreamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    if (accessToken && mediaSessionNameRef.current) {
      const url = `https://meet.googleapis.com/v2/${mediaSessionNameRef.current}:disconnect`;
      try {
        await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        });
      } catch (error) {
        console.debug("Failed to notify Meet of disconnect:", error);
      }
    }

    mediaSessionNameRef.current = null;
  }, [accessToken]);

  useEffect(() => {
    return () => {
      void cleanupPeerConnection();
    };
  }, [cleanupPeerConnection]);

  const flushBufferedCandidates = useCallback(async () => {
    if (
      !accessToken ||
      !mediaSessionNameRef.current ||
      candidateBufferRef.current.length === 0
    ) {
      return;
    }

    const candidates = [...candidateBufferRef.current];
    candidateBufferRef.current = [];

    const url = `https://meet.googleapis.com/v2/${mediaSessionNameRef.current}:addIceCandidates`;
    try {
      await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ iceCandidates: candidates }),
      });
    } catch (error) {
      console.error("Failed to send ICE candidates:", error);
    }
  }, [accessToken]);

  const debounceCandidateFlush = useCallback(() => {
    if (flushTimerRef.current) {
      window.clearTimeout(flushTimerRef.current);
    }
    flushTimerRef.current = window.setTimeout(() => {
      flushTimerRef.current = null;
      void flushBufferedCandidates();
    }, 750);
  }, [flushBufferedCandidates]);

  const lookupSpaceByMeetingCode = useCallback(
    async (code: string): Promise<string | null> => {
      if (!accessToken) {
        setRemoteState({
          status: "error",
          message: "Connect your Google account to look up meeting codes.",
        });
        return null;
      }
      const normalized = extractMeetingCode(code);
      if (!normalized) {
        setRemoteState({
          status: "error",
          message: "Enter a valid Google Meet code.",
        });
        return null;
      }
      try {
        const res = await fetch(
          "https://meet.googleapis.com/v2/spaces:lookup",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
              "X-Goog-FieldMask": "name,meetingCode",
            },
            body: JSON.stringify({ meetingCode: normalized }),
          }
        );
        if (!res.ok) {
          const text = await res.text();
          throw new Error(
            text || `Meeting lookup failed (${res.status.toString()})`
          );
        }
        const json = (await res.json()) as LookupSpaceResponse;
        if (!json?.name) {
          setRemoteState({
            status: "error",
            message:
              "Could not find a meeting with that code. Double-check the code or start the meeting first.",
          });
          return null;
        }
        return json.name;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to lookup meeting.";
        console.error("Meet lookup failed:", message);
        setRemoteState({ status: "error", message });
        return null;
      }
    },
    [accessToken, setRemoteState]
  );

  const startStreaming = useCallback(
    async (spaceName: string) => {
      if (!accessToken) {
        setRemoteState({
          status: "error",
          message: "Sign in with Google to access Meet streaming.",
        });
        return;
      }

      if (!spaceName) {
        setRemoteState({ status: "error", message: "No space selected." });
        return;
      }

      setRemoteState({
        status: "loading",
        message: "Connecting to meeting...",
      });
      await cleanupPeerConnection();

      try {
        const pc = new RTCPeerConnection({
          iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        });
        pcRef.current = pc;

        const inboundStream = new MediaStream();
        remoteStreamRef.current = inboundStream;

        pc.ontrack = (event) => {
          if (event.streams && event.streams.length > 0) {
            remoteStreamRef.current = event.streams[0];
          } else {
            inboundStream.addTrack(event.track);
            remoteStreamRef.current = inboundStream;
          }

          setRemoteState({ status: "ready" });
          if (videoRef.current && remoteStreamRef.current) {
            videoRef.current.srcObject = remoteStreamRef.current;
          }
        };

        pc.onconnectionstatechange = () => {
          if (!pcRef.current) {
            return;
          }
          const state = pcRef.current.connectionState;
          if (state === "failed" || state === "disconnected") {
            setRemoteState({
              status: "error",
              message: "Connection lost. Try reconnecting.",
            });
          }
        };

        pc.onicecandidate = (event) => {
          if (!event.candidate) {
            return;
          }
          candidateBufferRef.current.push({
            candidate: event.candidate.candidate,
            sdpMid: event.candidate.sdpMid ?? undefined,
            sdpMLineIndex: event.candidate.sdpMLineIndex ?? undefined,
          });
          debounceCandidateFlush();
        };

        // Receive-only subscription to the meeting media streams
        pc.addTransceiver("audio", { direction: "recvonly" });
        pc.addTransceiver("video", { direction: "recvonly" });

        const offer = await pc.createOffer(RECEIVE_ONLY_CONSTRAINTS);
        await pc.setLocalDescription(offer);

        const url = `https://meet.googleapis.com/v2/${spaceName}/participants/-/mediaSessions`;
        const res = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            participant: {
              displayName: viewerName || "Embedded Viewer",
            },
            sessionDescription: {
              type: "OFFER",
              sdp: offer.sdp,
            },
            receiveSettings: {
              audio: {
                receiveStreams: [
                  {
                    streamType: "AUDIO_STREAM_TYPE_UNSPECIFIED",
                  },
                ],
              },
              video: {
                receiveStreams: [
                  {
                    streamType: "VIDEO_STREAM_TYPE_MAIN",
                    maxResolution: "RESOLUTION_HIGH",
                  },
                ],
              },
            },
          }),
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || `Media session failed (${res.status})`);
        }

        const data =
          (await res.json()) as MediaSessionCreateResponse | undefined;

        if (!data?.answer?.sdp) {
          throw new Error("Meet returned an invalid media answer.");
        }

        mediaSessionNameRef.current = data.name ?? null;

        await pc.setRemoteDescription(
          new RTCSessionDescription({
            type: (data.answer.type as RTCSdpType) || "answer",
            sdp: data.answer.sdp,
          })
        );

        if (Array.isArray(data.iceCandidates)) {
          for (const candidate of data.iceCandidates) {
            try {
              await pc.addIceCandidate({
                candidate: candidate.candidate,
                sdpMid: candidate.sdpMid ?? undefined,
                sdpMLineIndex: candidate.sdpMLineIndex ?? undefined,
              });
            } catch (error) {
              console.warn("Failed to add remote ICE candidate:", error);
            }
          }
        }

        setRemoteState({ status: "ready" });
      } catch (error) {
        console.error("Meet streaming failed:", error);
        const message =
          error instanceof Error
            ? error.message
            : "Unable to connect to Google Meet.";
        setRemoteState({ status: "error", message });
        await cleanupPeerConnection();
      }
    },
    [accessToken, cleanupPeerConnection, debounceCandidateFlush, viewerName]
  );

  const handleJoinSelected = useCallback(async () => {
    if (!selectedSpace) {
      setRemoteState({ status: "error", message: "Please select a meeting." });
      return;
    }
    await startStreaming(selectedSpace);
  }, [selectedSpace, startStreaming]);

  const handleJoinByCode = useCallback(async () => {
    if (!meetingCode.trim()) {
      setRemoteState({
        status: "error",
        message: "Enter a valid meeting code.",
      });
      return;
    }
    setRemoteState({
      status: "loading",
      message: "Looking up meeting code...",
    });
    const spaceName = await lookupSpaceByMeetingCode(meetingCode);
    if (!spaceName) {
      return;
    }
    setSelectedSpace(spaceName);
    await startStreaming(spaceName);
  }, [lookupSpaceByMeetingCode, meetingCode, startStreaming]);

  const handleStop = useCallback(async () => {
    await cleanupPeerConnection();
    setRemoteState({ status: "idle" });
  }, [cleanupPeerConnection]);

  const isBusy =
    remoteState.status === "loading" ||
    remoteState.status === "ready" ||
    remoteState.status === "error";

  return (
    <div className="flex h-full flex-col overflow-hidden bg-slate-950/40 text-white backdrop-blur-sm">
      <header className="border-b border-white/10 px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Cast className="h-5 w-5 text-emerald-300" />
            <div>
              <h2 className="text-lg font-semibold leading-tight">
                Google Meet Stream
              </h2>
              <p className="text-xs text-slate-300/70">
                Stream live meeting audio and video right inside the dashboard.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => fetchSpaces()}
            disabled={spacesLoading || !accessToken}
            className="inline-flex items-center gap-2 rounded-md border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-100 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {spacesLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Refresh
          </button>
        </div>
      </header>

      {!accessToken ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center text-slate-300">
          <AlertCircle className="h-8 w-8 text-amber-400" />
          <p className="max-w-md text-sm leading-relaxed">
            Connect your Google account from{" "}
            <span className="font-semibold">Settings → Integrations</span> to
            stream Meet calls directly in BrokerNest. You&rsquo;ll need Meet
            media scopes enabled.
          </p>
        </div>
      ) : (
        <div className="flex flex-1 flex-col lg:flex-row">
          <aside className="w-full border-b border-white/10 px-6 py-5 text-sm lg:w-80 lg:border-b-0 lg:border-r">
            <div className="space-y-5">
              <div>
                <label
                  htmlFor="viewer-name"
                  className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-300/80"
                >
                  Display As
                </label>
                <input
                  id="viewer-name"
                  type="text"
                  value={viewerName}
                  onChange={(event) => setViewerName(event.target.value)}
                  className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                  placeholder="Participant name"
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>

              <div>
                <label
                  htmlFor="meeting-code"
                  className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-300/80"
                >
                  Join With Meeting Code
                </label>
                <div className="flex gap-2">
                  <input
                    id="meeting-code"
                    type="text"
                    value={meetingCode}
                    onChange={(event) => setMeetingCode(event.target.value)}
                    className="flex-1 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                    placeholder="abc-defg-hij"
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <button
                    type="button"
                    onClick={() => void handleJoinByCode()}
                    className="inline-flex items-center gap-2 rounded-md bg-emerald-500 px-3 py-2 text-xs font-semibold text-emerald-950 transition hover:bg-emerald-400"
                    disabled={remoteState.status === "loading"}
                  >
                    <Video className="h-3.5 w-3.5" />
                    Join
                  </button>
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between text-xs font-medium uppercase tracking-wide text-slate-300/80">
                  <span>Recent Spaces</span>
                  <span className="text-[10px] text-slate-400">
                    {spaces.length} loaded
                  </span>
                </div>

                {spacesError ? (
                  <p className="rounded-md border border-white/10 bg-red-500/10 px-3 py-3 text-xs text-red-200">
                    {spacesError}
                  </p>
                ) : spaces.length === 0 && spacesLoading ? (
                  <p className="flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-3 text-xs text-slate-200">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Loading spaces…
                  </p>
                ) : spaces.length === 0 ? (
                  <p className="rounded-md border border-white/10 bg-white/5 px-3 py-3 text-xs text-slate-300">
                    No recent meeting spaces found. Start a meeting first or use
                    a meeting code.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {spaces.map((space) => {
                      const active = selectedSpace === space.name;
                      return (
                        <li key={space.name}>
                          <button
                            type="button"
                            onClick={() => setSelectedSpace(space.name)}
                            className={`w-full rounded-md border px-3 py-2 text-left text-xs transition ${
                              active
                                ? "border-emerald-400 bg-emerald-400/20 text-emerald-100"
                                : "border-white/10 bg-white/5 text-slate-200 hover:border-emerald-400/60 hover:bg-emerald-400/10"
                            }`}
                          >
                            <div className="font-semibold">
                              {getDisplayName(space)}
                            </div>
                            <div className="mt-1 flex items-center justify-between text-[11px] text-slate-300/70">
                              <span>{space.meetingCode ?? "No code"}</span>
                              <span>
                                {space.activeConference?.conferenceRecord
                                  ? "Live"
                                  : "Not live"}
                              </span>
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <button
                type="button"
                onClick={() => void handleJoinSelected()}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-emerald-500 px-3 py-2 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={!selectedSpace || remoteState.status === "loading"}
              >
                {remoteState.status === "loading" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Video className="h-4 w-4" />
                )}
                {remoteState.status === "ready" ? "Reconnect" : "Join meeting"}
              </button>

              {remoteState.status === "ready" && (
                <button
                  type="button"
                  onClick={() => void handleStop()}
                  className="flex w-full items-center justify-center gap-2 rounded-md border border-white/20 bg-transparent px-3 py-2 text-sm font-semibold text-white transition hover:border-red-400 hover:text-red-200"
                >
                  <X className="h-4 w-4" />
                  Hang up
                </button>
              )}
            </div>
          </aside>

          <main className="relative flex flex-1 items-center justify-center bg-black/60">
            {remoteState.status === "ready" && remoteStreamRef.current ? (
              <video
                ref={videoRef}
                className="h-full w-full object-contain"
                playsInline
                autoPlay
                controls={false}
                muted={false}
              />
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 px-8 text-center text-slate-200">
                {remoteState.status === "loading" ? (
                  <Loader2 className="h-10 w-10 animate-spin text-emerald-300" />
                ) : (
                  <Video className="h-10 w-10 text-emerald-300" />
                )}
                <p className="text-sm leading-relaxed text-slate-200/80">
                  {remoteState.status === "idle" &&
                    "Select a Meet space or enter a meeting code to begin streaming."}
                  {remoteState.status === "loading" &&
                    (remoteState.message || "Connecting to meeting...")}
                  {remoteState.status === "error" && remoteState.message}
                </p>
              </div>
            )}
          </main>
        </div>
      )}
    </div>
  );
}
