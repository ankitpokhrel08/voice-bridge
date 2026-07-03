import { useState } from "react";
import { LoginScreen } from "./components/login/LoginScreen";
import { CallScreen } from "./components/call/CallScreen";
import { SocketProvider } from "./context/SocketProvider";
import { CallProvider } from "./context/CallProvider";
import { ToastProvider } from "./context/ToastProvider";
import { ToastStack } from "./components/shared/ToastStack";

interface Session {
  username: string;
  preferredLanguage: string;
  spokenLanguage: string;
}

function App() {
  const [session, setSession] = useState<Session | null>(null);

  return (
    <ToastProvider>
      {session ? (
        <SocketProvider username={session.username}>
          <CallProvider
            username={session.username}
            preferredLanguage={session.preferredLanguage}
            spokenLanguage={session.spokenLanguage}
          >
            <CallScreen ownUsername={session.username} />
          </CallProvider>
        </SocketProvider>
      ) : (
        <LoginScreen
          onLogin={(username, preferredLanguage, spokenLanguage) =>
            setSession({ username, preferredLanguage, spokenLanguage })
          }
        />
      )}
      <ToastStack />
    </ToastProvider>
  );
}

export default App;
