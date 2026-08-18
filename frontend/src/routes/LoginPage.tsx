import { useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import styles from "./LoginPage.module.css";
import { Button } from "../components/ui/Button";
import { TextField } from "../components/ui/Field";
import { signIn, signUp } from "../api/core/auth";
import { useSession } from "../lib/session";
import { qk } from "../lib/queryKeys";
import { brand } from "../copy/common";
import { authCopy } from "../copy/circle";

type Mode = "signIn" | "signUp";

export function LoginPage() {
  const { session } = useSession();
  const location = useLocation();
  const navigate = useNavigate();
  const client = useQueryClient();

  const [mode, setMode] = useState<Mode>("signIn");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("omer@example.com");
  const [password, setPassword] = useState("••••••••");

  const from = (location.state as { from?: string } | null)?.from ?? "/";

  const submit = useMutation({
    mutationFn: async () =>
      mode === "signIn" ? signIn({ email, password }) : signUp({ name, email, password }),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: qk.session });
      navigate(from, { replace: true });
    },
  });

  if (session) return <Navigate to={from} replace />;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    submit.mutate();
  }

  return (
    <div className={styles.screen}>
      <div className={styles.card}>
        <div className={styles.hero}>
          <p className={styles.logo}>{brand.name}</p>
          <p className={styles.tagline}>{brand.tagline}</p>
        </div>

        <div className={styles.body}>
          <div className={styles.tabs} role="tablist">
            {(["signIn", "signUp"] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                className={[styles.tab, mode === m && styles.tabActive].filter(Boolean).join(" ")}
                onClick={() => setMode(m)}
              >
                {m === "signIn" ? authCopy.signIn : authCopy.signUp}
              </button>
            ))}
          </div>

          <form className={styles.form} onSubmit={onSubmit}>
            {mode === "signUp" && (
              <TextField
                label={authCopy.name}
                placeholder={authCopy.nameHint}
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
            )}
            <TextField
              label={authCopy.email}
              ltr
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
            <TextField
              label={authCopy.password}
              ltr
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "signIn" ? "current-password" : "new-password"}
            />

            {submit.error && <p className={styles.error}>{(submit.error as Error).message}</p>}

            <Button type="submit" size="xl" block disabled={submit.isPending}>
              {submit.isPending
                ? "רגע…"
                : mode === "signIn"
                  ? authCopy.signIn
                  : authCopy.signUp}
            </Button>

            {mode === "signIn" && (
              <p className={styles.note}>
                {authCopy.noAccount}{" "}
                <button
                  type="button"
                  className={styles.switch}
                  onClick={() => setMode("signUp")}
                >
                  {authCopy.openEdition}
                </button>
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
