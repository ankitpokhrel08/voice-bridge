// Get DOM elements

const createUserBtn = document.getElementById("create-user");
const username = document.getElementById("username");
const allusersHtml = document.getElementById("allusers");
const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const endCallBtn = document.getElementById("end-call-btn");
const loginScreen = document.getElementById("login-screen");
const mainContainer = document.getElementById("main-container");
const micToggle = document.getElementById("mic-toggle");
const videoToggle = document.getElementById("video-toggle");
const screenShare = document.getElementById("screen-share");
const callDuration = document.getElementById("call-duration");
const connectionStatus = document.getElementById("connection-status");
const currentCallUser = document.getElementById("current-call-user");
const remoteUserBadge = document.getElementById("remote-user-badge");
const transcriptionContent = document.getElementById("transcription-content");

// Initialize socket connection
const socket = io();

// Global variables
let localStream;
let caller = [];
let localRecorder = null;
let remoteRecorder = null;
let callTimer = null;
let callStartTime = null;
let isCallActive = false;
let isMuted = false;
let isVideoOff = false;
let isScreenSharing = false;
let screenStream = null;
let ringtone = null;
let currentIncomingCall = null;
const TRANSCRIPTION_API =
  "https://4223-34-124-175-170.ngrok-free.app/transcribe";

// Hide main container initially
mainContainer.classList.add("d-none");

// Initialize ringtone
function initializeRingtone() {
  // The correct path based on the provided information
  const ringtoneUrl = "/assets/ringtone.mp3";

  console.log("Attempting to load ringtone from:", ringtoneUrl);

  ringtone = new Audio(ringtoneUrl);
  ringtone.preload = "auto";
  ringtone.loop = true;

  // Verify the ringtone loaded correctly
  ringtone.addEventListener("canplaythrough", () => {
    console.log("✅ Ringtone loaded successfully!");
  });

  ringtone.addEventListener("error", (e) => {
    console.error("❌ Error loading ringtone:", e);
    console.error(
      "Error code:",
      ringtone.error ? ringtone.error.code : "unknown"
    );

    // Create a fallback beep sound
    createFallbackRingtone();
  });

  // Force load attempt
  ringtone.load();
}

// Create a fallback beep ringtone using Web Audio API
function createFallbackRingtone() {
  console.log("Creating fallback ringtone...");

  try {
    const audioContext = new (window.AudioContext ||
      window.webkitAudioContext)();
    let beepInterval = null;

    ringtone = {
      play: function () {
        if (beepInterval) return Promise.resolve();

        const createBeep = () => {
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();

          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);

          oscillator.type = "sine";
          oscillator.frequency.value = 800;
          gainNode.gain.value = 0.2;

          oscillator.start();
          setTimeout(() => oscillator.stop(), 300);
        };

        createBeep();
        beepInterval = setInterval(createBeep, 1000);
        return Promise.resolve();
      },
      pause: function () {
        if (beepInterval) {
          clearInterval(beepInterval);
          beepInterval = null;
        }
      },
      currentTime: 0,
      loop: true,
    };
    console.log("✅ Fallback ringtone created successfully");
  } catch (e) {
    console.error("❌ Failed to create fallback audio:", e);
  }
}

// Call initialization function
initializeRingtone();

// Create incoming call dialog
function createCallDialog() {
  const dialog = document.createElement("div");
  dialog.classList.add("incoming-call-dialog");
  dialog.innerHTML = `
    <div class="incoming-call-content">
      <div class="incoming-call-header">
        <span class="material-icons call-icon">call</span>
        <h3>Incoming Call</h3>
      </div>
      <p class="caller-info">Someone is calling you...</p>
      <div class="incoming-call-actions">
        <button class="reject-call-btn">
          <span class="material-icons">call_end</span>
          Reject
        </button>
        <button class="accept-call-btn">
          <span class="material-icons">call</span>
          Accept
        </button>
      </div>
    </div>
  `;

  return dialog;
}

