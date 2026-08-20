import { createBrowserRouter } from "react-router";
import { AppLayout } from "./components/layout/AppLayout";
import { RequireSession } from "./lib/session";
import { FrontPage } from "./routes/FrontPage";
import { StoryPage } from "./routes/StoryPage";
import { BriefsPage } from "./routes/BriefsPage";
import { InterviewRoom } from "./routes/InterviewRoom";
import { InterviewArchivePage } from "./routes/InterviewArchivePage";
import { KartesetPage } from "./routes/KartesetPage";
import { ProfilePage } from "./routes/ProfilePage";
import { LoginPage } from "./routes/LoginPage";
import { JoinPage } from "./routes/JoinPage";
import { UserEditionPage } from "./routes/UserEditionPage";
import { NotFound } from "./routes/NotFound";

function guarded(element: React.ReactElement) {
  return <RequireSession>{element}</RequireSession>;
}

export const router = createBrowserRouter([
  {
    path: "/",
    Component: AppLayout,
    children: [
      { index: true, element: guarded(<FrontPage />) },
      { path: "s/:token", element: <StoryPage /> },
      { path: "story/:storyId", element: guarded(<StoryPage />) },
      { path: "join/:token", element: <JoinPage /> },
      { path: "u/:userId", element: guarded(<UserEditionPage />) },
      { path: "briefs", element: guarded(<BriefsPage />) },
      { path: "interview", element: guarded(<InterviewRoom />) },
      { path: "interview/:id", element: guarded(<InterviewArchivePage />) },
      { path: "karteset", element: guarded(<KartesetPage />) },
      { path: "profile", element: guarded(<ProfilePage />) },
      { path: "login", element: <LoginPage /> },
      { path: "*", element: <NotFound /> },
    ],
  },
]);
