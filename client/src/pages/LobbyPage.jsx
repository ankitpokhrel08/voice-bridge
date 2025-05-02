import { useCallback, useEffect, useState } from "react";
import { useSocket } from "../context/SocketProvider";
import { useNavigate } from "react-router-dom";
import Button from "../components/Button";

function LobbyPage() {
  const [room, setRoom] = useState("");
  const [email, setEmail] = useState("");
  const socket = useSocket();
  const navigate = useNavigate();

  const handleSubmitForm = useCallback(
    (e) => {
      e.preventDefault();
      if (room && email) {
        socket.emit("join-room", { room, email });
      }
    },
    [room, email, socket]
  );

  const handleJoinRoom = useCallback(
    ({ room }) => {
      navigate(`/room/${room}`);
    },
    [navigate]
  );

  useEffect(() => {
    socket.on("join-room", handleJoinRoom);
    return () => {
      socket.off("join-room", handleJoinRoom);
    };
  }, [socket, handleJoinRoom]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100">
      <div className="bg-white/80 backdrop-blur p-10 rounded-2xl shadow-2xl border border-gray-200 w-full max-w-md">
        <h1 className="text-3xl font-extrabold mb-8 text-center text-gray-900 tracking-tight">
          Lobby
        </h1>
        <form
          onSubmit={handleSubmitForm}
          className="flex flex-col gap-4 w-full mt-2"
        >
          <div>
            <label className="block text-gray-700 font-semibold mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border rounded"
              placeholder="Enter your email"
            />
          </div>
          <div>
            <label className="block text-gray-700 font-semibold mb-1">
              Room ID
            </label>
            <input
              type="text"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              required
              className="w-full px-3 py-2 border rounded"
              placeholder="Enter room ID"
            />
          </div>
          <Button type="submit" className="w-full" variant="primary">
            Join Room
          </Button>
        </form>
      </div>
    </div>
  );
}

export default LobbyPage;
