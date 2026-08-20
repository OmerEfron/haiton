import styles from "../../routes/FrontPage.module.css";
import newsStyles from "./News.module.css";
import {
  FlashItem,
  LeadStory,
  StoryCard,
  StoryListRow,
  StoryThumbRow,
} from "./StoryPieces";
import { Avatar, LivePill, SectionHead } from "../ui/Bits";
import { ButtonLink } from "../ui/Button";
import type { FrontPage } from "../../api/types";
import { common } from "../../copy/common";
import { desk } from "../../copy/desk";

export function EditionView({
  page,
  showTag,
  openDraft,
  showDesk,
}: {
  page: FrontPage;
  showTag: boolean;
  openDraft: { title: string; summary: string } | null;
  showDesk: boolean;
}) {
  return (
    <>
      <div className={styles.grid}>
        <div>
          {page.lead && (
            <LeadStory story={page.lead} editionName={page.editionName} showTag={showTag} />
          )}

          <div className={styles.mobileOnly}>
            <div className={styles.flashBlock}>
              <div className={styles.flashHead}>
                <h3 className={styles.flashHeadTitle}>{common.flashes}</h3>
                {showDesk && (
                  <ButtonLink to="/briefs" variant="link" size="sm">
                    {common.allFlashes}
                  </ButtonLink>
                )}
              </div>
              {page.flashes.slice(0, 3).map((flash) => (
                <FlashItem key={flash.id} flash={flash} />
              ))}
            </div>

            {showDesk && (
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
            )}

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

          {showDesk && openDraft && (
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
  );
}
