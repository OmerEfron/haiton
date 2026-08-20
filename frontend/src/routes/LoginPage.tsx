import { useEffect, useState, type FormEvent } from "react";
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
import { joinReturnPath } from "./JoinPage";

type Mode = "signIn" | "signUp";

export function LoginPage() {
  const { session } = useSession();
  const location = useLocation();
  const navigate = useNavigate();
  const client = useQueryClient();

  const [mode, setMode] = useState<Mode>("signIn");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const from = joinReturnPath((location.state as { from?: string } | null)?.from);

  const submit = useMutation({
    mutationFn: async () => {
      if (mode === "signIn") return signIn({ email, password });
      if (password.length < 8) throw new Error(authCopy.passwordTooShort);
      if (password !== confirmPassword) throw new Error(authCopy.passwordMismatch);
      return signUp({ name, email, password });
    },
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: qk.session });
      navigate(from, { replace: true });
    },
  });

  const resetSubmit = submit.reset;
  useEffect(() => {
    resetSubmit();
  }, [email, password, name, mode, confirmPassword, resetSubmit]);

  if (session) return <Navigate to={from} replace />;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (mode === "signUp") {
      if (!name.trim() || password.length < 8 || password !== confirmPassword) return;
    }
    submit.mutate();
  }

  const signupBlocked =
    !name.trim() || password !== confirmPassword || password.length < 8;

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
                onClick={() => {
                  if (m === "signUp" && mode !== "signUp") {
                    setPassword("");
                    setConfirmPassword("");
                    submit.reset();
                  }
                  setMode(m);
                }}
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
              error={
                mode === "signUp" && password.length > 0 && password.length < 8
                  ? authCopy.passwordTooShort
                  : undefined
              }
            />
            {mode === "signUp" && (
              <TextField
                label={authCopy.confirmPassword}
                ltr
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                error={
                  confirmPassword.length > 0 && password !== confirmPassword
                    ? authCopy.passwordMismatch
                    : undefined
                }
              />
            )}

            {submit.error && <p className={styles.error}>{(submit.error as Error).message}</p>}

            <Button
              type="submit"
              size="xl"
              block
              disabled={submit.isPending || (mode === "signUp" && signupBlocked)}
            >
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
                  onClick={() => {
                    setPassword("");
                    setConfirmPassword("");
                    submit.reset();
                    setMode("signUp");
                  }}
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