// Show incoming call dialog
function showIncomingCallDialog(from, to, offer) {
  // Store current call info
  currentIncomingCall = { from, to, offer };

  // Play ringtone
  if (ringtone) {
    ringtone
      .play()
      .catch((err) => console.error("Error playing ringtone:", err));
  }

  // Create and show dialog
  const callDialog = createCallDialog();
  callDialog.querySelector(
    ".caller-info"
  ).textContent = `${from} is calling you...`;
  document.body.appendChild(callDialog);

  // Add event listeners to buttons
  callDialog.querySelector(".accept-call-btn").addEventListener("click", () => {
    acceptIncomingCall();
    removeCallDialog();
  });

  callDialog.querySelector(".reject-call-btn").addEventListener("click", () => {
    rejectIncomingCall();
    removeCallDialog();
  });
}

// Remove incoming call dialog
function removeCallDialog() {
  // Stop ringtone
  if (ringtone) {
    ringtone.pause();
    ringtone.currentTime = 0;
  }

  // Remove dialog
  const dialog = document.querySelector(".incoming-call-dialog");
  if (dialog) {
    dialog.classList.add("fade-out");
    setTimeout(() => {
      if (dialog.parentNode) {
        dialog.parentNode.removeChild(dialog);
      }
    }, 300);
  }
}

// Handle accepting an incoming call
async function acceptIncomingCall() {
  if (!currentIncomingCall) return;

  const { from, to, offer } = currentIncomingCall;

  const pc = PeerConnection.getInstance();
  await pc.setRemoteDescription(offer);
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  socket.emit("answer", { from, to, answer: pc.localDescription });
  caller = [from, to];

  isCallActive = true;
  callStartTime = new Date();
  callTimer = setInterval(updateCallDuration, 1000);
  currentCallUser.textContent = `Call with ${from}`;
  remoteUserBadge.textContent = from;
  connectionStatus.textContent = "Connected";

  if (localStream) {
    localRecorder = setupTranscription(localStream, true);
  }

  currentIncomingCall = null;
}

// Handle rejecting an incoming call
function rejectIncomingCall() {
  if (!currentIncomingCall) return;

  const { from, to } = currentIncomingCall;
  socket.emit("call-rejected", { from, to });
  currentIncomingCall = null;
}

// Singleton Method for peer connection
const PeerConnection = (function () {
  let peerConnection;

  const createPeerConnection = () => {
    const config = {
      iceServers: [
        {
          urls: "stun:stun.l.google.com:19302",
        },
      ],
    };
    peerConnection = new RTCPeerConnection(config);

    localStream.getTracks().forEach((track) => {
      peerConnection.addTrack(track, localStream);
    });

    peerConnection.ontrack = function (event) {
      remoteVideo.srcObject = event.streams[0];

      if (event.streams[0] && !remoteRecorder) {
        remoteRecorder = setupTranscription(event.streams[0], false);
      }
    };

    peerConnection.onicecandidate = function (event) {
      if (event.candidate) {
        socket.emit("icecandidate", event.candidate);
      }
    };

    return peerConnection;
  };

  return {
    getInstance: () => {
      if (!peerConnection || peerConnection.connectionState === "closed") {
        peerConnection = createPeerConnection();
      }
      return peerConnection;
    },
    reset: () => {
      if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
      }
    },
  };
})();

// Function to setup audio recording and transcription
function setupTranscription(stream, isLocal) {
  const audioStream = new MediaStream();

  stream.getAudioTracks().forEach((track) => {
    audioStream.addTrack(track);
  });

  const mediaRecorder = new MediaRecorder(audioStream, {
    mimeType: "audio/webm",
  });

  let audioChunks = [];

  mediaRecorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      audioChunks.push(event.data);
    }
  };

  mediaRecorder.onstop = async () => {
    const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
    audioChunks = [];

    const formData = new FormData();
    formData.append("audio", audioBlob);
    formData.append("user", isLocal ? username.value : "Remote User");

    try {
      const response = await fetch(TRANSCRIPTION_API, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        displayTranscription(data.text, isLocal);
      }
    } catch (error) {
      console.error("Transcription error:", error);
    }

    if (document.getElementById("end-call-btn").style.display !== "none") {
      mediaRecorder.start(5000);
    }
  };

  mediaRecorder.start(5000);
  return mediaRecorder;
}

