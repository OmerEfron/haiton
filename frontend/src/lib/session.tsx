import { createContext, useContext, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Navigate, useLocation } from "react-router";
import type { Session } from "../api/types";
import { getSession, signOut } from "../api/core/auth";
import { qk } from "./queryKeys";
import { Loading } from "../components/ui/Bits";

interface SessionValue {
  session: Session | null;
  signOut: () => Promise<void>;
}

const Ctx = createContext<SessionValue>({ session: null, signOut: async () => {} });

export function SessionProvider({ children }: { children: ReactNode }) {
  const client = useQueryClient();
  const { data, isPending } = useQuery({ queryKey: qk.session, queryFn: getSession });

  if (isPending) return <Loading />;

  return (
    <Ctx.Provider
      value={{
        session: data ?? null,
        signOut: async () => {
          await signOut();
          await client.invalidateQueries();
        },
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSession(): SessionValue {
  return useContext(Ctx);
}

/** Sends unauthenticated readers to the sign-in page, remembering where they were. */
export function RequireSession({ children }: { children: ReactNode }) {
  const { session } = useSession();
  const location = useLocation();
  if (!session) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  return <>{children}</>;
}
