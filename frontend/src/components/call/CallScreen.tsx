import { useEffect, useState } from "react";
import { useCall } from "../../context/CallProvider";
import { useAudioLevel } from "../../hooks/useAudioLevel";
import { RosterList } from "../roster/RosterList";
import { CaptionFeed } from "../captions/CaptionFeed";
import { ChatPanel } from "../chat/ChatPanel";
import { CaptionsIcon, ChatIcon } from "../shared/Icons";
import { CallStatusBar } from "./CallStatusBar";
import { CallControls } from "./CallControls";
import { VideoStage } from "./VideoStage";
import { IncomingCallDialog } from "./IncomingCallDialog";
import styles from "./CallScreen.module.css";

interface CallScreenProps {
  ownUsername: string;
  preferredLanguage: string;
}

type PanelTab = "captions" | "chat";

export function CallScreen({ ownUsername, preferredLanguage }: CallScreenProps) {
  const call = useCall();
  const localLevel = useAudioLevel(call.localStream);
  const remoteLevel = useAudioLevel(call.remoteStream);

  const [activeTab, setActiveTab] = useState<PanelTab>("captions");
  const [seenChatCount, setSeenChatCount] = useState(0);

  // Mark chat as read while its tab is open; the clamp handles a new call
  // resetting chatMessages to [] under a stale count.
  useEffect(() => {
    if (activeTab === "chat" || call.chatMessages.length < seenChatCount) {
      setSeenChatCount(call.chatMessages.length);
    }
  }, [activeTab, call.chatMessages.length, seenChatCount]);

  const unreadChatCount = activeTab === "chat" ? 0 : Math.max(0, call.chatMessages.length - seenChatCount);

  const isBusy = call.callState.status !== "idle" || !call.localStream;
  const peerName = call.callState.peer;

  return (
    <div className={styles.layout}>
      <RosterList
        roster={call.roster}
        ownUsername={ownUsername}
        onCall={call.startCall}
        disabled={isBusy}
        inCall={call.callState.status !== "idle"}
      />

      <main className={styles.main}>
        <CallStatusBar
          callStatus={call.callState.status}
          peerName={peerName}
          lastEndedPeer={call.callState.lastEndedPeer}
          durationLabel={call.callDurationLabel}
          transcriptionStatus={call.transcriptionStatus}
        />

        <div className={styles.tabStrip} role="tablist" aria-label="Captions and chat">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "captions"}
            className={styles.tab}
            data-active={activeTab === "captions" || undefined}
            onClick={() => setActiveTab("captions")}
          >
            <CaptionsIcon width={15} height={15} />
            Captions
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "chat"}
            className={styles.tab}
            data-active={activeTab === "chat" || undefined}
            onClick={() => setActiveTab("chat")}
          >
            <ChatIcon width={15} height={15} />
            Chat
            {unreadChatCount > 0 && <span className={styles.unreadBadge}>{unreadChatCount}</span>}
          </button>
        </div>

        {activeTab === "captions" ? (
          <CaptionFeed
            captions={call.captions}
            localLevel={localLevel}
            remoteLevel={remoteLevel}
            status={call.transcriptionStatus}
          />
        ) : (
          <ChatPanel
            messages={call.chatMessages}
            ownUserId={ownUsername}
            languageCode={preferredLanguage}
            canSend={call.transcriptionStatus === "active"}
            onSend={call.sendChat}
          />
        )}

        <VideoStage
          localStream={call.localStream}
          remoteStream={call.remoteStream}
          displayStream={call.displayStream}
          videoEnabled={call.videoEnabled}
          peerName={peerName}
          ownName={ownUsername}
          localLevel={localLevel}
          remoteLevel={remoteLevel}
          raised={activeTab === "chat"}
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