// Function to display transcription in the content area
function displayTranscription(text, isLocal) {
  if (!text || text.trim() === "") return;

  const transcriptDiv = document.createElement("div");
  transcriptDiv.classList.add(
    "transcript",
    isLocal ? "local-transcript" : "remote-transcript"
  );

  const userSpan = document.createElement("span");
  userSpan.classList.add("transcript-user");
  userSpan.textContent = isLocal ? `${username.value}: ` : "Remote User: ";

  const textSpan = document.createElement("span");
  textSpan.textContent = text;

  transcriptDiv.appendChild(userSpan);
  transcriptDiv.appendChild(textSpan);

  transcriptionContent.appendChild(transcriptDiv);
  transcriptionContent.scrollTop = transcriptionContent.scrollHeight;
}

// Function to update call duration timer
function updateCallDuration() {
  if (!callStartTime) return;

  const now = new Date();
  const diff = Math.floor((now - callStartTime) / 1000);
  const minutes = Math.floor(diff / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (diff % 60).toString().padStart(2, "0");

  callDuration.textContent = `${minutes}:${seconds}`;
}

// Function to start a call
const startCall = async (user) => {
  console.log({ user });

  // Reset UI elements for a new call
  remoteUserBadge.classList.remove("disconnected");
  connectionStatus.textContent = "Calling...";
  currentCallUser.textContent = `Calling ${user}...`;

  // Create calling notification
  const callingNotification = document.createElement("div");
  callingNotification.textContent = `Calling ${user}...`;
  callingNotification.classList.add("calling-notification");
  document.body.appendChild(callingNotification);

  const pc = PeerConnection.getInstance();
  const offer = await pc.createOffer();
  console.log({ offer });
  await pc.setLocalDescription(offer);

  socket.emit("offer", {
    from: username.value,
    to: user,
    offer: pc.localDescription,
  });
};

// Function to end a call
const endCall = () => {
  const pc = PeerConnection.getInstance();
  if (pc) {
    // Close all media tracks
    pc.getSenders().forEach((sender) => {
      if (sender.track) {
        sender.track.stop();
      }
    });

    // Close the peer connection but maintain our connection to the server
    pc.close();
    PeerConnection.reset();
  }

  // Reset call state but preserve user information
  isCallActive = false;
  clearInterval(callTimer);
  callStartTime = null;
  callDuration.textContent = "00:00";

  // Show the disconnected status but keep the user info visible
  connectionStatus.textContent = "Disconnected";
  // Keep the current call user name visible but indicate call ended
  if (currentCallUser.textContent.startsWith("Call with")) {
    const userName = currentCallUser.textContent.replace("Call with ", "");
    currentCallUser.textContent = `Last call: ${userName} (Disconnected)`;
  }

  // Keep remote user badge but with "disconnected" status
  if (remoteUserBadge.textContent) {
    const remoteName = remoteUserBadge.textContent;
    remoteUserBadge.textContent = `${remoteName} (disconnected)`;
    remoteUserBadge.classList.add("disconnected");
  }

  // Show a brief "Call ended" notification
  const notification = document.createElement("div");
  notification.textContent = "Call ended";
  notification.classList.add("call-ended-notification");
  document.body.appendChild(notification);

  // Remove notification after 3 seconds
  setTimeout(() => {
    notification.remove();
  }, 3000);

  // Remove any calling notification if present
  const callingNotification = document.querySelector(".calling-notification");
  if (callingNotification) {
    callingNotification.remove();
  }

  // Stop local video if it was replaced (during screen sharing)
  if (localVideo.srcObject !== localStream && localStream) {
    localVideo.srcObject = localStream;
  }

  // Clean up remote video streams but keep the container
  if (remoteVideo.srcObject) {
    const remoteStreams = remoteVideo.srcObject.getTracks();
    remoteStreams.forEach((track) => track.stop());
    remoteVideo.srcObject = null;
  }

  // Stop transcription
  if (localRecorder) {
    localRecorder.stop();
    localRecorder = null;
  }
  if (remoteRecorder) {
    remoteRecorder.stop();
    remoteRecorder = null;
  }

  // Clear transcription content
  transcriptionContent.innerHTML = "";

  // Stop screen sharing if active
  if (isScreenSharing && screenStream) {
    stopScreenSharing();
  }

  // Reset the caller array to allow for new calls
  caller = [];

  // Redirect to login page after a short delay
  setTimeout(() => {
    // Clear the username field
    username.value = "";
    // Show login screen and hide main container
    loginScreen.classList.remove("d-none");
    mainContainer.classList.add("d-none");
  }, 3500); // Wait a bit longer than the notification display time
};

// Function to toggle microphone
function toggleMicrophone() {
  if (!localStream) return;

  const audioTracks = localStream.getAudioTracks();
  if (audioTracks.length === 0) return;

  const enabled = !audioTracks[0].enabled;
  audioTracks[0].enabled = enabled;
  isMuted = !enabled;

  if (isMuted) {
    micToggle.classList.add("muted");
    micToggle.querySelector(".material-icons").textContent = "mic_off";
  } else {
    micToggle.classList.remove("muted");
    micToggle.querySelector(".material-icons").textContent = "mic";
  }
}

// Function to toggle video
function toggleVideo() {
  if (!localStream) return;

  const videoTracks = localStream.getVideoTracks();
  if (videoTracks.length === 0) return;

  const enabled = !videoTracks[0].enabled;
  videoTracks[0].enabled = enabled;
  isVideoOff = !enabled;

  if (isVideoOff) {
    videoToggle.classList.add("off");
    videoToggle.querySelector(".material-icons").textContent = "videocam_off";
  } else {
    videoToggle.classList.remove("off");
    videoToggle.querySelector(".material-icons").textContent = "videocam";
  }
}

// Function to start screen sharing
async function startScreenSharing() {
  if (!isCallActive) return;

  try {
    screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
    });
    const pc = PeerConnection.getInstance();

    const videoSender = pc
      .getSenders()
      .find((sender) => sender.track && sender.track.kind === "video");

    if (videoSender) {
      await videoSender.replaceTrack(screenStream.getVideoTracks()[0]);
    }

    localVideo.srcObject = screenStream;

    isScreenSharing = true;
    screenShare.querySelector(".material-icons").textContent =
      "stop_screen_share";

    screenStream.getVideoTracks()[0].onended = stopScreenSharing;
  } catch (error) {
    console.error("Error sharing screen:", error);
  }
}

