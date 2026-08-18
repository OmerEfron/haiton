/* In-memory store standing in for both future backends.
 * Seeded on module load and mutated by the api/ functions.
 * Reloading the page resets everything — deliberately, so that no persistence
 * layer has to be unpicked when the real services arrive. */

import type {
  Connection,
  Fact,
  Flash,
  InterviewSession,
  Invitation,
  Profile,
  Session,
  Story,
} from "../api/types";
import { connectionsSeed, invitationsSeed } from "./fixtures/connections";
import { factsSeed } from "./fixtures/facts";
import { flashesSeed, tickerSeed } from "./fixtures/flashes";
import { digestsSeed, storiesSeed } from "./fixtures/stories";
import { editionSeed, profileSeed, userSeed } from "./fixtures/profile";

export interface Db {
  session: Session | null;
  profile: Profile;
  edition: typeof editionSeed;
  ticker: string[];
  stories: Story[];
  digests: typeof digestsSeed;
  flashes: Flash[];
  facts: Fact[];
  connections: Connection[];
  invitations: Invitation[];
  interview: InterviewSession | null;
  /** Cursor into the scripted beats in fixtures/interview-script. */
  interviewBeat: number;
}

function seed(): Db {
  return {
    // Signed in from the start: the mock store lives in memory, so a page
    // reload would otherwise bounce every deep link to /login. Sign out from
    // the profile page to reach the sign-in screen.
    session: { user: userSeed, editionName: profileSeed.settings.editionName },
    profile: structuredClone(profileSeed),
    edition: { ...editionSeed },
    ticker: [...tickerSeed],
    stories: structuredClone(storiesSeed),
    digests: structuredClone(digestsSeed),
    flashes: structuredClone(flashesSeed),
    facts: structuredClone(factsSeed),
    connections: structuredClone(connectionsSeed),
    invitations: structuredClone(invitationsSeed),
    interview: null,
    interviewBeat: 0,
  };
}

export const db: Db = seed();

/** Used by the dev-only reset affordance and by any future test setup. */
export function resetDb(): void {
  Object.assign(db, seed());
}
