import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Button from "../components/Button";

function LoginPage({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const isLoggedIn = localStorage.getItem("isLoggedIn");
    if (isLoggedIn === "true") {
      navigate("/room", { replace: true });
    }
  }, [navigate]);

  const handleLogin = () => {
    const storedEmail = localStorage.getItem("email") || "abc@gmail.com";
    const storedPassword = localStorage.getItem("password") || "12345678";

    if (email === storedEmail && password === storedPassword) {
      onLogin();
      navigate("/room"); // Redirect to room page after login
    } else {
      alert("Invalid credentials");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-fuchsia-100 to-blue-200">
      <div className="bg-white/90 backdrop-blur p-8 rounded-2xl shadow-2xl w-full max-w-sm border-2 border-fuchsia-400">
        <h2 className="text-3xl font-extrabold mb-6 text-center text-fuchsia-700 tracking-tight">
          Login
        </h2>
        <input
          className="w-full p-3 mb-4 border border-fuchsia-300 rounded-lg focus:ring-2 focus:ring-fuchsia-400 focus:border-fuchsia-400 transition text-sm"
          type="email"
          placeholder="abc@gmail.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="w-full p-3 mb-6 border border-fuchsia-300 rounded-lg focus:ring-2 focus:ring-fuchsia-400 focus:border-fuchsia-400 transition text-sm"
          type="password"
          placeholder="12345678"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button className="w-full mb-2" onClick={handleLogin}>
          Login
        </Button>
        <p className="mt-4 text-center text-gray-600">
          Don't have an account?{" "}
          <Link
            className="text-fuchsia-600 font-semibold hover:underline"
            to="/signup"
          >
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