// Function to stop screen sharing
async function stopScreenSharing() {
  if (!isScreenSharing || !screenStream) return;

  try {
    screenStream.getTracks().forEach((track) => track.stop());

    const pc = PeerConnection.getInstance();

    const videoSender = pc
      .getSenders()
      .find((sender) => sender.track && sender.track.kind === "video");

    if (videoSender && localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        await videoSender.replaceTrack(videoTrack);
      }
    }

    localVideo.srcObject = localStream;

    isScreenSharing = false;
    screenShare.querySelector(".material-icons").textContent = "screen_share";
  } catch (error) {
    console.error("Error stopping screen share:", error);
  }
}

// Function to toggle screen sharing
function toggleScreenSharing() {
  if (isScreenSharing) {
    stopScreenSharing();
  } else {
    startScreenSharing();
  }
}

// Handle browser events
createUserBtn.addEventListener("click", (e) => {
  if (username.value !== "") {
    loginScreen.classList.add("d-none");
    mainContainer.classList.remove("d-none");
    socket.emit("join-user", username.value);
  }
});

endCallBtn.addEventListener("click", (e) => {
  if (isCallActive && caller.length > 0) {
    // Notify the server and other party that the call is ending
    socket.emit("call-ended", caller);

    // End the call locally immediately for responsive UI
    endCall();

    // Update the button appearance
    endCallBtn.classList.add("call-ended");
    setTimeout(() => {
      endCallBtn.classList.remove("call-ended");
    }, 500);
  }
});

