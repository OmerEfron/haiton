import styles from "./Interview.module.css";
import type { InterviewMessage } from "../../api/types";
import { Chip } from "../ui/Chip";
import { desk } from "../../copy/desk";

export function ChatBubble({
  message,
  readerName,
  onSuggestion,
  onWriteDraft,
}: {
  message: InterviewMessage;
  readerName: string;
  onSuggestion?: (text: string) => void;
  onWriteDraft?: () => void;
}) {
  const reporter = message.role === "reporter";
  const chips = (message.suggestions && message.suggestions.length > 0) || onWriteDraft;
  return (
    <div className={`${styles.bubble} ${reporter ? styles.reporter : styles.reader}`}>
      <p className={styles.who}>{reporter ? desk.reporter : readerName}</p>
      <p className={styles.text}>{message.text}</p>
      {chips && (
        <div className={styles.suggestions}>
          {message.suggestions?.map((s) => (
            <Chip key={s} onClick={onSuggestion ? () => onSuggestion(s) : undefined}>
              {s}
            </Chip>
          ))}
          {onWriteDraft && <Chip onClick={onWriteDraft}>{desk.writeDraft}</Chip>}
        </div>
      )}
    </div>
  );
}

export function TimeStamp({ children }: { children: string }) {
  return <div className={styles.stamp}>{children}</div>;
}

export function TypingDots() {
  return (
    <span className={styles.dots} aria-hidden>
      <span />
      <span />
      <span />
    </span>
  );
}

export function TypingIndicator() {
  return (
    <div className={`${styles.bubble} ${styles.reporter}`} role="status">
      <p className={styles.who}>{desk.reporter}</p>
      <TypingDots />
    </div>
  );
}
