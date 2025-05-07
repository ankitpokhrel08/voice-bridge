import { getSocket } from '@/lib/getSocket';
import { useUser } from '@clerk/nextjs';
import { useCallback, useContext, useEffect, useState } from 'react';
import { createContext } from 'react';
import { Socket, io } from 'socket.io-client';
import { OngoingCall, Participants, SocketUser } from '@/types';
import { Users } from 'lucide-react';

interface iSocketContext {
//   socket: Socket | null;
  onlineUsers: SocketUser[] | null;
  ongoingCall: OngoingCall | null;
  handleCall: (user: SocketUser) => void;
}

// interface Props {
//     [propName: string]: any;
// }

export const SocketContext = createContext<iSocketContext | null>(null);

export const SocketContextProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { user } = useUser();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<SocketUser[] | null>(null);
  const [ongoingCall, setOngoingCall] = useState<OngoingCall | null>(null);
  const currentSocketUser = onlineUsers?.find(
    (onlineUser) => onlineUser.userId === user?.id
  );

  const handleCall = useCallback(
    (user: SocketUser) => {
      if (!currentSocketUser || !socket) return;

      const participants = { caller: currentSocketUser, receiver: user };
      setOngoingCall({
        participants,
        isRinging: false,
      });

      socket.emit('call', participants);
    },
    [socket, currentSocketUser, ongoingCall]
  );

  const onIncomingCall = useCallback(
    (participants: Participants) => {
      setOngoingCall({
        participants,
        isRinging: true,
      });
    },
    [socket, user, ongoingCall]
  );

  // initialize socket
  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [user]);

  useEffect(() => {
    if (socket === null) return;

    if (socket.connected) {
      onConnect();
    }
    function onConnect() {
      setIsSocketConnected(true);
    }

    function onDisconnect() {
      setIsSocketConnected(false);
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, [socket]);

  //set online Users

  useEffect(() => {
    if (!socket || !isSocketConnected) return;

    socket.emit('addNewUser', user);
    socket.on('getUsers', (res) => {
      setOnlineUsers(res);
    });

    return () => {
      socket.off('getUsers', (res) => {
        setOnlineUsers(res);
      });
    };
  }, [socket, isSocketConnected, user]);

  // calls
  useEffect(() => {
    if (!socket || !isSocketConnected) return;

    socket.on('incomingCall', onIncomingCall);

    return () => {
      socket.off('incomingCall', onIncomingCall);
    };
  }, [socket, isSocketConnected, user, onIncomingCall]);

  return (
    <SocketContext.Provider
      value={{
        onlineUsers,
        handleCall,
        ongoingCall
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);

  if (!context) {
    throw new Error('useSocket must be used within a SocketContextProvider');
  }
  return context;
};