micToggle.addEventListener("click", toggleMicrophone);
videoToggle.addEventListener("click", toggleVideo);
screenShare.addEventListener("click", toggleScreenSharing);

// Handle socket events
socket.on("joined", (allusers) => {
  console.log({ allusers });

  allusersHtml.innerHTML = "";

  for (const user in allusers) {
    const li = document.createElement("li");

    const userText = document.createElement("span");
    userText.textContent = `${user} ${user === username.value ? "(You)" : ""}`;
    li.appendChild(userText);

    if (user !== username.value) {
      const button = document.createElement("button");
      button.classList.add("call-btn");
      button.addEventListener("click", (e) => {
        startCall(user);
      });

      const icon = document.createElement("span");
      icon.classList.add("material-icons");
      icon.textContent = "call";

      button.appendChild(icon);
      li.appendChild(button);
    }

    allusersHtml.appendChild(li);
  }
});

socket.on("offer", async ({ from, to, offer }) => {
  // Store call participants for later use (enabling end call for recipients)
  caller = [from, to];

  // Instead of automatically accepting, show incoming call dialog
  showIncomingCallDialog(from, to, offer);
});

socket.on("answer", async ({ from, to, answer }) => {
  const pc = PeerConnection.getInstance();
  await pc.setRemoteDescription(answer);

  // Remove calling notification
  const callingNotification = document.querySelector(".calling-notification");
  if (callingNotification) {
    callingNotification.remove();
  }

  // Make sure caller array is set for both parties so end call works for everyone
  caller = [from, to];

  // Ensure call is active and timer is running
  isCallActive = true;
  if (!callStartTime) {
    callStartTime = new Date();
    callTimer = setInterval(updateCallDuration, 1000);
  }

  connectionStatus.textContent = "Connected";
  currentCallUser.textContent = `Call with ${from}`;
});

socket.on("call-rejected", ({ from, to }) => {
  // Handle rejection - show notification
  const notification = document.createElement("div");
  notification.textContent = `${from} declined your call`;
  notification.classList.add("call-rejected-notification");
  document.body.appendChild(notification);

  // Remove notification after 3 seconds
  setTimeout(() => {
    notification.remove();
  }, 3000);

  // Remove calling notification
  const callingNotification = document.querySelector(".calling-notification");
  if (callingNotification) {
    callingNotification.remove();
  }

  // Reset call state
  connectionStatus.textContent = "Call Declined";
  currentCallUser.textContent = "Waiting for call...";

  // Clean up peer connection
  const pc = PeerConnection.getInstance();
  if (pc) {
    pc.close();
    PeerConnection.reset();
  }
});

socket.on("icecandidate", async (candidate) => {
  console.log({ candidate });
  const pc = PeerConnection.getInstance();
  await pc.addIceCandidate(new RTCIceCandidate(candidate));
});

socket.on("end-call", ({ from, to }) => {});

socket.on("call-ended", (caller) => {
  // Also remove any incoming call dialog if present
  removeCallDialog();
  endCall();
});

// Initialize app
const startMyVideo = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });
    console.log({ stream });
    localStream = stream;
    localVideo.srcObject = stream;
  } catch (error) {
    console.error("Error accessing media devices.", error);
  }
};

startMyVideo();

