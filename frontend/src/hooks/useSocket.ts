import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type { ClientToServerEvents, Roster, ServerToClientEvents } from "../types/socket";

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

/** Owns a single socket.io connection for the app's lifetime. The socket is
 * created lazily (once, via ref) rather than inside an effect, so that any
 * consumer's own effect -- even one that runs before this hook's effect --
 * can safely call socket.on(...) without missing a race (socket.io-client
 * lets you attach listeners before the connection handshake completes). */
export function useSocket(username: string | null) {
  const socketRef = useRef<AppSocket | null>(null);
  if (!socketRef.current) {
    socketRef.current = io();
  }

  const [roster, setRoster] = useState<Roster>({});
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socket = socketRef.current!;
    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);
    const handleJoined = (allusers: Roster) => setRoster(allusers);

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("joined", handleJoined);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("joined", handleJoined);
    };
  }, []);

  useEffect(() => {
    if (!username) return;
    const socket = socketRef.current!;
    if (socket.connected) {
      socket.emit("join-user", username);
    } else {
      socket.once("connect", () => socket.emit("join-user", username));
    }
  }, [username]);

  return { socket: socketRef.current satisfies AppSocket | null as AppSocket, roster, isConnected };
}
