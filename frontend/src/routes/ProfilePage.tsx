import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import styles from "./ProfilePage.module.css";
import { PageHeader } from "../components/layout/PageHeader";
import { Footer } from "../components/layout/Footer";
import { CirclePanel } from "../components/circle/CirclePanel";
import { EditDetailsDialog } from "../components/profile/EditDetailsDialog";
import { Avatar, ErrorState, Kicker, Loading, StatGrid, Toggle } from "../components/ui/Bits";
import { Button, ButtonLink } from "../components/ui/Button";
import type { Profile } from "../api/types";
import { getProfile, updateEditionSettings } from "../api/core/profile";
import { listInterviews } from "../api/core/desk";
import { listStories } from "../api/core/stories";
import { getSession } from "../api/reporter/interview";
import { qk } from "../lib/queryKeys";
import { storyPath } from "../lib/format";
import { useSession } from "../lib/session";
import { common } from "../copy/common";
import { profileCopy } from "../copy/circle";
import { desk } from "../copy/desk";

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleDateString("he-IL", { day: "numeric", month: "long" });
}

export function ProfilePage() {
  const client = useQueryClient();
  const navigate = useNavigate();
  const { signOut } = useSession();
  const [editOpen, setEditOpen] = useState(false);

  const profile = useQuery({ queryKey: qk.profile, queryFn: getProfile });
  const interview = useQuery({ queryKey: qk.interview, queryFn: getSession });
  const interviewsQuery = useQuery({ queryKey: qk.deskInterviews, queryFn: listInterviews });
  const storiesQuery = useQuery({ queryKey: ["stories"], queryFn: () => listStories() });

  const setSettings = useMutation({
    mutationFn: updateEditionSettings,
    onSuccess: (settings) => {
      client.setQueryData(qk.profile, (old?: Profile) =>
        old ? { ...old, settings } : old,
      );
      client.invalidateQueries({ queryKey: qk.frontPage });
    },
  });

  if (profile.isPending) {
    return (
      <>
        <PageHeader />
        <Loading />
      </>
    );
  }
  if (profile.error) {
    return (
      <>
        <PageHeader />
        <ErrorState error={profile.error} />
        <Footer />
      </>
    );
  }

  const p = profile.data;
  const draftStatus = interview.data?.draft.status;
  const draftsInProgress = draftStatus && draftStatus !== "empty" ? 1 : 0;

  const interviews = interviewsQuery.data ?? [];
  const interviewsMapped = interviews.map((item) => ({
    id: item.id,
    to: `/interview/${item.id}`,
    headline: item.headline || desk.archivedInterview,
    when: formatWhen(item.startedAt),
  }));
  const storiesMapped = (storiesQuery.data ?? []).map((item) => ({
    id: item.id,
    to: storyPath(item),
    headline: item.headline,
    when: formatWhen(item.publishedAt),
    hidden: item.hidden,
  }));
  const archiveItems = interviews.length ? interviewsMapped : storiesMapped;

  return (
    <>
      <PageHeader />
      <div className={styles.wrap}>
        <div>
          <div className={styles.identity}>
            <Avatar initial={p.user.initial} size={84} />
            <div style={{ flex: 1 }}>
              <Kicker>{profileCopy.kicker}</Kicker>
              <h1 className={styles.name}>{p.user.name}</h1>
              <p className={styles.meta}>
                {[p.user.age, p.user.city, p.user.headline, p.publishingSince]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              <div className={styles.identityActions}>
                <Button variant="outline" size="md" onClick={() => setEditOpen(true)}>
                  {profileCopy.editDetails}
                </Button>
                <ButtonLink to="/karteset" variant="quiet" size="md">
                  {profileCopy.updateKarteset}
                </ButtonLink>
              </div>
            </div>
          </div>

          <div className={styles.stats}>
            <StatGrid
              columns={4}
              items={[
                {
                  value: p.stats.storiesPublished,
                  label: profileCopy.stats.storiesPublished,
                  to: "/",
                },
                { value: p.stats.flashes, label: profileCopy.stats.flashes, to: "/briefs" },
                { value: p.stats.facts, label: profileCopy.stats.facts, to: "/karteset" },
                {
                  value: draftsInProgress,
                  label: profileCopy.stats.draftsInProgress,
                  to: "/interview",
                },
              ]}
            />
          </div>

          <section className={styles.block}>
            <h2 className={styles.blockTitle}>{profileCopy.editionSettings}</h2>
            <div className={styles.listBox}>
              <div className={`${styles.listRow} ${styles.settingRow}`}>
                <span>
                  <span className={styles.settingTitle}>
                    {profileCopy.settings.editionName.title}
                  </span>
                  <span className={styles.settingDetail}>
                    {profileCopy.settings.editionName.detail}
                  </span>
                </span>
                <EditionNameInput
                  value={p.settings.editionName}
                  onSave={(editionName) => setSettings.mutate({ editionName })}
                />
              </div>

              <div className={`${styles.listRow} ${styles.settingRow}`}>
                <span>
                  <span className={styles.settingTitle}>
                    {profileCopy.settings.editionTag.title}
                  </span>
                  <span className={styles.settingDetail}>
                    {profileCopy.settings.editionTag.detail}
                  </span>
                </span>
                <Toggle
                  label={profileCopy.settings.editionTag.title}
                  checked={p.settings.showEditionTag}
                  onChange={(next) => setSettings.mutate({ showEditionTag: next })}
                />
              </div>

              <div className={`${styles.listRow} ${styles.settingRow}`}>
                <span>
                  <span className={styles.settingTitle}>
                    {profileCopy.settings.reminder.title}
                  </span>
                  <span className={styles.settingDetail}>
                    {profileCopy.settings.reminder.detail}
                  </span>
                </span>
                <Toggle
                  label={profileCopy.settings.reminder.title}
                  checked={Boolean(p.settings.interviewReminderAt)}
                  onChange={(next) =>
                    setSettings.mutate({ interviewReminderAt: next ? "21:00" : null })
                  }
                />
              </div>
            </div>

            <p className={styles.signOut}>
              <Button
                variant="link"
                size="md"
                onClick={async () => {
                  await signOut();
                  navigate("/login");
                }}
              >
                {common.signOut}
              </Button>
            </p>
          </section>
        </div>

        <aside>
          <CirclePanel inviteToken={p.inviteToken} />

          <div className={styles.archive}>
            <p className={styles.archiveKicker}>{profileCopy.archive}</p>
            <p className={styles.archiveIntro}>{profileCopy.archiveIntro}</p>
            {archiveItems.length === 0 && (
              <p className={styles.archiveIntro}>{profileCopy.archiveEmpty}</p>
            )}
            <div className={styles.archiveList}>
              {archiveItems.map((item) => (
                <Link key={item.id} to={item.to} className={styles.archiveItem}>
                  <span className={styles.archiveHeadline}>
                    {item.headline}
                    {"hidden" in item && item.hidden ? ` · ${desk.hidden}` : ""}
                  </span>
                  <span className={styles.archiveWhen}>{item.when}</span>
                </Link>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {editOpen && <EditDetailsDialog user={p.user} onClose={() => setEditOpen(false)} />}
      <Footer />
    </>
  );
}

function EditionNameInput({
  value,
  onSave,
}: {
  value: string;
  onSave: (editionName: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  return (
    <input
      className={styles.settingInput}
      aria-label={profileCopy.settings.editionName.title}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        const next = draft.trim();
        if (!next) {
          setDraft(value);
          return;
        }
        if (next !== value) onSave(next);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
    />
  );
}
