import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router";
import { Masthead } from "../components/layout/Masthead";
import { PageHeader } from "../components/layout/PageHeader";
import { SectionsBar } from "../components/layout/SectionsBar";
import { Ticker } from "../components/layout/Ticker";
import { Footer } from "../components/layout/Footer";
import { EditionView } from "../components/news/EditionView";
import { ErrorState, LivePill, Loading } from "../components/ui/Bits";
import { Button, ButtonLink } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { getFrontPage } from "../api/core/stories";
import { getProfile } from "../api/core/profile";
import { discardSession, getSession } from "../api/reporter/interview";
import { qk } from "../lib/queryKeys";
import { common } from "../copy/common";
import { circle } from "../copy/circle";
import { desk } from "../copy/desk";

export function FrontPage() {
  const client = useQueryClient();
  const [params] = useSearchParams();
  const draftSaved = params.get("draft") === "saved";
  const front = useQuery({ queryKey: qk.frontPage, queryFn: getFrontPage });
  const profile = useQuery({ queryKey: qk.profile, queryFn: getProfile });
  const interview = useQuery({ queryKey: qk.interview, queryFn: getSession });

  const discard = useMutation({
    mutationFn: discardSession,
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: qk.interview });
      await client.invalidateQueries({ queryKey: qk.frontPage });
      await client.invalidateQueries({ queryKey: qk.profile });
    },
  });

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
      {/* <SectionsBar /> */}
      {!empty && <Ticker items={page.ticker} />}

      {empty ? (
        <EmptyEdition
          openDraft={openDraft}
          draftSaved={draftSaved}
          onDiscard={() => discard.mutate()}
          discarding={discard.isPending}
        />
      ) : (
        <EditionView
          page={page}
          showTag={showTag}
          openDraft={openDraft}
          showDesk
          draftSaved={draftSaved}
          onDiscardDraft={() => discard.mutate()}
          discarding={discard.isPending}
        />
      )}

      <Footer />
    </>
  );
}

function EmptyEdition({
  openDraft,
  draftSaved,
  onDiscard,
  discarding,
}: {
  openDraft: { title: string; summary: string } | null;
  draftSaved: boolean;
  onDiscard: () => void;
  discarding: boolean;
}) {
  if (openDraft) {
    return (
      <EmptyState
        badge={<LivePill>{common.inEditing}</LivePill>}
        title={desk.emptyEditionDraftTitle}
        body={
          draftSaved
            ? `${desk.draftSaved} ${desk.emptyEditionDraftBody(openDraft.title)}`
            : desk.emptyEditionDraftBody(openDraft.title)
        }
        actions={
          <>
            <ButtonLink to="/interview" size="lg">
              {desk.continueDraft}
            </ButtonLink>
            <Button variant="outline" size="lg" onClick={onDiscard} disabled={discarding}>
              {desk.startOver}
            </Button>
          </>
        }
      />
    );
  }

  return (
    <EmptyState
      title={desk.emptyEditionTitle}
      body={desk.emptyEditionBody}
      actions={
        <>
          <ButtonLink to="/karteset" variant="outline" size="lg">
            {desk.fillKarteset}
          </ButtonLink>
          <ButtonLink to="/profile" variant="outline" size="lg">
            {circle.invite}
          </ButtonLink>
          <ButtonLink to="/interview" size="lg">
            {desk.startFirstInterview}
          </ButtonLink>
        </>
      }
    />
  );
}
