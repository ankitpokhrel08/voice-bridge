import { createContext, useContext, useMemo } from "react";
import { io } from "socket.io-client";

const SocketContext = createContext(null);

export const useSocket = () => {
  return useContext(SocketContext);
};


function SocketProvider({ children }) {
  // Connect to Flask-SocketIO server
  const socket = useMemo(() => io("http://localhost:8000"), []);
  return (
    <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
  );
}

export default SocketProvider;
