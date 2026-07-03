import { useCall } from "../../context/CallProvider";
import { useAudioLevel } from "../../hooks/useAudioLevel";
import { RosterList } from "../roster/RosterList";
import { CaptionFeed } from "../captions/CaptionFeed";
import { CallStatusBar } from "./CallStatusBar";
import { CallControls } from "./CallControls";
import { VideoStage } from "./VideoStage";
import { IncomingCallDialog } from "./IncomingCallDialog";
import styles from "./CallScreen.module.css";

interface CallScreenProps {
  ownUsername: string;
}

export function CallScreen({ ownUsername }: CallScreenProps) {
  const call = useCall();
  const localLevel = useAudioLevel(call.localStream);
  const remoteLevel = useAudioLevel(call.remoteStream);

  const isBusy = call.callState.status !== "idle" || !call.localStream;
  const peerName = call.callState.peer;

  return (
    <div className={styles.layout}>
      <RosterList roster={call.roster} ownUsername={ownUsername} onCall={call.startCall} disabled={isBusy} />

      <main className={styles.main}>
        <CallStatusBar
          callStatus={call.callState.status}
          peerName={peerName}
          lastEndedPeer={call.callState.lastEndedPeer}
          durationLabel={call.callDurationLabel}
          transcriptionStatus={call.transcriptionStatus}
        />

        <CaptionFeed
          captions={call.captions}
          localLevel={localLevel}
          remoteLevel={remoteLevel}
          status={call.transcriptionStatus}
        />

        <VideoStage
          localStream={call.localStream}
          remoteStream={call.remoteStream}
          displayStream={call.displayStream}
          videoEnabled={call.videoEnabled}
          peerName={peerName}
          ownName={ownUsername}
          localLevel={localLevel}
          remoteLevel={remoteLevel}
        />

        <CallControls
          micEnabled={call.micEnabled}
          videoEnabled={call.videoEnabled}
          isScreenSharing={call.isScreenSharing}
          callConnected={call.callState.status === "connected"}
          onToggleMic={call.toggleMic}
          onToggleVideo={call.toggleVideo}
          onToggleScreenShare={call.toggleScreenShare}
          onEndCall={call.endCall}
        />
      </main>

      {call.callState.status === "incoming-ringing" && call.callState.incomingCall && (
        <IncomingCallDialog
          callerName={call.callState.incomingCall.from}
          onAccept={call.acceptIncomingCall}
          onReject={call.rejectIncomingCall}
        />
      )}
    </div>
  );
}
