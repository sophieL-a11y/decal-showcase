"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't sign in.");
        setLoading(false);
        return;
      }
      router.push(searchParams.get("next") || "/admin");
      router.refresh();
    } catch {
      setError("Couldn't reach the server.");
      setLoading(false);
    }
  }

  return (
    <main style={styles.page}>
      <form onSubmit={handleSubmit} style={styles.card}>
        <p style={styles.kicker}>Full-Stack DeCal</p>
        <h1 style={styles.title}>Instructor sign-in</h1>
        <input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          style={styles.input}
        />
        {error && <p style={styles.error}>{error}</p>}
        <button type="submit" style={styles.button} disabled={loading}>
          {loading ? "Checking…" : "View responses"}
        </button>
      </form>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    background: "var(--surface)",
    border: "1px solid var(--line)",
    borderRadius: "var(--radius)",
    padding: 28,
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  kicker: {
    margin: 0,
    fontFamily: "var(--mono)",
    fontSize: 13,
    color: "var(--ink-soft)",
  },
  title: {
    margin: "4px 0 10px",
    fontSize: 22,
    fontWeight: 600,
  },
  input: {
    font: "inherit",
    fontSize: 15,
    padding: "10px 12px",
    border: "1px solid var(--line)",
    borderRadius: "var(--radius)",
    background: "var(--bg)",
    color: "var(--ink)",
  },
  error: {
    margin: 0,
    color: "var(--error)",
    fontSize: 13.5,
  },
  button: {
    padding: "11px 16px",
    fontSize: 15,
    fontWeight: 600,
    border: "none",
    borderRadius: "var(--radius)",
    background: "var(--accent)",
    color: "var(--accent-ink)",
    cursor: "pointer",
  },
};
