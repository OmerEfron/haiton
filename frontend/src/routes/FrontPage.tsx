import { useQuery } from "@tanstack/react-query";
import styles from "./FrontPage.module.css";
import { Masthead } from "../components/layout/Masthead";
import { PageHeader } from "../components/layout/PageHeader";
import { SectionsBar } from "../components/layout/SectionsBar";
import { Ticker } from "../components/layout/Ticker";
import { Footer } from "../components/layout/Footer";
import { EditionView } from "../components/news/EditionView";
import { ErrorState, LivePill, Loading } from "../components/ui/Bits";
import { ButtonLink } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { getFrontPage } from "../api/core/stories";
import { getProfile } from "../api/core/profile";
import { getSession } from "../api/reporter/interview";
import { qk } from "../lib/queryKeys";
import { common } from "../copy/common";
import { desk } from "../copy/desk";

export function FrontPage() {
  const front = useQuery({ queryKey: qk.frontPage, queryFn: getFrontPage });
  const profile = useQuery({ queryKey: qk.profile, queryFn: getProfile });
  const interview = useQuery({ queryKey: qk.interview, queryFn: getSession });

  if (front.isPending) {
    return (
      <>
        <PageHeader />
        <Loading />
      </>
    );
  }
  if (front.error) return <ErrorState error={front.error} />;

  const page = front.data;
  const showTag = profile.data?.settings.showEditionTag ?? true;
  const empty = !page.lead && page.secondary.length === 0 && page.list.length === 0;
  const session = interview.data;
  const openDraft =
    page.openDraft ??
    (session &&
    (session.draft.status !== "empty" ||
      session.messages.some((m) => m.role === "reader"))
      ? {
          title: session.draft.headline ?? session.draft.angle ?? desk.openInterview,
          summary: session.draft.standfirst ?? "",
        }
      : null);

  return (
    <>
      <Masthead
        dateLong={page.dateLong}
        dateShort={page.dateShort}
        editionNumber={page.editionNumber}
        editionName={page.editionName}
      />
      <SectionsBar />
      {!empty && <Ticker items={page.ticker} />}

      {empty ? (
        <EmptyEdition openDraft={openDraft} />
      ) : (
        <EditionView page={page} showTag={showTag} openDraft={openDraft} showDesk />
      )}

      <Footer />
    </>
  );
}

function EmptyEdition({ openDraft }: { openDraft: { title: string; summary: string } | null }) {
  if (openDraft) {
    return (
      <EmptyState
        badge={<LivePill>{common.inEditing}</LivePill>}
        title={desk.emptyEditionDraftTitle}
        body={desk.emptyEditionDraftBody(openDraft.title)}
        actions={
          <ButtonLink to="/interview" size="lg">
            {desk.continueDraft}
          </ButtonLink>
        }
      />
    );
  }

  return (
    <div className={styles.emptyEdition}>
      <h2 className={styles.emptyEditionTitle}>{desk.emptyEditionTitle}</h2>
      <ButtonLink to="/interview" size="lg">
        {desk.startFirstInterview}
      </ButtonLink>
    </div>
  );
}
