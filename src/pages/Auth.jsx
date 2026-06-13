import { useState } from "react";
import { supabase } from "../supabase";
import { useNavigate } from "react-router-dom";

export default function Auth() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function signup() {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
      },
    });

    if (error) {
      alert(error.message);
      return;
    }

    navigate("/profile");
  }

  async function login() {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert(error.message);
      return;
    }

    navigate("/profile");
  }

  async function googleLogin() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/profile`,
      },
    });
  }

  return (
    <main className="min-h-screen bg-gray-100 flex items-center justify-center font-mono">
      <div className="bg-white rounded-sm shadow p-6 flex flex-col gap-4 w-full max-w-md">
        <h1 className="text-2xl font-bold text-center">
          {isLogin ? "Login to Your Account" : "Create a New Account"}
        </h1>
      {!isLogin && (
        <input
          placeholder="Name"
          className="w-full border rounded-lg p-3"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      )}

      <input
        placeholder="Email"
        className="w-full border rounded-lg p-3"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        type="password"
        placeholder="Password"
        className="w-full border rounded-lg p-3"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <button
        onClick={isLogin ? login : signup}
        className="w-full bg-black text-white py-3 rounded-lg"
      >
        {isLogin ? "Login" : "Create Account"}
      </button>

      <button
        onClick={googleLogin}
        className="w-full bg-blue-600 text-white py-3 rounded-lg"
      >
        Continue with Google
      </button>

      <button
        onClick={() => setIsLogin(!isLogin)}
        className="text-sm text-blue-600"
      >
        {isLogin
          ? "Need an account? Sign up"
          : "Already have an account? Login"}
      </button>
    </div>
    </main>
  );
}
