import { useState } from "react";
import { useNavigate } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import styles from "./ProfilePage.module.css";
import { PageHeader } from "../components/layout/PageHeader";
import { Footer } from "../components/layout/Footer";
import { AddConnectionDialog } from "../components/circle/AddConnectionDialog";
import { Avatar, ErrorState, Kicker, Loading, StatGrid, Toggle } from "../components/ui/Bits";
import { Button, ButtonLink } from "../components/ui/Button";
import { Chip, ChipRow } from "../components/ui/Chip";
import type { Profile } from "../api/types";
import { getProfile, updateEditionSettings } from "../api/core/profile";
import { getCircleSummary, listConnections } from "../api/core/connections";
import { qk } from "../lib/queryKeys";
import { useSession } from "../lib/session";
import { common } from "../copy/common";
import { circle, profileCopy } from "../copy/circle";

export function ProfilePage() {
  const client = useQueryClient();
  const navigate = useNavigate();
  const { signOut } = useSession();
  const [dialogOpen, setDialogOpen] = useState(false);

  const profile = useQuery({ queryKey: qk.profile, queryFn: getProfile });
  const connections = useQuery({ queryKey: qk.connections, queryFn: listConnections });
  const summary = useQuery({ queryKey: qk.circleSummary, queryFn: getCircleSummary });

  // Write the response straight into the cache: a settings toggle should not
  // wait out a second round trip just to show its own new state.
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
  const people = (connections.data ?? []).filter((c) => c.status === "connected");

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
                <Button variant="outline" size="md">
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
                { value: p.stats.storiesPublished, label: profileCopy.stats.storiesPublished },
                { value: p.stats.flashes, label: profileCopy.stats.flashes },
                { value: p.stats.facts, label: profileCopy.stats.facts },
                { value: p.stats.draftsInProgress, label: profileCopy.stats.draftsInProgress },
              ]}
            />
          </div>

          <section className={styles.block}>
            <h2 className={styles.blockTitle}>{profileCopy.mySections}</h2>
            <div className={styles.listBox}>
              {p.sectionCounts.map((row) => (
                <div key={row.label} className={styles.listRow}>
                  <span className={styles.listLabel}>{row.label}</span>
                  <span className={styles.listValue}>{row.detail}</span>
                </div>
              ))}
            </div>
          </section>

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
                <span className={styles.settingValue}>{p.settings.editionName}</span>
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
                  <span className={styles.settingTitle}>{profileCopy.settings.reminder.title}</span>
                  <span className={styles.settingDetail}>
                    {profileCopy.settings.reminder.detail}
                  </span>
                </span>
                <button
                  type="button"
                  className={`${styles.settingValue} ${styles.settingValueMuted}`}
                  onClick={() =>
                    setSettings.mutate({
                      interviewReminderAt: p.settings.interviewReminderAt ? null : "21:00",
                    })
                  }
                >
                  {profileCopy.reminderValue(p.settings.interviewReminderAt)}
                </button>
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
          {/* Circle card, refined per mockup 2d. */}
          <div className={styles.card}>
            <div className={styles.cardHead}>
              <div>
                <p className={styles.cardTitle}>{circle.cardTitle}</p>
                <p className={styles.cardSub}>
                  {circle.cardCount(
                    summary.data?.connections ?? people.length,
                    summary.data?.pending ?? 0,
                  )}
                </p>
              </div>
              <ButtonLink to="/circle" variant="outline" size="md">
                {circle.manageCircle}
              </ButtonLink>
            </div>

            <div className={styles.people}>
              {people.slice(0, 3).map((person) => (
                <div key={person.id} className={styles.person}>
                  <Avatar initial={person.initial} size={34} />
                  <span style={{ flex: 1 }}>
                    <span className={styles.personName}>{person.name}</span>
                    <span className={styles.personMeta}>
                      {person.relationLabel} · {person.sectionName} · {person.storyCount} ידיעות
                    </span>
                  </span>
                </div>
              ))}
            </div>

            <div className={styles.chipsRow}>
              {people.slice(0, 3).map((person) => (
                <span key={`chip-${person.id}`} className={styles.personChip}>
                  <Avatar initial={person.initial} size={28} />
                  {person.name.split(" ")[0]}
                </span>
              ))}
              <button
                type="button"
                className={styles.addChip}
                onClick={() => setDialogOpen(true)}
              >
                {circle.addShort}
              </button>
            </div>
          </div>

          <div className={styles.archive}>
            <p className={styles.archiveKicker}>{profileCopy.archive}</p>
            <p className={styles.archiveIntro}>{profileCopy.archiveIntro}</p>
            <ChipRow>
              {p.archive.map((month) => (
                <Chip key={month}>{month}</Chip>
              ))}
            </ChipRow>
          </div>
        </aside>
      </div>

      {dialogOpen && <AddConnectionDialog onClose={() => setDialogOpen(false)} />}
      <Footer />
    </>
  );
}
