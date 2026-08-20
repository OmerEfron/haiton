import { Link } from "react-router";
import styles from "./News.module.css";
import type { Flash, Story } from "../../api/types";
import { displayPublishedAt, flashPath, storyPath } from "../../lib/format";
import { Kicker } from "../ui/Bits";
import { Tag } from "../ui/Chip";

/** Which edition published the story — shown when the tag setting is on. */
function EditionTag({ story, showTag }: { story: Story; showTag: boolean }) {
  if (!showTag) return null;
  const tag = <Tag>{story.ownEdition ? "המהדורה שלך" : story.editionLabel}</Tag>;
  if (story.ownEdition || !story.author?.id) return tag;
  return <Link to={`/u/${story.author.id}`}>{tag}</Link>;
}

function AuthorLabel({ story }: { story: Story }) {
  const label = story.byline;
  if (story.ownEdition || !story.author?.id) return <span>{label}</span>;
  return <Link to={`/u/${story.author.id}`}>{label}</Link>;
}

export function LeadStory({
  story,
  editionName,
  showTag,
}: {
  story: Story;
  editionName: string;
  showTag: boolean;
}) {
  return (
    <article>
      <div className={styles.leadMeta}>
        <Kicker>{story.sectionName}</Kicker>
        <span className={styles.bullet} />
        <span className={styles.editionName}>{editionName}</span>
      </div>
      <h2 className={styles.leadHeadline}>
        <Link to={storyPath(story)}>{story.headline}</Link>
      </h2>
      <hr className={styles.leadRule} aria-hidden />
      <p className={styles.leadStandfirst}>{story.standfirst}</p>
      <div className={styles.leadByline}>
        <time>{displayPublishedAt(story.publishedAt)}</time>
        <span className={styles.bullet} />
        <AuthorLabel story={story} />
        <EditionTag story={story} showTag={showTag} />
      </div>
    </article>
  );
}

export function StoryCard({ story, showTag }: { story: Story; showTag: boolean }) {
  return (
    <article className={styles.card}>
      <div className={styles.cardMeta}>
        <Kicker>{story.sectionName}</Kicker>
        <EditionTag story={story} showTag={showTag} />
      </div>
      <h3 className={styles.cardHeadline}>
        <Link to={storyPath(story)}>{story.headline}</Link>
      </h3>
      <time className={styles.cardTime}>{displayPublishedAt(story.publishedAt)}</time>
    </article>
  );
}

export function StoryListRow({ story, showTag }: { story: Story; showTag: boolean }) {
  return (
    <Link to={storyPath(story)} className={styles.listRow}>
      <span className={styles.listMeta}>
        {story.sectionName}
        {showTag ? ` · ${story.ownEdition ? "המהדורה שלך" : story.editionLabel}` : ""}
      </span>
      <span className={styles.listHeadline}>{story.headline}</span>
    </Link>
  );
}

/** The thumbnail rows of "עוד במהדורה" on mobile (1b). */
export function StoryThumbRow({ story, showTag }: { story: Story; showTag: boolean }) {
  return (
    <Link to={storyPath(story)} className={styles.thumbRow}>
      <span>
        <span className={styles.listMeta}>
          {story.sectionName}
          {showTag ? ` · ${story.ownEdition ? "המהדורה שלך" : story.editionLabel}` : ""}
        </span>
        <span className={styles.thumbHeadline}>{story.headline}</span>
      </span>
    </Link>
  );
}

export function FlashItem({ flash }: { flash: Flash }) {
  const to = flashPath(flash);
  return (
    <div className={styles.flashItem}>
      <span className={styles.flashTime}>{flash.time}</span>
      {to ? (
        <Link to={to} className={styles.flashText}>
          {flash.text}
        </Link>
      ) : (
        <span className={styles.flashText}>{flash.text}</span>
      )}
    </div>
  );
}
