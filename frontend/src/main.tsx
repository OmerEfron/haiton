import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router/dom";
import { router } from "./router";
import { SessionProvider } from "./lib/session";
import "./styles/base.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Mock data is local, so refetching on focus is noise. Revisit once the
      // real core/reporter services are wired in.
      refetchOnWindowFocus: false,
      retry: false,
      staleTime: 30_000,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <RouterProvider router={router} />
      </SessionProvider>
    </QueryClientProvider>
  </StrictMode>,
);
