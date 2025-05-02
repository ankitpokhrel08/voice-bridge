import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../components/Button";

// In-memory room store (for demo; replace with backend in production)
const roomStore = {};

function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function RoomLobbyPage() {
  const navigate = useNavigate();
  const [createPassword, setCreatePassword] = useState("");
  const [joinRoomId, setJoinRoomId] = useState("");
  const [joinPassword, setJoinPassword] = useState("");
  const [error, setError] = useState("");
  const [createdRoomId, setCreatedRoomId] = useState("");

  // Create Room handler
  const handleCreateRoom = (e) => {
    e.preventDefault();
    if (!createPassword) {
      setError("Please enter a password for the room.");
      return;
    }
    const roomId = generateRoomId();
    roomStore[roomId] = createPassword;
    setCreatedRoomId(roomId);
    setError("");
    // Store roomId and password in localStorage for call page validation
    localStorage.setItem("roomId", roomId);
    localStorage.setItem("roomPassword", createPassword);
    // Redirect to call page
    navigate(`/call/${roomId}`);
  };

  // Join Room handler
  const handleJoinRoom = (e) => {
    e.preventDefault();
    if (!joinRoomId || !joinPassword) {
      setError("Please enter both Room ID and password.");
      return;
    }
    if (roomStore[joinRoomId] && roomStore[joinRoomId] === joinPassword) {
      setError("");
      // Store roomId and password in localStorage for call page validation
      localStorage.setItem("roomId", joinRoomId);
      localStorage.setItem("roomPassword", joinPassword);
      navigate(`/call/${joinRoomId}`);
    } else {
      setError("Invalid Room ID or password.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100">
      <div className="bg-white/80 backdrop-blur p-10 rounded-2xl shadow-2xl border border-gray-200 w-full max-w-md">
        <h1 className="text-3xl font-extrabold mb-8 text-center text-gray-900 tracking-tight">
          Room Lobby
        </h1>
        {error && <div className="text-red-600 mb-2 text-center">{error}</div>}
        {/* Create Room */}
        <form onSubmit={handleCreateRoom} className="mb-8">
          <h2 className="text-xl font-semibold mb-2">Create Room</h2>
          <input
            type="password"
            value={createPassword}
            onChange={(e) => setCreatePassword(e.target.value)}
            placeholder="Set Room Password"
            className="w-full px-3 py-2 border rounded mb-2"
            required
          />
          <Button type="submit" className="w-full" variant="secondary">
            Create Room
          </Button>
          {createdRoomId && (
            <div className="mt-2 text-green-700 text-center">
              Room ID: <span className="font-mono">{createdRoomId}</span>
            </div>
          )}
        </form>
        {/* Join Room */}
        <form onSubmit={handleJoinRoom}>
          <h2 className="text-xl font-semibold mb-2">Join Room</h2>
          <input
            type="text"
            value={joinRoomId}
            onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
            placeholder="Enter Room ID"
            className="w-full px-3 py-2 border rounded mb-2"
            required
          />
          <input
            type="password"
            value={joinPassword}
            onChange={(e) => setJoinPassword(e.target.value)}
            placeholder="Enter Room Password"
            className="w-full px-3 py-2 border rounded mb-2"
            required
          />
          <Button type="submit" className="w-full" variant="primary">
            Join Room
          </Button>
        </form>
      </div>
    </div>
  );
}

export default RoomLobbyPage;
