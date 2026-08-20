import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import styles from "../../routes/StoryPage.module.css";
import { Button } from "../ui/Button";
import { TextArea, TextField } from "../ui/Field";
import type { Story, StoryBlock } from "../../api/types";
import { deleteStory, updateStory } from "../../api/core/stories";
import { qk } from "../../lib/queryKeys";
import { useSession } from "../../lib/session";
import { common } from "../../copy/common";
import { desk } from "../../copy/desk";

function bodyText(body: StoryBlock[]): string {
  return body.map((block) => block.text).join("\n\n");
}

function parseBody(text: string): string[] {
  return text
    .split(/\n\n+/)
    .map((block) => block.trim())
    .filter(Boolean);
}

export function StoryOwnerBar({
  story,
  editing,
  onEditing,
}: {
  story: Story;
  editing: boolean;
  onEditing: (next: boolean) => void;
}) {
  const { session } = useSession();
  const navigate = useNavigate();
  const client = useQueryClient();
  const [headline, setHeadline] = useState(story.headline);
  const [standfirst, setStandfirst] = useState(story.standfirst);
  const [body, setBody] = useState(bodyText(story.body));
  const owner = Boolean(session && session.user.id === story.author.id);

  const refresh = async () => {
    await client.invalidateQueries({ queryKey: qk.story(story.id) });
    await client.invalidateQueries({ queryKey: qk.sharedStory(story.shareToken) });
    await client.invalidateQueries({ queryKey: qk.frontPage });
    await client.invalidateQueries({ queryKey: ["stories"] });
    await client.invalidateQueries({ queryKey: qk.profile });
    await client.invalidateQueries({ queryKey: qk.flashes });
  };

  const save = useMutation({
    mutationFn: () =>
      updateStory(story.id, {
        headline: headline.trim(),
        standfirst: standfirst.trim(),
        body: parseBody(body),
      }),
    onSuccess: async () => {
      onEditing(false);
      await refresh();
    },
  });
  const hide = useMutation({
    mutationFn: () => updateStory(story.id, { hidden: !story.hidden }),
    onSuccess: refresh,
  });
  const drop = useMutation({
    mutationFn: () => deleteStory(story.id),
    onSuccess: async () => {
      await refresh();
      navigate("/");
    },
  });

  if (!owner) return null;

  function beginEdit() {
    setHeadline(story.headline);
    setStandfirst(story.standfirst);
    setBody(bodyText(story.body));
    onEditing(true);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!headline.trim()) return;
    save.mutate();
  }

  const err = save.error || hide.error || drop.error;

  return (
    <div className={styles.owner}>
      {story.hidden ? <p className={styles.ownerHint}>{desk.hiddenFromEdition}</p> : null}
      {editing ? (
        <form className={styles.edit} onSubmit={onSubmit}>
          <TextField
            label={desk.headline}
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
          />
          <TextField
            label={desk.standfirst}
            value={standfirst}
            onChange={(e) => setStandfirst(e.target.value)}
          />
          <TextArea
            label={desk.body}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={8}
          />
          <div className={styles.ownerActions}>
            <Button type="submit" size="sm" disabled={save.isPending || !headline.trim()}>
              {common.save}
            </Button>
            <Button variant="quiet" size="sm" type="button" onClick={() => onEditing(false)}>
              {common.cancel}
            </Button>
          </div>
        </form>
      ) : (
        <div className={styles.ownerActions}>
          <Button variant="quiet" size="sm" onClick={beginEdit}>
            {common.edit}
          </Button>
          <Button variant="quiet" size="sm" onClick={() => hide.mutate()} disabled={hide.isPending}>
            {story.hidden ? desk.showInEdition : desk.hideFromEdition}
          </Button>
          <Button
            variant="quiet"
            size="sm"
            onClick={() => {
              if (window.confirm(desk.removeStoryConfirm)) drop.mutate();
            }}
            disabled={drop.isPending}
          >
            {common.remove}
          </Button>
        </div>
      )}
      {err ? <p className={styles.ownerError}>{(err as Error).message}</p> : null}
    </div>
  );
}
