import styles from "./Interview.module.css";
import type { InterviewMessage } from "../../api/types";
import { Chip } from "../ui/Chip";
import { desk } from "../../copy/desk";

export function ChatBubble({
  message,
  readerName,
  onSuggestion,
}: {
  message: InterviewMessage;
  readerName: string;
  onSuggestion?: (text: string) => void;
}) {
  const reporter = message.role === "reporter";
  return (
    <div className={`${styles.bubble} ${reporter ? styles.reporter : styles.reader}`}>
      <p className={styles.who}>{reporter ? desk.reporter : readerName}</p>
      <p className={styles.text}>{message.text}</p>
      {message.suggestions && message.suggestions.length > 0 && (
        <div className={styles.suggestions}>
          {message.suggestions.map((s) => (
            <Chip key={s} onClick={onSuggestion ? () => onSuggestion(s) : undefined}>
              {s}
            </Chip>
          ))}
        </div>
      )}
    </div>
  );
}

export function TimeStamp({ children }: { children: string }) {
  return <div className={styles.stamp}>{children}</div>;
}

export function TypingIndicator({ label = desk.writingDraft }: { label?: string }) {
  return (
    <div className={styles.typing} role="status">
      <span className={styles.dots} aria-hidden>
        <span />
        <span />
        <span />
      </span>
      <span className={styles.typingLabel}>{label}</span>
    </div>
  );
}
