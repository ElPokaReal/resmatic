"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { apiLogin, apiMe, apiRefresh, apiLogout } from "@/lib/api";

export default function LoginPage() {
  const [email, setEmail] = useState("admin@resmatic.local");
  const [password, setPassword] = useState("password123");
  const [accessToken, setAccessToken] = useState<string>("");
  const [refreshToken, setRefreshToken] = useState<string>("");
  const [me, setMe] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>("");

  const onLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setMe(null);
    try {
      const res = await apiLogin(email, password);
      setAccessToken(res.accessToken);
      setRefreshToken(res.refreshToken);
      setMessage("Login OK");
    } catch (err: any) {
      setMessage(err?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const onMe = async () => {
    setLoading(true);
    setMessage("");
    try {
      const res = await apiMe(accessToken);
      setMe(res.user);
      setMessage("/auth/me OK");
    } catch (err: any) {
      setMessage(err?.message || "/auth/me failed");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setLoading(true);
    setMessage("");
    try {
      const res = await apiRefresh(refreshToken);
      setAccessToken(res.accessToken);
      setRefreshToken(res.refreshToken);
      setMessage("Refresh OK (rotated)");
    } catch (err: any) {
      setMessage(err?.message || "Refresh failed");
    } finally {
      setLoading(false);
    }
  };

  const onLogout = async () => {
    setLoading(true);
    setMessage("");
    try {
      await apiLogout(accessToken);
      setMessage("Logout OK (refresh tokens revoked)");
    } catch (err: any) {
      setMessage(err?.message || "Logout failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-8 font-sans">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-semibold mb-6">Login</h1>

        <form onSubmit={onLogin} className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border rounded px-3 py-2 bg-background text-foreground border-black/10 dark:border-white/20"
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border rounded px-3 py-2 bg-background text-foreground border-black/10 dark:border-white/20"
              placeholder="••••••••"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full h-10 rounded bg-foreground text-background hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Loading..." : "Login"}
          </button>
        </form>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={onMe}
            disabled={!accessToken || loading}
            className="h-10 rounded border border-black/10 dark:border-white/20 hover:bg-black/5 dark:hover:bg-white/10"
          >
            Me
          </button>
          <button
            onClick={onRefresh}
            disabled={!refreshToken || loading}
            className="h-10 rounded border border-black/10 dark:border-white/20 hover:bg-black/5 dark:hover:bg-white/10"
          >
            Refresh
          </button>
          <button
            onClick={onLogout}
            disabled={!accessToken || loading}
            className="h-10 rounded border border-black/10 dark:border-white/20 hover:bg-black/5 dark:hover:bg-white/10"
          >
            Logout
          </button>
        </div>

        <div className="mt-6 space-y-2">
          <div className="text-sm text-gray-600 dark:text-gray-300">
            <span className="font-semibold">Access:</span> {short(accessToken)}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-300">
            <span className="font-semibold">Refresh:</span> {short(refreshToken)}
          </div>
          {me && (
            <pre className="text-sm p-3 rounded bg-black/5 dark:bg-white/10 overflow-x-auto">
              {JSON.stringify(me, null, 2)}
            </pre>
          )}
          {message && (
            <div className="text-sm text-blue-600 dark:text-blue-400">{message}</div>
          )}
        </div>

        <div className="mt-8">
          <Link href="/" className="text-sm underline">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

function short(token: string) {
  if (!token) return "";
  if (token.length <= 16) return token;
  return `${token.slice(0, 8)}…${token.slice(-8)}`;
}
