import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import styles from "../../routes/ProfilePage.module.css";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Chip, ChipRow } from "../ui/Chip";
import type { Connection, RelationKind } from "../../api/types";
import { updateConnection } from "../../api/core/connections";
import { qk } from "../../lib/queryKeys";
import { circle } from "../../copy/circle";
import { common } from "../../copy/common";

const RELATIONS: RelationKind[] = ["friend", "family", "work", "neighbour", "other"];

export function EditConnectionDialog({
  connection,
  onClose,
}: {
  connection: Connection;
  onClose: () => void;
}) {
  const client = useQueryClient();
  const [relation, setRelation] = useState<RelationKind>(connection.relation);

  const save = useMutation({
    mutationFn: () => updateConnection({ id: connection.id, relation }),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: qk.connections });
      onClose();
    },
  });

  return (
    <Modal title={`${circle.manage} — ${connection.name}`} onClose={onClose}>
      <div className={styles.group}>
        <span className={styles.groupLabel}>{circle.dialog.relationLabel}</span>
        <ChipRow>
          {RELATIONS.map((r) => (
            <Chip key={r} active={relation === r} onClick={() => setRelation(r)}>
              {circle.relations[r]}
            </Chip>
          ))}
        </ChipRow>
      </div>

      <div className={styles.dialogActions}>
        <Button size="xl" block onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? "שומר…" : common.save}
        </Button>
        <Button variant="quiet" size="lg" onClick={onClose}>
          {common.cancel}
        </Button>
      </div>
      {save.error ? (
        <p className={styles.dialogError}>{(save.error as Error).message}</p>
      ) : null}
    </Modal>
  );
}
