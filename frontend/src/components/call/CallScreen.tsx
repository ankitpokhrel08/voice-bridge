import { useEffect, useState } from "react";
import { useCall } from "../../context/CallProvider";
import { useAudioLevel } from "../../hooks/useAudioLevel";
import { RosterList } from "../roster/RosterList";
import { CaptionFeed } from "../captions/CaptionFeed";
import { ChatPanel } from "../chat/ChatPanel";
import { CallStatusBar } from "./CallStatusBar";
import { CallControls, type PanelMode } from "./CallControls";
import { VideoStage } from "./VideoStage";
import { IncomingCallDialog } from "./IncomingCallDialog";
import styles from "./CallScreen.module.css";

interface CallScreenProps {
  ownUsername: string;
  preferredLanguage: string;
}

/** FaceTime-style layout: the video stage is the hero, captions overlay it
 * as live subtitles, and the full transcript / chat live in a side panel
 * (bottom sheet on mobile) toggled from the floating control pill. */
export function CallScreen({ ownUsername, preferredLanguage }: CallScreenProps) {
  const call = useCall();
  const localLevel = useAudioLevel(call.localStream);
  const remoteLevel = useAudioLevel(call.remoteStream);

  const [panel, setPanel] = useState<PanelMode>(null);
  const [seenChatCount, setSeenChatCount] = useState(0);

  // Mark chat as read while its panel is open; the clamp handles a new call
  // resetting chatMessages to [] under a stale count.
  useEffect(() => {
    if (panel === "chat" || call.chatMessages.length < seenChatCount) {
      setSeenChatCount(call.chatMessages.length);
    }
  }, [panel, call.chatMessages.length, seenChatCount]);

  const unreadChatCount = panel === "chat" ? 0 : Math.max(0, call.chatMessages.length - seenChatCount);

  const togglePanel = (mode: "captions" | "chat") => setPanel((current) => (current === mode ? null : mode));

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

        <div className={styles.body}>
          <div className={styles.stageArea}>
            <VideoStage
              localStream={call.localStream}
              remoteStream={call.remoteStream}
              displayStream={call.displayStream}
              videoEnabled={call.videoEnabled}
              peerName={peerName}
              ownName={ownUsername}
              localLevel={localLevel}
              remoteLevel={remoteLevel}
              callStatus={call.callState.status}
              captions={call.captions}
            />
            <CallControls
              micEnabled={call.micEnabled}
              videoEnabled={call.videoEnabled}
              isScreenSharing={call.isScreenSharing}
              callConnected={call.callState.status === "connected"}
              panelMode={panel}
              unreadChatCount={unreadChatCount}
              onToggleMic={call.toggleMic}
              onToggleVideo={call.toggleVideo}
              onToggleScreenShare={call.toggleScreenShare}
              onTogglePanel={togglePanel}
              onEndCall={call.endCall}
            />
          </div>

          {panel !== null && (
            <aside className={styles.panel}>
              <header className={styles.panelHeader}>
                <button
                  type="button"
                  role="tab"
                  aria-selected={panel === "captions"}
                  className={styles.panelTab}
                  data-active={panel === "captions" || undefined}
                  onClick={() => setPanel("captions")}
                >
                  Captions
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={panel === "chat"}
                  className={styles.panelTab}
                  data-active={panel === "chat" || undefined}
                  onClick={() => setPanel("chat")}
                >
                  Chat
                </button>
                <button
                  type="button"
                  className={styles.panelClose}
                  onClick={() => setPanel(null)}
                  aria-label="Close panel"
                >
                  ×
                </button>
              </header>

              {panel === "captions" ? (
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
            </aside>
          )}
        </div>
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
