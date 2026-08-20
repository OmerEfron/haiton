import { useQuery } from "@tanstack/react-query";
import styles from "./FrontPage.module.css";
import { Masthead } from "../components/layout/Masthead";
import { SectionsBar } from "../components/layout/SectionsBar";
import { Ticker } from "../components/layout/Ticker";
import { Footer } from "../components/layout/Footer";
import {
  FlashItem,
  LeadStory,
  StoryCard,
  StoryListRow,
  StoryThumbRow,
} from "../components/news/StoryPieces";
import newsStyles from "../components/news/News.module.css";
import { Avatar, ErrorState, LivePill, Loading, SectionHead } from "../components/ui/Bits";
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

  if (front.isPending) return <Loading />;
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

      {empty ? <EmptyEdition openDraft={openDraft} /> : (
        <>
          <div className={styles.grid}>
            <div>
              {page.lead && (
                <LeadStory story={page.lead} editionName={page.editionName} showTag={showTag} />
              )}

              {/* Mobile-only blocks from 1b */}
              <div className={styles.mobileOnly}>
                <div className={styles.flashBlock}>
                  <div className={styles.flashHead}>
                    <h3 className={styles.flashHeadTitle}>{common.flashes}</h3>
                    <ButtonLink to="/briefs" variant="link" size="sm">
                      {common.allFlashes}
                    </ButtonLink>
                  </div>
                  {page.flashes.slice(0, 3).map((flash) => (
                    <FlashItem key={flash.id} flash={flash} />
                  ))}
                </div>

                <div className={styles.promptBlock}>
                  <div className={newsStyles.prompt}>
                    <Avatar initial="כ" size={34} tone="solid" />
                    <div style={{ flex: 1 }}>
                      <p className={newsStyles.promptKicker}>
                        {openDraft ? desk.continueDraft : desk.waitingTitle}
                      </p>
                      <p className={newsStyles.promptBody}>
                        {openDraft
                          ? `יש טיוטה אחת בעריכה: «${openDraft.title}».`
                          : "הכתב מוכן לשאלה הראשונה על היום שלך."}
                      </p>
                      <ButtonLink to="/interview" size="lg">
                        {desk.openInterviewRoom}
                      </ButtonLink>
                    </div>
                  </div>
                </div>

                <div className={styles.moreBlock}>
                  <h3 className={styles.moreTitle}>{desk.moreInEdition}</h3>
                  {[...page.secondary, ...page.list].map((story) => (
                    <StoryThumbRow key={story.id} story={story} showTag={showTag} />
                  ))}
                </div>
              </div>
            </div>

            <aside className={styles.rail}>
              <SectionHead title={common.flashes} aside={<LivePill>{common.live}</LivePill>} />
              {page.flashes.map((flash) => (
                <FlashItem key={flash.id} flash={flash} />
              ))}

              {openDraft && (
                <div className={newsStyles.teaser}>
                  <p className={newsStyles.teaserKicker}>{common.inEditing}</p>
                  <p className={newsStyles.teaserTitle}>{openDraft.title}</p>
                  <p className={newsStyles.teaserBody}>{openDraft.summary}</p>
                  <ButtonLink to="/interview" variant="outline" size="md">
                    {desk.continueDraft}
                  </ButtonLink>
                </div>
              )}
            </aside>
          </div>

          {page.secondary.length > 0 && (
            <section className={styles.band}>
              <h3 className={styles.bandTitle}>{common.subheads}</h3>
              <div className={newsStyles.cardGrid}>
                {page.secondary.slice(0, 3).map((story) => (
                  <StoryCard key={story.id} story={story} showTag={showTag} />
                ))}
              </div>
            </section>
          )}

          <section className={styles.lower}>
            <h3 className={styles.lowerTitlePlain}>{common.allStories}</h3>
            <div>
              {[page.lead, ...page.secondary, ...page.list]
                .filter((s): s is NonNullable<typeof s> => Boolean(s))
                .map((story) => (
                  <StoryListRow key={story.id} story={story} showTag={showTag} />
                ))}
            </div>
          </section>
        </>
      )}

      <Footer />
    </>
  );
}

function EmptyEdition({ openDraft }: { openDraft: { title: string; summary: string } | null }) {
  return (
    <>
      <EmptyState
        badge={<LivePill>{openDraft ? common.inEditing : desk.emptyEditionKicker}</LivePill>}
        title={openDraft ? desk.emptyEditionDraftTitle : desk.emptyEditionTitle}
        body={openDraft ? desk.emptyEditionDraftBody(openDraft.title) : desk.emptyEditionBody}
        actions={
          openDraft ? (
            <ButtonLink to="/interview" size="lg">
              {desk.continueDraft}
            </ButtonLink>
          ) : (
            <>
              <ButtonLink to="/interview" size="lg">
                {desk.startFirstInterview}
              </ButtonLink>
              <ButtonLink to="/karteset" variant="outline" size="lg">
                {desk.fillKarteset}
              </ButtonLink>
            </>
          )
        }
      />
      <div className={styles.emptyFlashes}>
        <h3 className={styles.emptyFlashesTitle}>{common.flashes}</h3>
        <p className={styles.emptyFlashesBody}>{desk.noFlashes}</p>
      </div>
      <div className={styles.tomorrow}>
        <p className={styles.tomorrowLabel}>{desk.tomorrowTitle}</p>
        <div className={styles.tomorrowGrid}>
          {desk.tomorrowCards.map((card) => (
            <div key={card.kicker + card.text} className={styles.tomorrowCard}>
              <span className={styles.tomorrowKicker}>{card.kicker}</span>
              <p className={styles.tomorrowText}>{card.text}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
