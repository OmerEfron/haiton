import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import styles from "../../routes/CirclePage.module.css";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Chip, ChipRow } from "../ui/Chip";
import { Toggle } from "../ui/Bits";
import type { Connection, RelationKind, SectionId } from "../../api/types";
import { updateConnection } from "../../api/core/connections";
import { qk } from "../../lib/queryKeys";
import { circle } from "../../copy/circle";
import { common, sectionNames } from "../../copy/common";

const RELATIONS: RelationKind[] = ["friend", "family", "work", "neighbour", "other"];
const SECTIONS: SectionId[] = ["friends", "family", "moments", "celebrations"];

export function EditConnectionDialog({
  connection,
  onClose,
}: {
  connection: Connection;
  onClose: () => void;
}) {
  const client = useQueryClient();

  const [relation, setRelation] = useState<RelationKind>(connection.relation);
  const [section, setSection] = useState<SectionId>(connection.section);
  const [settings, setSettings] = useState<Connection["settings"]>(connection.settings);

  const save = useMutation({
    mutationFn: () =>
      updateConnection({
        id: connection.id,
        relation,
        section,
        settings,
      }),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: qk.connections });
      await client.invalidateQueries({ queryKey: qk.circleSummary });
      onClose();
    },
  });

  const settingRows = [
    { key: "seesMyEdition", copy: circle.dialog.settings.seesMyEdition },
    { key: "showsFullName", copy: circle.dialog.settings.showsFullName },
    { key: "notifyOnPublish", copy: circle.dialog.settings.notifyOnPublish },
  ] as const;

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

        <span className={`${styles.groupLabel} ${styles.groupLabelSpaced}`}>
          {circle.dialog.sectionLabel}
        </span>
        <ChipRow>
          {SECTIONS.map((s) => (
            <Chip key={s} active={section === s} onClick={() => setSection(s)}>
              {sectionNames[s]}
            </Chip>
          ))}
        </ChipRow>

        <p className={styles.settingsLabel}>{circle.dialog.settingsTitle}</p>
        <div className={styles.settingsBox}>
          {settingRows.map((row) => (
            <div key={row.key} className={styles.settingRow}>
              <span>
                <span className={styles.settingTitle}>{row.copy.title}</span>
                <span className={styles.settingDetail}>{row.copy.detail}</span>
              </span>
              <Toggle
                label={row.copy.title}
                checked={settings[row.key]}
                onChange={(next) => setSettings((prev) => ({ ...prev, [row.key]: next }))}
              />
            </div>
          ))}
        </div>
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
