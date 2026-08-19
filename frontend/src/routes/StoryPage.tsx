import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import styles from "./StoryPage.module.css";
import { PageHeader } from "../components/layout/PageHeader";
import { CrumbBar } from "../components/layout/SectionsBar";
import crumbStyles from "../components/layout/SectionsBar.module.css";
import { Footer } from "../components/layout/Footer";
import { ErrorState, Kicker, Loading } from "../components/ui/Bits";
import { Button } from "../components/ui/Button";
import { getStory, listStories } from "../api/core/stories";
import { getProfile } from "../api/core/profile";
import { qk } from "../lib/queryKeys";
import { brand, common } from "../copy/common";
import { desk } from "../copy/desk";

export function StoryPage() {
  const { storyId = "" } = useParams();
  const [copied, setCopied] = useState(false);
  const story = useQuery({ queryKey: qk.story(storyId), queryFn: () => getStory(storyId) });
  const profile = useQuery({ queryKey: qk.profile, queryFn: getProfile });
  const siblings = useQuery({
    queryKey: ["stories"],
    queryFn: () => listStories(),
    enabled: Boolean(story.data),
  });

  useEffect(() => {
    const headline = story.data?.headline;
    if (!headline) return;
    document.title = headline;
    return () => {
      document.title = brand.name;
    };
  }, [story.data?.headline]);

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
  const url = window.location.href;
  const waHref = `https://wa.me/?text=${encodeURIComponent(`${s.headline} ${url}`)}`;

  return (
    <>
      <PageHeader />
      <CrumbBar>
        <span style={{ fontWeight: 700 }}>ראשי</span>
        <span className={crumbStyles.sep}>›</span>
        <span className={crumbStyles.muted}>{s.headline}</span>
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
        </div>

        <div className={styles.share}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void navigator.clipboard.writeText(url).then(
                () => {
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 2000);
                },
                () => {
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 2000);
                },
              );
            }}
          >
            {copied ? "הועתק" : "העתקת קישור"}
          </Button>
          <a href={waHref} target="_blank" rel="noopener noreferrer">
            וואטסאפ
          </a>
        </div>

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
            <h3 className={styles.moreTitle}>{desk.moreInEdition}</h3>
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
