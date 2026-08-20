import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import styles from "./StoryPage.module.css";
import { PageHeader } from "../components/layout/PageHeader";
import { CrumbBar } from "../components/layout/SectionsBar";
import crumbStyles from "../components/layout/SectionsBar.module.css";
import { Footer } from "../components/layout/Footer";
import { ErrorState, Kicker, Loading } from "../components/ui/Bits";
import { Button, ButtonAnchor, ButtonLink } from "../components/ui/Button";
import type { SharedStory, Story } from "../api/types";
import { getSharedStory, getStory, listStories } from "../api/core/stories";
import { joinInvitation, respondToInvitation } from "../api/core/connections";
import { getProfile } from "../api/core/profile";
import { qk } from "../lib/queryKeys";
import { storyPath, storyShareUrl, displayPublishedAt } from "../lib/format";
import { useSession } from "../lib/session";
import { brand, common } from "../copy/common";
import { circle } from "../copy/circle";
import { desk } from "../copy/desk";
import { StoryOwnerBar } from "../components/news/StoryOwnerBar";

export function StoryPage() {
  const { token = "", storyId = "" } = useParams();
  const location = useLocation();
  const { session } = useSession();
  const client = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);

  const shared = useQuery({
    queryKey: qk.sharedStory(token),
    queryFn: () => getSharedStory(token),
    enabled: Boolean(token),
  });
  const own = useQuery({
    queryKey: qk.story(storyId),
    queryFn: () => getStory(storyId),
    enabled: Boolean(storyId),
  });
  const storyQuery = token ? shared : own;
  const story = storyQuery.data;
  const profile = useQuery({ queryKey: qk.profile, queryFn: getProfile, enabled: Boolean(session) });
  const siblings = useQuery({
    queryKey: ["stories"],
    queryFn: () => listStories(),
    enabled: Boolean(story && session && !story.gated),
  });
  const refreshShare = async () => {
    await client.invalidateQueries({ queryKey: qk.sharedStory(token) });
    await client.invalidateQueries({ queryKey: qk.invitations });
    await client.invalidateQueries({ queryKey: qk.connections });
  };

  const join = useMutation({
    mutationFn: () => joinInvitation(token),
    onSuccess: refreshShare,
  });
  const respond = useMutation({
    mutationFn: (input: { id: string; accept: boolean }) => respondToInvitation(input),
    onSuccess: refreshShare,
  });

  useEffect(() => {
    const headline = story?.headline;
    if (!headline) return;
    document.title = headline;
    return () => {
      document.title = brand.name;
    };
  }, [story?.headline]);

  if (storyQuery.isPending) {
    return (
      <>
        <PageHeader />
        <Loading />
      </>
    );
  }
  if (storyQuery.error) {
    return (
      <>
        <PageHeader />
        <ErrorState error={storyQuery.error} />
        <Footer />
      </>
    );
  }

  const s = story as Story;
  const sharedStory = token ? (shared.data as SharedStory) : undefined;
  const gated = Boolean(sharedStory?.gated);
  const pendingId = sharedStory?.pending ? sharedStory.invitationId : undefined;
  const showTag = profile.data?.settings.showEditionTag ?? true;
  const more = (siblings.data ?? []).filter((x) => x.id !== s.id).slice(0, 3);
  const url = storyShareUrl(s);
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
        {!editing && <h1 className={styles.headline}>{s.headline}</h1>}
        {!editing && <p className={styles.standfirst}>{s.standfirst}</p>}

        <div className={styles.byline}>
          {s.author?.id ? (
            <Link to={`/u/${s.author.id}`} className={styles.author}>
              {s.byline}
            </Link>
          ) : (
            <span className={styles.author}>{s.byline}</span>
          )}
          {showTag && (
            <>
              <span className={styles.bullet} />
              <span>{s.editionLabel}</span>
            </>
          )}
          <span className={styles.bullet} />
          <time>{displayPublishedAt(s.publishedAt)}</time>
        </div>

        {!gated && <StoryOwnerBar story={s} editing={editing} onEditing={setEditing} />}

        <div className={styles.share}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setCopied(true);
              window.setTimeout(() => setCopied(false), 2000);
              void navigator.clipboard.writeText(url);
            }}
          >
            {copied ? circle.copied : "העתקת קישור"}
          </Button>
          <ButtonAnchor
            href={waHref}
            variant="outline"
            size="sm"
            target="_blank"
            rel="noopener noreferrer"
          >
            וואטסאפ
          </ButtonAnchor>
        </div>

        {!editing && (
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
        )}

        {gated && (
          <div className={styles.gate}>
            {!session ? (
              <>
                <p className={styles.gateBody}>{circle.gateGuest}</p>
                <ButtonLink to="/login" state={{ from: location.pathname }} size="lg">
                  {circle.loginCta}
                </ButtonLink>
              </>
            ) : pendingId ? (
              <>
                <p className={styles.gateBody}>{circle.gateApprove}</p>
                <div className={styles.gateActions}>
                  <Button
                    size="lg"
                    onClick={() => respond.mutate({ id: pendingId, accept: true })}
                    disabled={respond.isPending}
                  >
                    {common.approve}
                  </Button>
                  <Button
                    variant="quiet"
                    size="lg"
                    onClick={() => respond.mutate({ id: pendingId, accept: false })}
                    disabled={respond.isPending}
                  >
                    {common.reject}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className={styles.gateBody}>{circle.gateJoin}</p>
                <Button size="lg" onClick={() => join.mutate()} disabled={join.isPending}>
                  {join.isPending ? circle.joining : circle.invite}
                </Button>
                {join.error ? <p className={styles.gateError}>{(join.error as Error).message}</p> : null}
              </>
            )}
          </div>
        )}

        {more.length > 0 && (
          <div className={styles.more}>
            <h3 className={styles.moreTitle}>{desk.moreInEdition}</h3>
            <div className={styles.moreLinks}>
              {more.map((item) => (
                <Link key={item.id} to={storyPath(item)}>
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
