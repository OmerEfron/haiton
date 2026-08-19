import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import styles from "../../routes/ProfilePage.module.css";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { TextField } from "../ui/Field";
import type { Profile, User } from "../../api/types";
import { updateProfile } from "../../api/core/profile";
import { qk } from "../../lib/queryKeys";
import { common } from "../../copy/common";
import { profileCopy } from "../../copy/circle";

export function EditDetailsDialog({ user, onClose }: { user: User; onClose: () => void }) {
  const client = useQueryClient();
  const [name, setName] = useState(user.name);
  const [city, setCity] = useState(user.city ?? "");
  const [headline, setHeadline] = useState(user.headline ?? "");

  const save = useMutation({
    mutationFn: () => updateProfile({ name, city, headline }),
    onSuccess: async (profile: Profile) => {
      client.setQueryData(qk.profile, profile);
      await client.invalidateQueries({ queryKey: qk.profile });
      await client.invalidateQueries({ queryKey: qk.session });
      onClose();
    },
  });

  return (
    <Modal title={profileCopy.editDetails} onClose={onClose}>
      <form
        className={styles.dialogFields}
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <TextField
          label={profileCopy.fields.name}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <TextField
          label={profileCopy.fields.city}
          value={city}
          onChange={(e) => setCity(e.target.value)}
        />
        <TextField
          label={profileCopy.fields.headline}
          value={headline}
          onChange={(e) => setHeadline(e.target.value)}
        />
        <div className={styles.dialogActions}>
          <Button type="submit" size="xl" block disabled={save.isPending || !name.trim()}>
            {save.isPending ? "שומר…" : common.save}
          </Button>
          <Button variant="quiet" size="lg" onClick={onClose}>
            {common.cancel}
          </Button>
        </div>
        {save.error ? <p className={styles.dialogError}>{(save.error as Error).message}</p> : null}
      </form>
    </Modal>
  );
}
