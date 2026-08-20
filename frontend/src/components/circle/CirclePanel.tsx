import { useState } from "react";
import { Link } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import styles from "../../routes/ProfilePage.module.css";
import { EditConnectionDialog } from "./EditConnectionDialog";
import { Avatar } from "../ui/Bits";
import { Button } from "../ui/Button";
import type { Connection } from "../../api/types";
import { listConnections, listInvitations, removeConnection, respondToInvitation } from "../../api/core/connections";
import { qk } from "../../lib/queryKeys";
import { circle } from "../../copy/circle";
import { common } from "../../copy/common";

export function CirclePanel({ inviteToken }: { inviteToken?: string }) {
  const client = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState<Connection | null>(null);

  const connections = useQuery({ queryKey: qk.connections, queryFn: listConnections });
  const invitations = useQuery({ queryKey: qk.invitations, queryFn: listInvitations });

  const refresh = async () => {
    await client.invalidateQueries({ queryKey: qk.connections });
    await client.invalidateQueries({ queryKey: qk.invitations });
    await client.invalidateQueries({ queryKey: qk.frontPage });
  };

  const respond = useMutation({
    mutationFn: (input: { id: string; accept: boolean }) => respondToInvitation(input),
    onSuccess: refresh,
  });
  const drop = useMutation({ mutationFn: removeConnection, onSuccess: refresh });

  const people = connections.data ?? [];
  const pending = (invitations.data ?? []).filter((i) => i.direction !== "outgoing");

  const copyInvite = () => {
    if (!inviteToken) return;
    const url = `${window.location.origin}/join/${inviteToken}`;
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
  };

  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <div>
          <p className={styles.cardTitle}>{circle.cardTitle}</p>
          <p className={styles.cardSub}>{circle.cardCount(people.length, pending.length)}</p>
        </div>
      </div>

      {inviteToken ? (
        <Button variant="outline" size="md" onClick={copyInvite}>
          {copied ? circle.copied : circle.copyInvite}
        </Button>
      ) : null}

      {pending.length > 0 && (
        <div className={styles.pendingList}>
          <p className={styles.pendingTitle}>{circle.pendingTitle}</p>
          {pending.map((inv) => (
            <div key={inv.id} className={styles.pendingItem}>
              <Avatar initial={inv.initial} size={34} />
              <span style={{ flex: 1 }}>
                <span className={styles.personName}>{inv.name}</span>
                <span className={styles.personMeta}>{inv.detail || circle.requestBody(inv.name)}</span>
              </span>
              <span className={styles.personActions}>
                <Button
                  size="sm"
                  onClick={() => respond.mutate({ id: inv.id, accept: true })}
                  disabled={respond.isPending}
                >
                  {common.approve}
                </Button>
                <Button
                  variant="quiet"
                  size="sm"
                  onClick={() => respond.mutate({ id: inv.id, accept: false })}
                  disabled={respond.isPending}
                >
                  {common.reject}
                </Button>
              </span>
            </div>
          ))}
        </div>
      )}

      <div className={styles.people}>
        {people.length === 0 && pending.length === 0 ? (
          <p className={styles.cardSub}>{circle.emptyPeople}</p>
        ) : (
          people.map((person) => (
            <div key={person.id} className={styles.person}>
              <Avatar initial={person.initial} size={34} />
              <span style={{ flex: 1 }}>
                <Link to={`/u/${person.connectedUserId}`} className={styles.personName}>
                  {person.name}
                </Link>
                <span className={styles.personMeta}>
                  {person.relationLabel || circle.relations[person.relation]}
                  {person.storyCount ? ` · ${person.storyCount} ידיעות` : ""}
                </span>
              </span>
              <span className={styles.personActions}>
                <Button variant="quiet" size="sm" onClick={() => setEditing(person)}>
                  {common.edit}
                </Button>
                <Button variant="quiet" size="sm" onClick={() => drop.mutate(person.id)}>
                  {common.remove}
                </Button>
              </span>
            </div>
          ))
        )}
      </div>

      {editing && <EditConnectionDialog connection={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
