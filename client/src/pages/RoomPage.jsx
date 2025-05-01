import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../components/Button";

function generateRoomId() {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
  for (let i = 0; i < 6; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

function RoomPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState(null); // 'create' or 'join'
  const [roomId, setRoomId] = useState("");
  const [password, setPassword] = useState("");

  const handleCreateRoom = () => {
    setRoomId(generateRoomId());
    setPassword("");
    setMode("create");
  };

  const handleJoinRoom = () => {
    setRoomId("");
    setPassword("");
    setMode("join");
  };

  const handleProceed = (e) => {
    e.preventDefault();
    // In future, pass roomId and password to backend or context
    navigate("/call");
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100">
      <div className="bg-white/80 backdrop-blur p-10 rounded-2xl shadow-2xl border border-gray-200 w-full max-w-md">
        <h1 className="text-3xl font-extrabold mb-8 text-center text-gray-900 tracking-tight">
          Join or Create a Room
        </h1>
        {!mode && (
          <div className="flex flex-col gap-4 w-full">
            <Button
              onClick={handleJoinRoom}
              className="w-full"
              variant="primary"
            >
              Join Room
            </Button>
            <Button
              onClick={handleCreateRoom}
              className="w-full"
              variant="secondary"
            >
              Create Room
            </Button>
          </div>
        )}
        {mode === "create" && (
          <form
            onSubmit={handleProceed}
            className="flex flex-col gap-4 w-full mt-2"
          >
            <div>
              <label className="block text-gray-700 font-semibold mb-1">
                Room ID
              </label>
              <input
                type="text"
                value={roomId}
                readOnly
                className="w-full px-3 py-2 border rounded bg-gray-100 text-gray-700 font-mono"
              />
            </div>
            <div>
              <label className="block text-gray-700 font-semibold mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3 py-2 border rounded"
                placeholder="Set a password"
              />
            </div>
            <Button type="submit" className="w-full" variant="secondary">
              Proceed to Call
            </Button>
            <Button
              type="button"
              onClick={() => setMode(null)}
              className="w-full"
              variant="outline"
            >
              Back
            </Button>
          </form>
        )}
        {mode === "join" && (
          <form
            onSubmit={handleProceed}
            className="flex flex-col gap-4 w-full mt-2"
          >
            <div>
              <label className="block text-gray-700 font-semibold mb-1">
                Room ID
              </label>
              <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                required
                className="w-full px-3 py-2 border rounded"
                placeholder="Enter room ID"
              />
            </div>
            <div>
              <label className="block text-gray-700 font-semibold mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3 py-2 border rounded"
                placeholder="Enter password"
              />
            </div>
            <Button type="submit" className="w-full" variant="primary">
              Join Call
            </Button>
            <Button
              type="button"
              onClick={() => setMode(null)}
              className="w-full"
              variant="outline"
            >
              Back
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

export default RoomPage;
