import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import styles from "./CirclePage.module.css";
import { PageHeader } from "../components/layout/PageHeader";
import { Footer } from "../components/layout/Footer";
import { AddConnectionDialog } from "../components/circle/AddConnectionDialog";
import { EditConnectionDialog } from "../components/circle/EditConnectionDialog";
import { Avatar, ErrorState, Kicker, Loading, StatGrid } from "../components/ui/Bits";
import { Button } from "../components/ui/Button";
import { Chip, ChipRow } from "../components/ui/Chip";
import { EmptyState } from "../components/ui/EmptyState";
import type { Connection, RelationKind } from "../api/types";
import {
  cancelInvitation,
  getCircleSummary,
  listConnections,
  listInvitations,
  listSuggestedConnections,
  removeConnection,
  respondToInvitation,
} from "../api/core/connections";
import { qk } from "../lib/queryKeys";
import { common } from "../copy/common";
import { circle } from "../copy/circle";

type Filter = "all" | RelationKind | "pending";

export function CirclePage() {
  const client = useQueryClient();
  const [filter, setFilter] = useState<Filter>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Connection | null>(null);

  const connections = useQuery({ queryKey: qk.connections, queryFn: listConnections });
  const invitations = useQuery({ queryKey: qk.invitations, queryFn: listInvitations });
  const summary = useQuery({ queryKey: qk.circleSummary, queryFn: getCircleSummary });
  const suggested = useQuery({
    queryKey: qk.suggestedConnections,
    queryFn: listSuggestedConnections,
  });

  const refresh = async () => {
    await client.invalidateQueries({ queryKey: qk.connections });
    await client.invalidateQueries({ queryKey: qk.invitations });
    await client.invalidateQueries({ queryKey: qk.circleSummary });
  };

  const respond = useMutation({
    mutationFn: (input: { id: string; accept: boolean }) => respondToInvitation(input),
    onSuccess: refresh,
  });
  const cancel = useMutation({ mutationFn: cancelInvitation, onSuccess: refresh });
  const drop = useMutation({ mutationFn: removeConnection, onSuccess: refresh });

  if (connections.isPending) {
    return (
      <>
        <PageHeader />
        <Loading />
      </>
    );
  }
  if (connections.error) {
    return (
      <>
        <PageHeader />
        <ErrorState error={connections.error} />
        <Footer />
      </>
    );
  }

  const all = connections.data;
  const pending = invitations.data ?? [];
  const empty = all.length === 0;
  const visible =
    filter === "all" || filter === "pending" ? all : all.filter((c) => c.relation === filter);

  const relationFilters: RelationKind[] = ["family", "friend", "work"];

  return (
    <>
      <PageHeader />

      {/* Mobile header from 2c */}
      <div className={styles.mobileHead}>
        <span className={styles.mobileTitle}>{circle.title}</span>
        <Button size="md" onClick={() => setDialogOpen(true)}>
          {circle.addShort}
        </Button>
      </div>

      {empty ? (
        <>
          <EmptyState
            mark="+"
            title={circle.emptyTitle}
            body={circle.emptyBody}
            compact
            actions={
              <>
                <Button size="lg" block onClick={() => setDialogOpen(true)}>
                  {circle.emptyCta}
                </Button>
                <Button variant="link" size="md">
                  {circle.shareLink}
                </Button>
              </>
            }
          />
          <div className={styles.suggested}>
            <p className={styles.suggestedTitle}>{circle.suggestedTitle}</p>
            <div className={styles.suggestedList}>
              {(suggested.data ?? []).map((s) => (
                <div key={s.id} className={styles.suggestedRow}>
                  <Avatar initial={s.initial} size={32} />
                  <span className={styles.suggestedName}>
                    {s.name} — {s.detail}
                  </span>
                  <Button variant="link" size="sm" onClick={() => setDialogOpen(true)}>
                    {circle.invite}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className={styles.wrap}>
          <div className={styles.head}>
            <div>
              <Kicker>{circle.kicker}</Kicker>
              <h1 className={styles.title}>{circle.title}</h1>
              <p className={styles.intro}>{circle.intro}</p>
            </div>
            <div className={styles.headActions}>
              <Button size="lg" onClick={() => setDialogOpen(true)}>
                {circle.add}
              </Button>
              <Button variant="quiet" size="lg">
                {circle.sentInvitations}
              </Button>
            </div>
          </div>

          <div className={styles.stats}>
            <StatGrid
              columns={3}
              items={[
                { value: summary.data?.connections ?? all.length, label: circle.stats.connections },
                { value: summary.data?.pending ?? pending.length, label: circle.stats.pending },
                { value: summary.data?.updatedThisWeek ?? 0, label: circle.stats.updated },
              ]}
            />
          </div>

          <div className={styles.filters}>
            <ChipRow scroll>
              <Chip active={filter === "all"} count={all.length} onClick={() => setFilter("all")}>
                {circle.all}
              </Chip>
              {relationFilters.map((r) => (
                <Chip
                  key={r}
                  active={filter === r}
                  count={all.filter((c) => c.relation === r).length}
                  onClick={() => setFilter(r)}
                >
                  {circle.relations[r]}
                </Chip>
              ))}
              <Chip
                active={filter === "pending"}
                flagged
                count={pending.length}
                onClick={() => setFilter("pending")}
              >
                {circle.pendingFilter}
              </Chip>
            </ChipRow>
          </div>

          {filter !== "pending" && (
            <div className={styles.table}>
              <div className={styles.thead}>
                <span>{circle.columns.who}</span>
                <span>{circle.columns.relation}</span>
                <span>{circle.columns.actions}</span>
              </div>
              {visible.map((c, i) => (
                <div
                  key={c.id}
                  className={`${styles.row} ${i % 3 === 2 ? styles.rowTint : ""}`}
                >
                  <span className={styles.who}>
                    <Avatar initial={c.initial} size={38} tone={i % 3 === 2 ? "onTint" : "default"} />
                    <span>
                      <span className={styles.name}>{c.name}</span>
                      <span className={styles.detail}>
                        {[c.relationLabel, `${c.storyCount} ידיעות`, c.lastPublished]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </span>
                  </span>
                  <span className={styles.relation}>{c.relationLabel}</span>
                  <span className={styles.actions}>
                    <Button variant="quiet" size="sm" onClick={() => setEditing(c)}>
                      {common.edit}
                    </Button>
                    <Button variant="quiet" size="sm" onClick={() => drop.mutate(c.id)}>
                      {common.remove}
                    </Button>
                  </span>
                </div>
              ))}
            </div>
          )}

          {pending.length > 0 && (
            <div className={styles.pending}>
              <h2 className={styles.pendingTitle}>{circle.pendingTitle}</h2>
              <div className={styles.pendingBox}>
                {pending.map((inv) => (
                  <div key={inv.id} className={styles.pendingRow}>
                    <Avatar initial={inv.initial} size={34} />
                    <span style={{ flex: 1 }}>
                      <span className={styles.name}>
                        {inv.direction === "incoming"
                          ? `${inv.name} מבקשת להיכנס למעגל שלך`
                          : inv.name}
                      </span>
                      <span className={styles.detail}>{inv.detail}</span>
                    </span>
                    <span className={styles.pendingActions}>
                      {inv.direction === "incoming" ? (
                        <>
                          <Button
                            size="md"
                            onClick={() => respond.mutate({ id: inv.id, accept: true })}
                            disabled={respond.isPending}
                          >
                            {common.approve}
                          </Button>
                          <Button
                            variant="quiet"
                            size="md"
                            onClick={() => respond.mutate({ id: inv.id, accept: false })}
                            disabled={respond.isPending}
                          >
                            {common.reject}
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button variant="quiet" size="md">
                            {circle.resend}
                          </Button>
                          <Button
                            variant="quiet"
                            size="md"
                            onClick={() => cancel.mutate(inv.id)}
                            disabled={cancel.isPending}
                          >
                            {common.cancel}
                          </Button>
                        </>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Mobile: the stacked rows of 2c */}
          {pending
            .filter((inv) => inv.direction === "incoming")
            .map((inv) => (
              <div key={inv.id} className={styles.mobileRequest}>
                <div className={styles.mobileRequestBox}>
                  <p className={styles.mobileRequestKicker}>{circle.newRequest}</p>
                  <p className={styles.mobileRequestBody}>{circle.requestBody(inv.name)}</p>
                  <div className={styles.mobileRequestActions}>
                    <Button
                      size="lg"
                      block
                      onClick={() => respond.mutate({ id: inv.id, accept: true })}
                    >
                      {common.approve}
                    </Button>
                    <Button
                      variant="quiet"
                      size="lg"
                      block
                      onClick={() => respond.mutate({ id: inv.id, accept: false })}
                    >
                      {common.reject}
                    </Button>
                  </div>
                </div>
              </div>
            ))}

          {visible.map((c) => (
            <div key={`m-${c.id}`} className={styles.mobileRow}>
              <Avatar initial={c.initial} size={40} />
              <span style={{ flex: 1 }}>
                <span className={styles.name}>{c.name}</span>
                <span className={styles.detail}>
                  {c.relationLabel} · {c.storyCount} ידיעות במהדורה שלו
                </span>
              </span>
              <Button variant="link" size="sm" onClick={() => setEditing(c)}>
                {circle.manage}
              </Button>
            </div>
          ))}
        </div>
      )}

      {dialogOpen && <AddConnectionDialog onClose={() => setDialogOpen(false)} />}
      {editing && (
        <EditConnectionDialog connection={editing} onClose={() => setEditing(null)} />
      )}
      <Footer />
    </>
  );
}
