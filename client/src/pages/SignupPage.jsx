import { useState } from "react";
import { Link } from "react-router-dom";
import Button from "../components/Button";

function SignupPage({ onBackToLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSignup = () => {
    localStorage.setItem("email", email);
    localStorage.setItem("password", password);
    alert("Signup successful! You can now log in.");
    onBackToLogin();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-emerald-100 to-green-200">
      <div className="bg-white/90 backdrop-blur p-8 rounded-2xl shadow-2xl w-full max-w-sm border-2 border-emerald-400">
        <h2 className="text-3xl font-extrabold mb-6 text-center text-emerald-700 tracking-tight">
          Sign Up
        </h2>
        <input
          className="w-full p-3 mb-4 border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition text-sm"
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="w-full p-3 mb-6 border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition text-sm"
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button
          className="w-full mb-2"
          variant="secondary"
          onClick={handleSignup}
        >
          Sign Up
        </Button>
        <p className="mt-4 text-center text-gray-600">
          Already have an account?{" "}
          <Link
            className="text-emerald-600 font-semibold hover:underline"
            to="/login"
          >
            Back to Login
          </Link>
        </p>
      </div>
    </div>
  );
}

export default SignupPage;
