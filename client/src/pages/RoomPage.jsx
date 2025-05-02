import { useEffect, useCallback, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import peer from "../services/peer";
import { useSocket } from "../context/SocketProvider";
import Button from "../components/Button";

function RoomPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const socket = useSocket();
  const [remoteSocketId, setRemoteSocketId] = useState(null);
  const [myStream, setMyStream] = useState();
  const [remoteStream, setRemoteStream] = useState();
  const [joinRoomId, setJoinRoomId] = useState("");
  const [joinPassword, setJoinPassword] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [error, setError] = useState("");
  const myVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  // Store of room passwords (in production this should be handled by backend)
  const roomPasswords = useRef({});

  // Helper to generate 6-character room ID
  const generateRoomId = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  // Setup video stream when entering a room
  useEffect(() => {
    if (roomId) {
      setupMediaStream();
    }
  }, [roomId]);

  // Setup media stream function
  const setupMediaStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      setMyStream(stream);

      if (myVideoRef.current) {
        myVideoRef.current.srcObject = stream;
      }

      // Add tracks to peer connection
      stream.getTracks().forEach((track) => {
        peer.peer.addTrack(track, stream);
      });
    } catch (err) {
      console.error("Error accessing camera and microphone:", err);
      setError(
        "Failed to access camera and microphone. Please check permissions."
      );
    }
  };

  // Join the room on mount with email
  useEffect(() => {
    const email = localStorage.getItem("email") || "user@example.com";
    if (roomId && socket) {
      socket.emit("join-room", { room: roomId, email });
    }
  }, [roomId, socket]);

  const handleUserJoined = useCallback(({ email, id }) => {
    console.log(`${email} joined the room`);
    setRemoteSocketId(id);
  }, []);

  // Handle calling another user
  const handleCallUser = useCallback(async () => {
    if (!myStream) {
      await setupMediaStream();
    }

    const offer = await peer.getOffer();
    socket.emit("user:call", { to: remoteSocketId, offer });
  }, [remoteSocketId, socket, myStream]);

  // Handle incoming call
  const handleIncomingCall = useCallback(
    async ({ from, offer }) => {
      setRemoteSocketId(from);
      if (!myStream) {
        await setupMediaStream();
      }

      const ans = await peer.getAnswer(offer);
      socket.emit("call:accepted", { to: from, ans });
    },
    [socket, myStream]
  );

  // Handle call accepted
  const handleCallAccepted = useCallback(({ ans }) => {
    peer.setLocalDescription(ans);
  }, []);

  // Handle negotiation needed
  const handleNegoNeeded = useCallback(async () => {
    if (remoteSocketId) {
      const offer = await peer.getOffer();
      socket.emit("peer:nego:needed", { offer, to: remoteSocketId });
    }
  }, [remoteSocketId, socket]);

  useEffect(() => {
    peer.peer.addEventListener("negotiationneeded", handleNegoNeeded);
    return () => {
      peer.peer.removeEventListener("negotiationneeded", handleNegoNeeded);
    };
  }, [handleNegoNeeded]);

  const handleNegoNeedIncoming = useCallback(
    async ({ from, offer }) => {
      const ans = await peer.getAnswer(offer);
      socket.emit("peer:nego:done", { to: from, ans });
    },
    [socket]
  );

  const handleNegoNeedFinal = useCallback(async ({ ans }) => {
    await peer.setLocalDescription(ans);
  }, []);

  // Handle remote stream
  useEffect(() => {
    peer.peer.addEventListener("track", (ev) => {
      const stream = ev.streams[0];
      setRemoteStream(stream);

      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
      }
    });
  }, []);

  // Socket event listeners
  useEffect(() => {
    socket.on("user:joined", handleUserJoined);
    socket.on("incoming:call", handleIncomingCall);
    socket.on("call:accepted", handleCallAccepted);
    socket.on("peer:nego:needed", handleNegoNeedIncoming);
    socket.on("peer:nego:final", handleNegoNeedFinal);

    return () => {
      socket.off("user:joined", handleUserJoined);
      socket.off("incoming:call", handleIncomingCall);
      socket.off("call:accepted", handleCallAccepted);
      socket.off("peer:nego:needed", handleNegoNeedIncoming);
      socket.off("peer:nego:final", handleNegoNeedFinal);
    };
  }, [
    socket,
    handleUserJoined,
    handleIncomingCall,
    handleCallAccepted,
    handleNegoNeedIncoming,
    handleNegoNeedFinal,
  ]);

  useEffect(() => {
    const handlePasswordSync = ({ room, password }) => {
      // Ensure window.__ROOM_PASSWORDS__ exists
      window.__ROOM_PASSWORDS__ = window.__ROOM_PASSWORDS__ || {};
      window.__ROOM_PASSWORDS__[room] = password;
    };

    socket.on("room:password:sync", handlePasswordSync);

    return () => {
      socket.off("room:password:sync", handlePasswordSync);
    };
  }, [socket]);

  // Create Room handler
  const handleCreateRoom = () => {
    if (!createPassword) {
      setError("Please enter a password for the room");
      return;
    }

    setError("");
    const newRoomId = generateRoomId();

    // Store room password (in production this should be sent to backend)
    // Using window object to make it accessible across browser tabs
    window.__ROOM_PASSWORDS__ = window.__ROOM_PASSWORDS__ || {};
    window.__ROOM_PASSWORDS__[newRoomId] = createPassword;

    // Store in component ref for current session
    roomPasswords.current[newRoomId] = createPassword;

    // Store in localStorage for current user to rejoin
    localStorage.setItem("roomId", newRoomId);
    localStorage.setItem("roomPassword", createPassword);

    navigate(`/room/${newRoomId}`);
  };

  // Join Room handler
  const handleJoinRoom = async () => {
    if (!joinRoomId.trim() || !joinPassword) {
      setError("Please enter both Room ID and password");
      return;
    }

    try {
      // Send a request to the backend to verify the room and password
      socket.emit("verify-room", { room: joinRoomId, password: joinPassword });

      socket.on("room:verified", ({ success }) => {
        if (success) {
          setError("");

          // Store for current user to rejoin
          localStorage.setItem("roomId", joinRoomId);
          localStorage.setItem("roomPassword", joinPassword);

          navigate(`/room/${joinRoomId}`);
        } else {
          setError("Invalid Room ID or password");
        }
      });
    } catch (err) {
      console.error("Error verifying room:", err);
      setError("An error occurred while verifying the room");
    }
  };

  // If we're in a specific room, show the room interface
  if (roomId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100 p-4">
        <div className="bg-white/90 backdrop-blur p-6 rounded-2xl shadow-xl border border-gray-200 w-full max-w-lg">
          <h1 className="text-2xl font-bold mb-4 text-center text-gray-900">
            Room: {roomId}
          </h1>

          <div className="mb-4">
            {error && <div className="text-red-500 text-sm mb-2">{error}</div>}

            <div className="mb-3 text-center">
              {remoteSocketId ? (
                <span className="text-green-600 font-medium">
                  Another user connected! You can now communicate.
                </span>
              ) : (
                <span className="text-gray-600">
                  Waiting for someone to join... Share this Room ID:{" "}
                  <span className="font-bold">{roomId}</span>
                </span>
              )}
            </div>

            {remoteSocketId && !remoteStream && (
              <Button
                onClick={handleCallUser}
                className="w-full"
                variant="primary"
              >
                Start Call
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* My video */}
            <div className="bg-black rounded-lg overflow-hidden aspect-video">
              {myStream ? (
                <video
                  ref={myVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white">
                  Loading camera...
                </div>
              )}
            </div>

            {/* Remote video */}
            <div className="bg-black rounded-lg overflow-hidden aspect-video">
              {remoteStream ? (
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white">
                  Waiting for peer...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If no roomId, show the create/join interface
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100 p-4">
      <div className="bg-white/90 backdrop-blur p-6 rounded-2xl shadow-xl border border-gray-200 w-full max-w-md">
        <h1 className="text-3xl font-bold mb-6 text-center text-gray-900">
          Video Call Room
        </h1>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        {/* Create Room */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-3">Create a New Room</h2>
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Room Password
            </label>
            <input
              type="password"
              value={createPassword}
              onChange={(e) => setCreatePassword(e.target.value)}
              placeholder="Enter a secure password"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <Button
            onClick={handleCreateRoom}
            className="w-full"
            variant="secondary"
          >
            Create Room
          </Button>
        </div>

        {/* Join Room */}
        <div>
          <h2 className="text-xl font-semibold mb-3">Join Existing Room</h2>
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Room ID
            </label>
            <input
              type="text"
              value={joinRoomId}
              onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
              placeholder="Enter Room ID"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
            />
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Room Password
            </label>
            <input
              type="password"
              value={joinPassword}
              onChange={(e) => setJoinPassword(e.target.value)}
              placeholder="Enter Room Password"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <Button onClick={handleJoinRoom} className="w-full" variant="primary">
            Join Room
          </Button>
        </div>
      </div>
    </div>
  );
}

export default RoomPage;
