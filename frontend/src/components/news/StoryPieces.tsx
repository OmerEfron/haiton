import { Link } from "react-router";
import styles from "./News.module.css";
import type { Flash, Story } from "../../api/types";
import { Kicker, Placeholder } from "../ui/Bits";
import { Tag } from "../ui/Chip";

/** Which edition published the story — shown when the tag setting is on. */
function EditionTag({ story, showTag }: { story: Story; showTag: boolean }) {
  if (!showTag) return null;
  return <Tag>{story.ownEdition ? "המהדורה שלך" : story.editionLabel}</Tag>;
}

export function LeadStory({
  story,
  editionName,
  showTag,
  imageHeight = 300,
}: {
  story: Story;
  editionName: string;
  showTag: boolean;
  imageHeight?: number;
}) {
  return (
    <article>
      <div className={styles.leadMeta}>
        <Kicker>{story.sectionName}</Kicker>
        <span className={styles.bullet} />
        <span className={styles.editionName}>{editionName}</span>
      </div>
      <h2 className={styles.leadHeadline}>
        <Link to={`/story/${story.id}`}>{story.headline}</Link>
      </h2>
      <p className={styles.leadStandfirst}>{story.standfirst}</p>
      <div className={styles.leadImage}>
        <Placeholder height={imageHeight} sub={story.imageCaption} />
      </div>
      <div className={styles.leadByline}>
        <time>{story.publishedAt}</time>
        <span className={styles.bullet} />
        <span>{story.byline}</span>
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
        <Link to={`/story/${story.id}`}>{story.headline}</Link>
      </h3>
      <Placeholder height={110} />
      <time className={styles.cardTime}>{story.publishedAt}</time>
    </article>
  );
}

export function StoryListRow({ story, showTag }: { story: Story; showTag: boolean }) {
  return (
    <Link to={`/story/${story.id}`} className={styles.listRow}>
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
    <Link to={`/story/${story.id}`} className={styles.thumbRow}>
      <span className={styles.thumb} />
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
  return (
    <div className={styles.flashItem}>
      <span className={styles.flashTime}>{flash.time}</span>
      {flash.storyId ? (
        <Link to={`/story/${flash.storyId}`} className={styles.flashText}>
          {flash.text}
        </Link>
      ) : (
        <span className={styles.flashText}>{flash.text}</span>
      )}
    </div>
  );
}

export function DigestColumn({
  name,
  items,
}: {
  name: string;
  items: { id: string; headline: string }[];
}) {
  return (
    <div>
      <h4 className={styles.digestTitle}>{name}</h4>
      <div className={styles.digestLinks}>
        {items.map((item, i) => (
          <Link key={`${item.id}-${i}`} to={`/story/${item.id}`}>
            {item.headline}
          </Link>
        ))}
      </div>
    </div>
  );
}
