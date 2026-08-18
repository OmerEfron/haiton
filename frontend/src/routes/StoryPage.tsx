import { Link, useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import styles from "./StoryPage.module.css";
import { PageHeader } from "../components/layout/PageHeader";
import { CrumbBar } from "../components/layout/SectionsBar";
import crumbStyles from "../components/layout/SectionsBar.module.css";
import { Footer } from "../components/layout/Footer";
import { ErrorState, Kicker, Loading, Placeholder } from "../components/ui/Bits";
import { getStory, listStories } from "../api/core/stories";
import { getProfile } from "../api/core/profile";
import { qk } from "../lib/queryKeys";
import { common } from "../copy/common";
import { desk } from "../copy/desk";

export function StoryPage() {
  const { storyId = "" } = useParams();
  const story = useQuery({ queryKey: qk.story(storyId), queryFn: () => getStory(storyId) });
  const profile = useQuery({ queryKey: qk.profile, queryFn: getProfile });
  const siblings = useQuery({
    queryKey: ["stories", story.data?.section],
    queryFn: () => listStories(story.data?.section),
    enabled: Boolean(story.data),
  });

  if (story.isPending) {
    return (
      <>
        <PageHeader />
        <Loading />
      </>
    );
  }
  if (story.error) {
    return (
      <>
        <PageHeader />
        <ErrorState error={story.error} />
        <Footer />
      </>
    );
  }

  const s = story.data;
  const showTag = profile.data?.settings.showEditionTag ?? true;
  const more = (siblings.data ?? []).filter((x) => x.id !== s.id).slice(0, 3);

  return (
    <>
      <PageHeader />
      <CrumbBar>
        <span style={{ fontWeight: 700 }}>{s.sectionName}</span>
        <span className={crumbStyles.sep}>›</span>
        <span className={crumbStyles.muted}>ידיעה {s.id}</span>
      </CrumbBar>

      <article className={styles.article}>
        <Kicker>{s.sectionName}</Kicker>
        <h1 className={styles.headline}>{s.headline}</h1>
        <p className={styles.standfirst}>{s.standfirst}</p>

        <div className={styles.byline}>
          <span className={styles.author}>{s.byline}</span>
          {showTag && (
            <>
              <span className={styles.bullet} />
              <span>{s.editionLabel}</span>
            </>
          )}
          <span className={styles.bullet} />
          <time>{s.publishedAt}</time>
          {s.angle && <span className={styles.angle}>זווית: {s.angle}</span>}
        </div>

        <Placeholder height={340} sub={common.placeholderSuffix} />
        <p className={styles.caption}>
          כתובית תמונה תופיע כאן — placeholder עד שתעלה תמונה אמיתית.
        </p>

        <div className={styles.body}>
          {s.body.map((block, i) =>
            block.kind === "quote" ? (
              <blockquote key={i} className={styles.quote}>
                {block.text}
              </blockquote>
            ) : (
              <p key={i}>
                {block.leadIn && <span className={styles.leadIn}>{block.leadIn} </span>}
                {block.text}
              </p>
            ),
          )}
        </div>

        {more.length > 0 && (
          <div className={styles.more}>
            <h3 className={styles.moreTitle}>{desk.moreIn(s.sectionName)}</h3>
            <div className={styles.moreLinks}>
              {more.map((item) => (
                <Link key={item.id} to={`/story/${item.id}`}>
                  {item.headline}
                </Link>
              ))}
            </div>
          </div>
        )}

        <p className={styles.back}>
          <Link to="/">{common.backHome}</Link>
        </p>
      </article>

      <Footer />
    </>
  );
}
