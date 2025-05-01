import { useState } from "react";
import "./App.css";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  const handleLogin = () => {
    setIsLoggedIn(true);
  };

  const handleSignUp = () => {
    setIsSignUp(true);
  };

  const handleBackToLogin = () => {
    setIsSignUp(false);
  };

  return (
    <div className="app-container">
      {!isLoggedIn ? (
        <div className="auth-container">
          {!isSignUp ? (
            <div className="login-form">
              <h2>Login</h2>
              <input type="text" placeholder="Username" />
              <input type="password" placeholder="Password" />
              <button onClick={handleLogin}>Login</button>
              <p>
                Don't have an account?{" "}
                <span className="link" onClick={handleSignUp}>
                  Sign up
                </span>
              </p>
            </div>
          ) : (
            <div className="signup-form">
              <h2>Sign Up</h2>
              <input type="text" placeholder="Username" />
              <input type="email" placeholder="Email" />
              <input type="password" placeholder="Password" />
              <button onClick={handleLogin}>Sign Up</button>
              <p>
                Already have an account?{" "}
                <span className="link" onClick={handleBackToLogin}>
                  Login
                </span>
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="video-call-container">
          <h1>Welcome to the Video Call App</h1>
          <p>Video call interface will be here.</p>
        </div>
      )}
    </div>
  );
}

export default App;
