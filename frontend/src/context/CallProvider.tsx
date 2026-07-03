import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useSocketContext } from "./SocketProvider";
import { useToastContext } from "./ToastProvider";
import { usePeerConnection } from "../hooks/usePeerConnection";
import { useTranscriptionSession } from "../hooks/useTranscriptionSession";
import { useLocalMedia } from "../hooks/useLocalMedia";
import { useScreenShare } from "../hooks/useScreenShare";
import { useCallTimer } from "../hooks/useCallTimer";
import { Ringtone } from "../lib/ringtone";
import { deriveCallId } from "../lib/callId";
import type { CallState, IncomingCall } from "../types/call";
import type { AnswerPayload, CallEndedPayload, CallRejectedPayload, OfferPayload, Roster } from "../types/socket";
import type { CaptionMessage, TranscriptionStatus } from "../types/transcription";

const initialCallState: CallState = {
  status: "idle",
  peer: null,
  incomingCall: null,
  connectedAt: null,
  lastEndedPeer: null,
};

type CallAction =
  | { type: "START_CALLING"; peer: string }
  | { type: "INCOMING_CALL"; incomingCall: IncomingCall }
  | { type: "CALL_CONNECTED"; peer: string }
  | { type: "CALL_ENDED" }
  | { type: "RESET" };

function callReducer(state: CallState, action: CallAction): CallState {
  switch (action.type) {
    case "START_CALLING":
      return { ...initialCallState, status: "calling", peer: action.peer };
    case "INCOMING_CALL":
      return { ...initialCallState, status: "incoming-ringing", incomingCall: action.incomingCall };
    case "CALL_CONNECTED":
      return { ...initialCallState, status: "connected", peer: action.peer, connectedAt: Date.now() };
    case "CALL_ENDED":
      // Back to idle, but remember who the call was with so the UI can say so.
      return { ...initialCallState, lastEndedPeer: state.peer ?? state.lastEndedPeer };
    case "RESET":
      return initialCallState;
  }
}

interface CallContextValue {
  callState: CallState;
  roster: Roster;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  displayStream: MediaStream | null;
  captions: CaptionMessage[];
  transcriptionStatus: TranscriptionStatus;
  micEnabled: boolean;
  videoEnabled: boolean;
  isScreenSharing: boolean;
  callDurationLabel: string;
  startCall: (user: string) => void;
  acceptIncomingCall: () => void;
  rejectIncomingCall: () => void;
  endCall: () => void;
  toggleMic: () => void;
  toggleVideo: () => void;
  toggleScreenShare: () => void;
}

const CallContext = createContext<CallContextValue | null>(null);

