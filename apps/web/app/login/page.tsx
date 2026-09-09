"use client";

import { useState } from "react";

const demoAccounts = [
  { label: "Consumer", detail: "prices, reservations & doorstep QR", email: "consumer@farmit.in", password: "consumer123" },
  { label: "Farmer", detail: "lists harvest lots in the catalog", email: "farmer@farmit.in", password: "farmer123" },
  { label: "Operator", detail: "publishes quotes & plans logistics", email: "operator@farmit.in", password: "operator123" },
];

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function signIn(nextEmail: string, nextPassword: string) {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: nextEmail, password: nextPassword }),
      });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setError(data?.error ?? "Sign-in failed. Check the email and password.");
        return;
      }
      const url = new URL(window.location.href);
      const next = url.searchParams.get("next");
      window.location.assign(next && next.startsWith("/") && !next.startsWith("//") ? next : "/");
    } catch {
      setError("Could not reach the authentication service. Try again.");
    } finally {
      setLoading(false);
    }
  }

  function fillDemo(account: { email: string; password: string }) {
    setEmail(account.email);
    setPassword(account.password);
    void signIn(account.email, account.password);
  }

  return (
    <main className="auth-shell">
      <div className="auth-card">
        <div className="brand">
          <span className="brand-mark">F</span>
          <span>
            Farm<span className="brand-accent">It</span>
          </span>
        </div>
        <span className="eyebrow">SIGN IN · MARKETPLACE 01</span>
        <h1>Good rice starts with a fair start.</h1>
        <p>
          This demo marketplace is protected — sign in to list a harvest, publish quotes or shop
          the 20 kg weekly order within the 100 km ring.
        </p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void signIn(email, password);
          }}
        >
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="username"
              placeholder="you@farmit.in"
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              placeholder="••••••••••"
              required
            />
          </label>
          {error && <p className="auth-error">{error}</p>}
          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"} <span>→</span>
          </button>
        </form>
        <div className="auth-demo">
          <span className="auth-demo-label">DEMO ACCOUNTS — ONE CLICK EACH</span>
          {demoAccounts.map(
            (account) => (
              <button key={account.email} className="demo-account" onClick={() => fillDemo(account)}>
                <b>{account.label}</b>
                <small>
                  {account.email} · {account.password} — {account.detail}
                </small>
              </button>
            ),
          )}
        </div>
      </div>
    </main>
  );
}