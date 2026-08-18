import { createBrowserRouter } from "react-router";
import { AppLayout } from "./components/layout/AppLayout";
import { RequireSession } from "./lib/session";
import { FrontPage } from "./routes/FrontPage";
import { StoryPage } from "./routes/StoryPage";
import { BriefsPage } from "./routes/BriefsPage";
import { InterviewRoom } from "./routes/InterviewRoom";
import { KartesetPage } from "./routes/KartesetPage";
import { CirclePage } from "./routes/CirclePage";
import { ProfilePage } from "./routes/ProfilePage";
import { LoginPage } from "./routes/LoginPage";
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
      { path: "story/:storyId", element: guarded(<StoryPage />) },
      { path: "briefs", element: guarded(<BriefsPage />) },
      { path: "interview", element: guarded(<InterviewRoom />) },
      { path: "karteset", element: guarded(<KartesetPage />) },
      { path: "circle", element: guarded(<CirclePage />) },
      { path: "profile", element: guarded(<ProfilePage />) },
      { path: "login", element: <LoginPage /> },
      { path: "*", element: <NotFound /> },
    ],
  },
]);