export function CallProvider({
  username,
  preferredLanguage,
  spokenLanguage,
  children,
}: {
  username: string;
  preferredLanguage: string;
  spokenLanguage: string;
  children: ReactNode;
}) {
  const { socket, roster } = useSocketContext();
  const { addToast, removeToast } = useToastContext();
  const [callState, dispatch] = useReducer(callReducer, initialCallState);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const localMedia = useLocalMedia();
  const transcription = useTranscriptionSession();
  const pcManager = usePeerConnection(
    (candidate) => socket.emit("icecandidate", candidate),
    (stream) => setRemoteStream(stream)
  );
  const screenShare = useScreenShare(pcManager, localMedia.stream);
  const callDurationLabel = useCallTimer(callState.connectedAt);

  const ringtoneRef = useRef<Ringtone | null>(null);
  if (!ringtoneRef.current) ringtoneRef.current = new Ringtone();
  const callingToastId = useRef<number | null>(null);

  const dismissCallingToast = useCallback(() => {
    if (callingToastId.current !== null) {
      removeToast(callingToastId.current);
      callingToastId.current = null;
    }
  }, [removeToast]);

  const resetScreenShare = screenShare.reset;
  const endCallLocally = useCallback(() => {
    // Close the connection but leave localStream's tracks alone -- they're
    // shared with the next call (see PeerConnectionManager.close()).
    pcManager.close();
    resetScreenShare();
    transcription.stop();
    ringtoneRef.current?.pause();
    dismissCallingToast();
    dispatch({ type: "CALL_ENDED" });
    setRemoteStream(null);
  }, [pcManager, resetScreenShare, transcription, dismissCallingToast]);

  // -- Local actions --------------------------------------------------

  const startCall = useCallback(
    (user: string) => {
      if (!localMedia.stream) return;
      dispatch({ type: "START_CALLING", peer: user });
      callingToastId.current = addToast(`Calling ${user}...`, "info", null);
      void pcManager.createOffer(localMedia.stream).then((offer) => {
        socket.emit("offer", { from: username, to: user, offer });
      });
    },
    [localMedia.stream, pcManager, socket, username, addToast]
  );

  const acceptIncomingCall = useCallback(() => {
    const incoming = callState.incomingCall;
    if (!incoming || !localMedia.stream) return;
    const { from, to, offer } = incoming;
    const stream = localMedia.stream;
    ringtoneRef.current?.pause();
    void pcManager.createAnswerFor(offer, stream).then((answer) => {
      socket.emit("answer", { from, to, answer });
      dispatch({ type: "CALL_CONNECTED", peer: from });
      transcription.start({
        callId: deriveCallId(from, to),
        userId: username,
        preferredLanguage,
        spokenLanguage,
        stream,
      });
    });
  }, [
    callState.incomingCall,
    localMedia.stream,
    pcManager,
    socket,
    username,
    preferredLanguage,
    spokenLanguage,
    transcription,
  ]);

  const rejectIncomingCall = useCallback(() => {
    const incoming = callState.incomingCall;
    if (!incoming) return;
    ringtoneRef.current?.pause();
    socket.emit("call-rejected", { from: incoming.from, to: incoming.to });
    dispatch({ type: "RESET" });
  }, [callState.incomingCall, socket]);

  const endCall = useCallback(() => {
    if (callState.status === "connected" && callState.peer) {
      socket.emit("call-ended", [username, callState.peer]);
      addToast("Call ended", "info");
    }
    endCallLocally();
  }, [callState.status, callState.peer, socket, username, addToast, endCallLocally]);

  const toggleScreenShare = useCallback(() => {
    screenShare.toggle();
  }, [screenShare]);

  // -- Remote (socket) events ------------------------------------------

  useEffect(() => {
    const handleOffer = ({ from, to, offer }: OfferPayload) => {
      dispatch({ type: "INCOMING_CALL", incomingCall: { from, to, offer } });
      void ringtoneRef.current?.play();
    };

    const handleAnswer = ({ from, to, answer }: AnswerPayload) => {
      void pcManager.setRemoteAnswer(answer).then(() => {
        dismissCallingToast();
        dispatch({ type: "CALL_CONNECTED", peer: to });
        if (localMedia.stream) {
          transcription.start({
            callId: deriveCallId(from, to),
            userId: username,
            preferredLanguage,
            spokenLanguage,
            stream: localMedia.stream,
          });
        }
      });
    };

    const handleCallRejected = ({ from }: CallRejectedPayload) => {
      dismissCallingToast();
      addToast(`${from} declined your call`, "error");
      pcManager.close();
      dispatch({ type: "RESET" });
    };

    const handleIceCandidate = (candidate: RTCIceCandidateInit) => {
      if (localMedia.stream) {
        void pcManager.addIceCandidate(candidate, localMedia.stream);
      }
    };

    const handleCallEnded = (_caller: CallEndedPayload) => {
      // The server relays call-ended to BOTH parties, including whoever hit
      // end (who already tore down locally and is idle) -- only act if this
      // side still thinks a call is live, so the toast doesn't double up.
      if (callState.status === "idle") return;
      addToast(`${callState.peer ?? "Peer"} ended the call`, "info");
      endCallLocally();
    };

    socket.on("offer", handleOffer);
    socket.on("answer", handleAnswer);
    socket.on("call-rejected", handleCallRejected);
    socket.on("icecandidate", handleIceCandidate);
    socket.on("call-ended", handleCallEnded);

    return () => {
      socket.off("offer", handleOffer);
      socket.off("answer", handleAnswer);
      socket.off("call-rejected", handleCallRejected);
      socket.off("icecandidate", handleIceCandidate);
      socket.off("call-ended", handleCallEnded);
    };
  }, [
    socket,
    pcManager,
    localMedia.stream,
    username,
    preferredLanguage,
    spokenLanguage,
    transcription,
    dismissCallingToast,
    addToast,
    endCallLocally,
    callState.status,
    callState.peer,
  ]);

  const value: CallContextValue = {
    callState,
    roster,
    localStream: localMedia.stream,
    remoteStream,
    displayStream: screenShare.displayStream,
    captions: transcription.captions,
    transcriptionStatus: transcription.status,
    micEnabled: localMedia.micEnabled,
    videoEnabled: localMedia.videoEnabled,
    isScreenSharing: screenShare.isSharing,
    callDurationLabel,
    startCall,
    acceptIncomingCall,
    rejectIncomingCall,
    endCall,
    toggleMic: localMedia.toggleMic,
    toggleVideo: localMedia.toggleVideo,
    toggleScreenShare,
  };

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
}

export function useCall(): CallContextValue {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error("useCall must be used within CallProvider");
  return ctx;
}
