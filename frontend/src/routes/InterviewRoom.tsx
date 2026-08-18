import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import styles from "./InterviewRoom.module.css";
import interviewStyles from "../components/interview/Interview.module.css";
import { ChatBubble, TimeStamp, TypingIndicator } from "../components/interview/ChatBubble";
import { DraftPanel } from "../components/interview/DraftPanel";
import { Avatar, ErrorState, LivePill, Loading } from "../components/ui/Bits";
import { Button } from "../components/ui/Button";
import { Chip } from "../components/ui/Chip";
import { TextArea } from "../components/ui/Field";
import type { SectionId } from "../api/types";
import {
  discardSession,
  requestDraft,
  sendMessage,
  setDraftSection,
  startSession,
} from "../api/reporter/interview";
import { publishStory } from "../api/core/stories";
import { qk } from "../lib/queryKeys";
import { useSession } from "../lib/session";
import { brand, common } from "../copy/common";
import { desk } from "../copy/desk";

export function InterviewRoom() {
  const client = useQueryClient();
  const navigate = useNavigate();
  const { session: appSession } = useSession();
  const [text, setText] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const threadEnd = useRef<HTMLDivElement>(null);

  const interview = useQuery({ queryKey: qk.interview, queryFn: startSession });

  const refresh = () => client.invalidateQueries({ queryKey: qk.interview });

  const send = useMutation({
    mutationFn: (value: string) => sendMessage(value),
    onMutate: () => setText(""),
    onSuccess: refresh,
  });

  const draftIt = useMutation({ mutationFn: requestDraft, onSuccess: refresh });

  const chooseSection = useMutation({
    mutationFn: (s: SectionId) => setDraftSection(s),
    onSuccess: refresh,
  });

  const publish = useMutation({
    mutationFn: publishStory,
    onSuccess: async (story) => {
      await client.invalidateQueries();
      navigate(`/story/${story.id}`);
    },
  });

  const discard = useMutation({
    mutationFn: discardSession,
    onSuccess: async () => {
      await client.invalidateQueries();
      navigate("/");
    },
  });

  const busy = send.isPending || draftIt.isPending;

  useEffect(() => {
    threadEnd.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [interview.data?.messages.length, busy]);

  if (interview.isPending) return <Loading />;
  if (interview.error) return <ErrorState error={interview.error} />;

  const s = interview.data;
  const readerName = appSession?.user.name.split(" ")[0] ?? "אתה";
  const firstInterview = s.messages.filter((m) => m.role === "reader").length === 0;

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!text.trim() || busy) return;
    send.mutate(text);
  }

  const draftPanel = (
    <DraftPanel
      draft={s.draft}
      onSection={(section) => chooseSection.mutate(section)}
      onPublish={() => publish.mutate(s.draft)}
      publishing={publish.isPending}
      onDiscard={() => discard.mutate()}
    />
  );

  return (
    <div className={styles.room}>
      <div className={styles.bar}>
        <div className={styles.barStart}>
          <Link to="/" className={styles.logo}>
            {brand.name}
          </Link>
          <span className={styles.sep} />
          <span className={styles.roomName}>
            <span className={styles.roomNameFull}>{desk.interviewRoomFull}</span>
            <span className={styles.roomNameShort}>{desk.interviewRoom}</span>
          </span>
          <LivePill tone="red">
            <span className={styles.roomNameFull}>{desk.liveInterview}</span>
            <span className={styles.roomNameShort}>{common.live}</span>
          </LivePill>
        </div>
        <div className={styles.barEnd}>
          <span className={styles.barMeta}>
            {s.startedAt} · {s.elapsedLabel}
          </span>
          <span className={styles.barMeta}>עובדות שנרשמו: {s.factsLocked}</span>
          <Link to="/" className={styles.close}>
            <span className={styles.roomNameFull}>{desk.closeAndReturn}</span>
            <span className={styles.roomNameShort}>{desk.close}</span>
          </Link>
        </div>
      </div>

      <div className={styles.split}>
        <div className={styles.chat}>
          <div className={styles.chatHead}>
            <div>
              <p className={styles.chatWho}>{desk.reporterName}</p>
              <p className={styles.chatSub}>{desk.reporterSubtitle}</p>
            </div>
            <div className={styles.chatTags}>
              {s.angleChosen && <Chip>{desk.angleChosen}</Chip>}
              <Chip>{desk.factsLocked(s.factsLocked)}</Chip>
            </div>
          </div>

          {firstInterview && (
            <div className={styles.cold}>
              <Avatar initial="כ" size={56} tone="solid" />
              <h2 className={styles.coldTitle}>{desk.emptyFirstTitle}</h2>
              <p className={styles.coldBody}>{desk.emptyFirstBody}</p>
            </div>
          )}

          <div className={styles.thread}>
            <TimeStamp>{`היום, ${s.startedAt}`}</TimeStamp>

            {s.messages.map((message) => (
              <ChatBubble
                key={message.id}
                message={message}
                readerName={readerName}
                onSuggestion={(value) => !busy && send.mutate(value)}
              />
            ))}

            {firstInterview && (
              <div className={styles.openers}>
                <p className={styles.openersLabel}>{desk.suggestedOpeners}</p>
                {s.openers.map((opener) => (
                  <button
                    key={opener}
                    type="button"
                    className={styles.opener}
                    onClick={() => !busy && send.mutate(opener)}
                  >
                    {opener}
                  </button>
                ))}
              </div>
            )}

            {busy && (
              <TypingIndicator
                label={draftIt.isPending ? desk.writingDraft : "הכתב מקליד…"}
              />
            )}
            <div ref={threadEnd} />
          </div>

          <form className={interviewStyles.composer} onSubmit={submit}>
            <TextArea
              label={desk.composerLabel}
              placeholder={desk.composerPlaceholder}
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={2}
            />
            <div className={interviewStyles.composerActions}>
              <Button type="submit" size="lg" disabled={busy || !text.trim()}>
                {desk.send}
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => !busy && draftIt.mutate()}
                disabled={busy}
              >
                {desk.writeDraft}
              </Button>
              <span className={interviewStyles.consent}>
                {s.draft.status === "empty" ? desk.noDraftYet : desk.consentNote}
              </span>
            </div>
          </form>

          {/* Mobile: the draft lives behind a toggle instead of a side panel. */}
          <div className={styles.draftToggle}>
            <Button
              variant="quiet"
              size="lg"
              block
              onClick={() => setSheetOpen(true)}
              disabled={s.draft.status === "empty"}
            >
              {s.draft.status === "empty" ? desk.noDraftYet : desk.showDraft}
            </Button>
          </div>
        </div>

        <div className={styles.divider} />

        <div className={styles.desktopDraft}>{draftPanel}</div>
      </div>

      {sheetOpen && (
        <div className={styles.mobileDraft}>
          <div>
            <div className={styles.bar}>
              <span className={styles.roomName}>{desk.interviewRoom}</span>
              <button type="button" className={styles.close} onClick={() => setSheetOpen(false)}>
                {desk.hideDraft}
              </button>
            </div>
            {draftPanel}
          </div>
        </div>
      )}

      {publish.error && <ErrorState error={publish.error} />}
    </div>
  );
}
