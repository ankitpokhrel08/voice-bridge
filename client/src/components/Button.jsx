import React from "react";

// Simpler, compact button with vibrant variants
function Button({ children, className = "", variant = "primary", ...props }) {
  let base =
    "inline-flex items-center justify-center px-4 py-1.5 rounded-md font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-2 text-sm disabled:opacity-60 disabled:cursor-not-allowed ";
  let variants = {
    primary:
      "bg-gradient-to-r from-fuchsia-500 to-blue-500 text-white hover:from-fuchsia-600 hover:to-blue-600",
    secondary:
      "bg-gradient-to-r from-emerald-400 to-green-500 text-white hover:from-emerald-500 hover:to-green-600",
    outline: "bg-white border border-gray-300 text-gray-800 hover:bg-gray-50",
    danger:
      "bg-gradient-to-r from-red-500 to-pink-500 text-white hover:from-red-600 hover:to-pink-600",
  };
  return (
    <button
      className={`${base} ${
        variants[variant] || variants.primary
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export default Button;
