import { Link, useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import styles from "./InterviewRoom.module.css";
import { ChatBubble, TimeStamp } from "../components/interview/ChatBubble";
import { DraftPanel } from "../components/interview/DraftPanel";
import { Avatar, ErrorState, LivePill, Loading } from "../components/ui/Bits";
import { Chip } from "../components/ui/Chip";
import { getArchivedInterview } from "../api/core/desk";
import { qk } from "../lib/queryKeys";
import { useSession } from "../lib/session";
import { brand } from "../copy/common";
import { desk } from "../copy/desk";

export function InterviewArchivePage() {
  const { id = "" } = useParams();
  const { session } = useSession();
  const interview = useQuery({
    queryKey: qk.deskInterview(id),
    queryFn: () => getArchivedInterview(id),
    enabled: Boolean(id),
  });

  if (interview.isPending) return <Loading />;
  if (interview.error) return <ErrorState error={interview.error} />;

  const s = interview.data;
  if (!s) return <ErrorState error={new Error(desk.archiveEmpty)} />;
  const readerName = session?.user.name.split(" ")[0] ?? "אתה";

  return (
    <div className={styles.room}>
      <div className={styles.bar}>
        <div className={styles.barStart}>
          <Link to="/" className={styles.logo}>
            {brand.name}
          </Link>
          <span className={styles.sep} />
          <span className={styles.roomName}>{desk.archivedInterview}</span>
          <LivePill tone="outlineRed">{desk.archive}</LivePill>
        </div>
        <div className={styles.barEnd}>
          <Link to="/profile" className={styles.close}>
            {desk.close}
          </Link>
        </div>
      </div>

      <div className={styles.split}>
        <div className={styles.chat}>
          <div className={styles.chatHead}>
            <div>
              <p className={styles.chatWho}>{desk.reporterName}</p>
              <p className={styles.chatSub}>{s.startedAt}</p>
            </div>
            <div className={styles.chatTags}>
              {s.angleChosen && <Chip>{desk.angleChosen}</Chip>}
              <Chip>{desk.factsLocked(s.factsLocked)}</Chip>
            </div>
          </div>

          {s.messages.length === 0 && (
            <div className={styles.cold}>
              <Avatar initial="כ" size={56} tone="solid" />
              <p className={styles.coldBody}>{desk.archiveEmpty}</p>
            </div>
          )}

          <div className={styles.thread}>
            <TimeStamp>{s.startedAt}</TimeStamp>
            {s.messages.map((message) => (
              <ChatBubble key={message.id} message={message} readerName={readerName} />
            ))}
          </div>
        </div>

        <div className={styles.divider} />
        <div className={styles.desktopDraft}>
          <DraftPanel draft={s.draft} readOnly />
        </div>
      </div>
    </div>
  );
}
