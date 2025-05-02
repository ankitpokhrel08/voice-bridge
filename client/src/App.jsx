import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import LobbyPage from "./pages/LobbyPage";
import RoomPage from "./pages/RoomPage";
import CallTranscribePage from "./pages/CallTranscribePage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import RoomLobbyPage from "./pages/RoomLobbyPage";

function RequireAuth({ children }) {
  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
  const location = useLocation();
  if (!isLoggedIn) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route
        path="/room"
        element={
          <RequireAuth>
            <RoomLobbyPage />
          </RequireAuth>
        }
      />
      <Route
        path="/room/:roomId"
        element={
          <RequireAuth>
            <RoomPage />
          </RequireAuth>
        }
      />
      <Route
        path="/call/:roomId"
        element={
          <RequireAuth>
            <CallTranscribePage />
          </RequireAuth>
        }
      />
      <Route path="/" element={<Navigate to="/room" replace />} />
    </Routes>
  );
}

export default App;
