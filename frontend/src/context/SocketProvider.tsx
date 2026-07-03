import { createContext, useContext, type ReactNode } from "react";
import { useSocket, type AppSocket } from "../hooks/useSocket";
import type { Roster } from "../types/socket";

interface SocketContextValue {
  socket: AppSocket;
  roster: Roster;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextValue | null>(null);

export function SocketProvider({ username, children }: { username: string; children: ReactNode }) {
  const { socket, roster, isConnected } = useSocket(username);
  return <SocketContext.Provider value={{ socket, roster, isConnected }}>{children}</SocketContext.Provider>;
}

export function useSocketContext(): SocketContextValue {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error("useSocketContext must be used within SocketProvider");
  return ctx;
}