// Add the CSS for the call UI elements to the head
const style = document.createElement("style");
style.textContent = `
  .call-ended-notification {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background-color: rgba(184, 48, 105, 0.9); /* Neon Pink with opacity */
    color: white;
    padding: 15px 30px;
    border-radius: 8px;
    font-size: 1.2rem;
    z-index: 9999;
    animation: fadeInOut 3s forwards;
  }
  
  .call-rejected-notification {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background-color: rgba(184, 48, 105, 0.9); /* Neon Pink with opacity */
    color: white;
    padding: 15px 30px;
    border-radius: 8px;
    font-size: 1.2rem;
    z-index: 9999;
    animation: fadeInOut 3s forwards;
  }
  
  .calling-notification {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background-color: rgba(15, 58, 120, 0.9); /* Electric Blue with opacity */
    color: white;
    padding: 15px 30px;
    border-radius: 8px;
    font-size: 1.2rem;
    z-index: 9999;
    animation: pulse 1.5s infinite;
  }
  
  .incoming-call-dialog {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(10, 12, 42, 0.85); /* Deep Navy with opacity */
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    animation: fadeIn 0.3s ease;
  }
  
  .incoming-call-content {
    background-color: rgba(26, 20, 64, 0.95); /* Midnight Violet with high opacity */
    border-radius: 12px;
    width: 90%;
    max-width: 400px;
    padding: 20px;
    box-shadow: 0 0 30px rgba(62, 29, 112, 0.4); /* Vivid Purple glow */
    text-align: center;
    border: 1px solid rgba(14, 63, 93, 0.5); /* Soft Teal border */
    backdrop-filter: blur(10px);
  }
  
  .incoming-call-header {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 15px;
  }
  
  .incoming-call-header .call-icon {
    color: #0f3a78; /* Electric Blue */
    font-size: 28px;
    animation: pulse 1s infinite;
    margin-right: 10px;
    text-shadow: 0 0 10px rgba(15, 58, 120, 0.7); /* Glowing effect */
  }
  
  .incoming-call-header h3 {
    color: #ffffff; /* White text */
    text-shadow: 0 0 8px rgba(62, 29, 112, 0.6); /* Subtle glow */
  }
  
  .caller-info {
    font-size: 1.2rem;
    margin: 20px 0;
    color: #ffffff; /* White text */
  }
  
  .incoming-call-actions {
    display: flex;
    justify-content: space-around;
    margin-top: 20px;
  }
  
  .accept-call-btn, .reject-call-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 10px;
    border-radius: 50px;
    border: none;
    width: 40%;
    cursor: pointer;
    font-weight: bold;
    transition: transform 0.2s, box-shadow 0.3s ease;
  }
  
  .accept-call-btn:hover, .reject-call-btn:hover {
    transform: scale(1.05);
    box-shadow: 0 0 15px rgba(255, 255, 255, 0.3);
  }
  
  .accept-call-btn {
    background-color: #2c9d8f; /* Teal-based success color */
    color: white;
  }
  
  .accept-call-btn:hover {
    box-shadow: 0 0 15px rgba(44, 157, 143, 0.6); /* Success color glow */
  }
  
  .reject-call-btn {
    background-color: #b83069; /* Neon Pink */
    color: white;
  }
  
  .reject-call-btn:hover {
    box-shadow: 0 0 15px rgba(184, 48, 105, 0.6); /* Danger color glow */
  }
  
  .accept-call-btn .material-icons, .reject-call-btn .material-icons {
    font-size: 24px;
    margin-bottom: 5px;
  }
  
  .fade-out {
    animation: fadeOut 0.3s ease forwards;
  }
  
  .call-ended {
    transform: scale(1.2);
    transition: transform 0.2s ease;
  }
  
  @keyframes fadeInOut {
    0% { opacity: 0; }
    20% { opacity: 1; }
    80% { opacity: 1; }
    100% { opacity: 0; }
  }
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes fadeOut {
    from { opacity: 1; }
    to { opacity: 0; }
  }
  
  @keyframes pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.05); }
    100% { transform: scale(1); }
  }
`;
document.head.appendChild(style);
