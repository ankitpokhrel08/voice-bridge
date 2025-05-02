import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSocket } from "../context/SocketProvider";
import PeerService from "../services/peer";

function CallTranscribePage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const socket = useSocket();
  const myVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const [remoteSocketId, setRemoteSocketId] = useState(null);
  const [myStream, setMyStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);

  // Join the room on mount (same as Lunder flow)
  useEffect(() => {
    // Password check before joining call
    const storedRoomId = localStorage.getItem("roomId");
    const storedPassword = localStorage.getItem("roomPassword");
    // For demo: check in-memory roomStore (window-scoped)
    const roomStore = window.__ROOM_STORE__ || {};
    if (
      !storedRoomId ||
      !storedPassword ||
      storedRoomId !== roomId ||
      roomStore[roomId] !== storedPassword
    ) {
      alert(
        "Access denied: Invalid or missing room password. Please join the room again."
      );
      navigate("/room", { replace: true });
      return;
    }

    const email = localStorage.getItem("email") || "user@example.com";
    if (roomId && socket) {
      socket.emit("join-room", { room: roomId, email });
    }
  }, [roomId, socket, navigate]);

  // Start local media
  useEffect(() => {
    let localStream;
    async function startMedia() {
      try {
        localStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        setMyStream(localStream);
        if (myVideoRef.current) {
          myVideoRef.current.srcObject = localStream;
        }
        // Add local tracks to peer connection
        localStream.getTracks().forEach((track) => {
          PeerService.peer.addTrack(track, localStream);
        });
      } catch (err) {
        console.error("Error accessing camera:", err);
      }
    }
    startMedia();
    return () => {
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Send stream helper (for symmetry with Lunder Room)
  const sendStreams = useCallback(() => {
    if (myStream) {
      for (const track of myStream.getTracks()) {
        PeerService.peer.addTrack(track, myStream);
      }
    }
  }, [myStream]);

  // Socket and peer event handlers
  useEffect(() => {
    if (!socket) return;
    const handleUserJoined = ({ id }) => {
      setRemoteSocketId(id);
    };
    const handleIncomingCall = async ({ from, offer }) => {
      setRemoteSocketId(from);
      const ans = await PeerService.getAnswer(offer);
      socket.emit("call:accepted", { to: from, ans });
      sendStreams();
    };
    const handleCallAccepted = async ({ from, ans }) => {
      await PeerService.setLocalDescription(ans);
      sendStreams();
    };
    const handleNegoNeeded = async ({ from, offer }) => {
      const ans = await PeerService.getAnswer(offer);
      socket.emit("peer:nego:done", { to: from, ans });
    };
    const handleNegoFinal = async ({ ans }) => {
      await PeerService.setLocalDescription(ans);
    };
    socket.on("user:joined", handleUserJoined);
    socket.on("incoming:call", handleIncomingCall);
    socket.on("call:accepted", handleCallAccepted);
    socket.on("peer:nego:needed", handleNegoNeeded);
    socket.on("peer:nego:final", handleNegoFinal);
    return () => {
      socket.off("user:joined", handleUserJoined);
      socket.off("incoming:call", handleIncomingCall);
      socket.off("call:accepted", handleCallAccepted);
      socket.off("peer:nego:needed", handleNegoNeeded);
      socket.off("peer:nego:final", handleNegoFinal);
    };
  }, [socket, sendStreams]);

  // Peer negotiation events
  useEffect(() => {
    PeerService.peer.onnegotiationneeded = async () => {
      if (remoteSocketId) {
        const offer = await PeerService.getOffer();
        socket.emit("peer:nego:needed", { offer, to: remoteSocketId });
      }
    };
    PeerService.peer.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };
  }, [remoteSocketId, socket]);

  // Initiate call if remoteSocketId is set (caller)
  useEffect(() => {
    if (remoteSocketId && myStream) {
      (async () => {
        const offer = await PeerService.getOffer();
        socket.emit("user:call", { to: remoteSocketId, offer });
      })();
    }
  }, [remoteSocketId, myStream, socket]);

  return (
    <div className="call-transcribe-page flex flex-col items-center justify-center h-screen bg-gray-100">
      <h1 className="text-2xl font-bold mb-4">Call Transcribe Page</h1>
      <div className="video-container relative w-[500px] h-[350px] mb-4">
        {/* Other user's video (main box) */}
        <video
          ref={remoteVideoRef}
          autoPlay
          className="w-full h-full rounded-lg object-cover bg-black"
        />
        {/* My video (mini box overlay) */}
        <video
          ref={myVideoRef}
          autoPlay
          muted
          className="absolute bottom-4 right-4 w-32 h-24 rounded-lg border-2 border-white shadow-lg object-cover bg-black"
        />
      </div>
      <div className="caption-box w-full max-w-2xl bg-white p-4 rounded-lg shadow-md">
        <h2 className="text-lg font-semibold mb-2">Real-time Captions</h2>
        <div className="captions h-32 overflow-y-auto text-gray-700">
          <p className="text-sm">Captions will appear here...</p>
        </div>
      </div>
    </div>
  );
}

export default CallTranscribePage;
