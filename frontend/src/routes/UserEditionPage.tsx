import { useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Masthead } from "../components/layout/Masthead";
import { PageHeader } from "../components/layout/PageHeader";
import { Ticker } from "../components/layout/Ticker";
import { Footer } from "../components/layout/Footer";
import { EditionView } from "../components/news/EditionView";
import { ErrorState, Loading } from "../components/ui/Bits";
import { EmptyState } from "../components/ui/EmptyState";
import { ApiError } from "../api/client";
import { getUserEdition } from "../api/core/stories";
import { getProfile } from "../api/core/profile";
import { qk } from "../lib/queryKeys";
import { useSession } from "../lib/session";
import { circle } from "../copy/circle";

export function UserEditionPage() {
  const { userId = "" } = useParams();
  const { session } = useSession();
  const mine = session?.user.id === userId;
  const edition = useQuery({
    queryKey: qk.edition(userId),
    queryFn: () => getUserEdition(userId),
    enabled: Boolean(userId),
  });
  const profile = useQuery({ queryKey: qk.profile, queryFn: getProfile });

  if (edition.isPending) {
    return (
      <>
        <PageHeader />
        <Loading />
      </>
    );
  }
  if (edition.error instanceof ApiError && edition.error.status === 404) {
    return (
      <>
        <PageHeader />
        <EmptyState title={circle.joinWallTitle} body={circle.joinWallBody} />
        <Footer />
      </>
    );
  }
  if (edition.error) {
    return (
      <>
        <PageHeader />
        <ErrorState error={edition.error} />
        <Footer />
      </>
    );
  }

  const page = edition.data;
  const showTag = profile.data?.settings.showEditionTag ?? true;
  const empty = !page.lead && page.secondary.length === 0 && page.list.length === 0;

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
        <EmptyState title={circle.joinWallTitle} body={circle.emptyPeople} />
      ) : (
        <EditionView
          page={page}
          showTag={showTag}
          openDraft={mine ? page.openDraft : null}
          showDesk={mine}
        />
      )}
      <Footer />
    </>
  );
}
