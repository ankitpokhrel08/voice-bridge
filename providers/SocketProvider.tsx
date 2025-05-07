"use client";

import { SocketContextProvider } from "@/context/SocketContext";

// interface CartProviderProps {
//     children: React.ReactNode;
// }

const SocketProvider  = ({ children } : {children : React.ReactNode}) => {
    return <SocketContextProvider>{children}</SocketContextProvider>;
};

export default SocketProvider;
