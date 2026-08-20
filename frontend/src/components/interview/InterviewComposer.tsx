import { type FormEvent, type KeyboardEvent } from "react";
import styles from "./Interview.module.css";
import { TypingDots } from "./ChatBubble";
import { Button } from "../ui/Button";
import { TextArea } from "../ui/Field";
import { desk } from "../../copy/desk";

export function InterviewComposer({
  value,
  onChange,
  onSubmit,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled: boolean;
}) {
  function submit(e: FormEvent) {
    e.preventDefault();
    if (disabled || !value.trim()) return;
    onSubmit();
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing) return;
    e.preventDefault();
    if (disabled || !value.trim()) return;
    onSubmit();
  }

  return (
    <form className={styles.composer} onSubmit={submit}>
      <div className={styles.composerRow}>
        <TextArea
          label={desk.composerLabel}
          placeholder={desk.composerPlaceholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          rows={2}
          disabled={disabled}
        />
        <Button type="submit" size="lg" disabled={disabled || !value.trim()}>
          {disabled ? <TypingDots /> : desk.send}
        </Button>
      </div>
    </form>
  );
}
