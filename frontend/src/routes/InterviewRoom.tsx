import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import styles from "./InterviewRoom.module.css";
import interviewStyles from "../components/interview/Interview.module.css";
import { ChatBubble, TimeStamp, TypingIndicator } from "../components/interview/ChatBubble";
import { DraftPanel } from "../components/interview/DraftPanel";
import { ArticleFormChips } from "../components/interview/ArticleFormChips";
import { Avatar, ErrorState, LivePill, Loading } from "../components/ui/Bits";
import { Button, ButtonLink } from "../components/ui/Button";
import { Chip } from "../components/ui/Chip";
import { TextArea } from "../components/ui/Field";
import { EmptyState } from "../components/ui/EmptyState";
import {
  MAX_INTERVIEW_MESSAGES,
  type ArticleTypeId,
  type ToneId,
} from "../api/types";
import {
  discardSession,
  loadOrStartSession,
  requestDraft,
  sendMessage,
  setArticleForm,
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

  const interview = useQuery({
    queryKey: qk.interview,
    queryFn: () => loadOrStartSession(appSession?.user.name),
    staleTime: 0,
  });

  const refresh = () => client.invalidateQueries({ queryKey: qk.interview });

  const send = useMutation({
    mutationFn: (value: string) => sendMessage(value),
    onMutate: () => setText(""),
    onError: (_err, value) => setText(value),
    onSuccess: refresh,
  });

  const draftIt = useMutation({ mutationFn: requestDraft, onSuccess: refresh });

  const chooseForm = useMutation({
    mutationFn: (patch: { type?: ArticleTypeId | null; tone?: ToneId | null }) =>
      setArticleForm(patch),
    onSuccess: refresh,
  });

  const publish = useMutation({
    mutationFn: publishStory,
    onSuccess: async (story) => {
      await discardSession();
      await client.invalidateQueries();
      navigate(`/story/${story.id}`);
    },
  });

  const saveDraft = () => {
    client.invalidateQueries({ queryKey: qk.interview });
    client.invalidateQueries({ queryKey: qk.frontPage });
    client.invalidateQueries({ queryKey: qk.profile });
    navigate("/");
  };

  const busy = send.isPending || draftIt.isPending;

  useEffect(() => {
    threadEnd.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [interview.data?.messages.length, busy]);

  useEffect(() => {
    if (interview.data?.draft.status === "ready") setSheetOpen(true);
  }, [interview.data?.draft.status]);

  if (interview.isPending) return <Loading />;
  if (interview.error) return <ErrorState error={interview.error} />;

  const s = interview.data;
  if (!s) {
    return (
      <EmptyState
        title={desk.quotaTitle}
        body={desk.quotaBody}
        actions={
          <ButtonLink to="/" size="lg">
            {desk.backToEdition}
          </ButtonLink>
        }
      />
    );
  }
  const readerName = appSession?.user.name.split(" ")[0] ?? "אתה";
  const readerTurns = s.messages.filter((m) => m.role === "reader").length;
  const firstInterview = readerTurns === 0;
  const closed = s.exhausted || s.draft.status === "ready";
  const writingNow =
    draftIt.isPending || (send.isPending && readerTurns >= MAX_INTERVIEW_MESSAGES - 1);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (closed || !text.trim() || busy) return;
    send.mutate(text);
  }

  const draftPanel = (
    <DraftPanel
      draft={s.draft}
      onPublish={() => publish.mutate(s.draft)}
      publishing={publish.isPending}
      onSave={saveDraft}
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
                onSuggestion={(value) => !busy && !closed && send.mutate(value)}
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
                    onClick={() => !busy && !closed && send.mutate(opener)}
                  >
                    {opener}
                  </button>
                ))}
              </div>
            )}

            {busy && (
              <TypingIndicator
                label={writingNow ? desk.writingDraft : "הכתב מקליד…"}
              />
            )}
            <div ref={threadEnd} />
          </div>

          <ArticleFormChips
            type={s.type ?? null}
            tone={s.tone ?? null}
            locked={closed}
            onChange={(patch) => !busy && !closed && chooseForm.mutate(patch)}
          />

          <form className={interviewStyles.composer} onSubmit={submit}>
            <TextArea
              label={desk.composerLabel}
              placeholder={closed ? desk.interviewClosed : desk.composerPlaceholder}
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={2}
              disabled={busy || closed}
            />
            <div className={interviewStyles.composerActions}>
              <Button type="submit" size="lg" disabled={busy || closed || !text.trim()}>
                {desk.send}
              </Button>
              {!closed && (
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => !busy && draftIt.mutate()}
                  disabled={busy}
                >
                  {desk.writeDraft}
                </Button>
              )}
              <span className={interviewStyles.consent}>
                {closed
                  ? desk.interviewClosed
                  : s.draft.status === "empty"
                    ? desk.noDraftYet
                    : desk.consentNote}
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

      {(send.error || draftIt.error || publish.error) && (
        <ErrorState error={send.error || draftIt.error || publish.error} />
      )}
    </div>
  );
}
