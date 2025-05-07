import { getSocket } from "@/lib/getSocket";
import { useUser } from "@clerk/nextjs";
import { useCallback, useContext, useEffect, useState } from "react";
import { createContext } from "react";
import { Socket, io } from "socket.io-client";
import { SocketUser } from "@/types";
import { Users } from "lucide-react";

interface iSocketContext {
    socket: Socket | null
}

// interface Props {
//     [propName: string]: any;
// }

export const SocketContext = createContext<iSocketContext | null>(null);

export const SocketContextProvider = ({children} : {children : React.ReactNode}) => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isSocketConnected, setIsSocketConnected] = useState(false);
    const [onlineUsers, setOnlineUsers] = useState<SocketUser[] | null>(null);
    const { user } = useUser();

    console.log("onlineUsers>>", onlineUsers)

    // initialize socket
    useEffect(() => {

        const newSocket = io();
        setSocket(newSocket);

        return () => {
            newSocket.disconnect();
        }
    }, [user]);


    useEffect(() => {
        if (socket === null) return;

        if(socket.connected) {
            onConnect();
        }
        function onConnect() {
            setIsSocketConnected(true);
        }

        function onDisconnect() {
            setIsSocketConnected(false);
        }

        socket.on("connect", onConnect);
        socket.on("disconnect", onDisconnect);


        return () => {
            socket.off("connect", onConnect);
            socket.off("disconnect", onDisconnect);
        }

    }, [socket]);


    //set online Users

    useEffect(()=> {

        if(!socket || !isSocketConnected) return;

        socket.emit("addNewUser", user);
        socket.on("getUsers", (res) => {
            setOnlineUsers(res);
        })

        return () => {
            socket.off("getUsers", (res) => {
            setOnlineUsers(res);
        })
        }
    }, [socket, isSocketConnected, user]);



    return <SocketContext.Provider value={{}}>
            {children}
            </SocketContext.Provider>
};

export const useSocket = () => {
    const context = useContext(SocketContext);

    if (!context) {
        throw new Error("useSocket must be used within a SocketContextProvider");
    }
    return context;
}