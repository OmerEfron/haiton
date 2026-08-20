import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import styles from "./InterviewRoom.module.css";
import interviewStyles from "../components/interview/Interview.module.css";
import { ChatBubble, TimeStamp, TypingIndicator } from "../components/interview/ChatBubble";
import { DraftPanel } from "../components/interview/DraftPanel";
import { ArticleFormChips } from "../components/interview/ArticleFormChips";
import { heDate, InterviewBar } from "../components/interview/InterviewBar";
import { ErrorState, Loading } from "../components/ui/Bits";
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
      await client.cancelQueries({ queryKey: qk.interview });
      await discardSession();
      client.setQueryData(qk.interview, null);
      await client.invalidateQueries({ queryKey: qk.frontPage });
      await client.invalidateQueries({ queryKey: qk.profile });
      await client.invalidateQueries({ queryKey: qk.deskInterviews });
      navigate(`/story/${story.id}`);
    },
  });

  const drop = useMutation({
    mutationFn: discardSession,
    onSuccess: async () => {
      publish.reset();
      await client.invalidateQueries({ queryKey: qk.interview });
      await client.invalidateQueries({ queryKey: qk.frontPage });
      await client.invalidateQueries({ queryKey: qk.profile });
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
  const showNewsroom = readerTurns > 0 || s.draft.status !== "empty";
  const closed = s.exhausted || s.draft.status === "ready";
  const writingNow =
    draftIt.isPending || (send.isPending && readerTurns >= MAX_INTERVIEW_MESSAGES - 1);
  const canDrop = closed || Boolean(publish.error);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (closed || !text.trim() || busy) return;
    send.mutate(text);
  }

  const draftPanel = showNewsroom ? (
    <DraftPanel
      key={`${s.draft.id}-${s.draft.status}`}
      draft={s.draft}
      onPublish={(d) => publish.mutate(d)}
      publishing={publish.isPending}
      onSave={saveDraft}
    />
  ) : null;

  const composer = (
    <form
      className={[interviewStyles.composer, !showNewsroom && interviewStyles.composerTop].filter(Boolean).join(" ")}
      onSubmit={submit}
    >
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
            onClick={() => draftIt.mutate()}
            disabled={busy || readerTurns === 0}
          >
            {desk.writeDraft}
          </Button>
        )}
        {canDrop && (
          <Button variant="outline" size="lg" onClick={() => drop.mutate()} disabled={drop.isPending}>
            {desk.startOver}
          </Button>
        )}
        {showNewsroom && (
          <span className={interviewStyles.consent}>
            {closed
              ? desk.interviewClosed
              : s.draft.status === "empty"
                ? desk.noDraftYet
                : desk.consentNote}
          </span>
        )}
      </div>
    </form>
  );

  return (
    <div className={styles.room}>
      <InterviewBar startedAt={s.startedAt} elapsedLabel={s.elapsedLabel} factsLocked={s.factsLocked} closed={closed} />

      <div className={[styles.split, !showNewsroom && styles.splitSolo].filter(Boolean).join(" ")}>
        <div className={styles.chat}>
          <div className={styles.chatHead}>
            <div>
              <p className={styles.chatWho}>{showNewsroom ? desk.reporterName : desk.emptyFirstTitle}</p>
              <p className={styles.chatSub}>{showNewsroom ? desk.reporterSubtitle : desk.emptyFirstBody}</p>
            </div>
            {showNewsroom && (
              <div className={styles.chatTags}>
                {s.angleChosen && <Chip>{desk.angleChosen}</Chip>}
                <Chip>{desk.factsLocked(s.factsLocked)}</Chip>
              </div>
            )}
          </div>

          {!showNewsroom && composer}

          {!showNewsroom && !closed && (
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

          <div className={styles.thread}>
            <TimeStamp>{`היום, ${heDate(s.startedAt)}`}</TimeStamp>
            {s.messages.map((message) => (
              <ChatBubble
                key={message.id}
                message={message}
                readerName={readerName}
                onSuggestion={(value) => !busy && !closed && send.mutate(value)}
              />
            ))}
            {busy && <TypingIndicator label={writingNow ? desk.writingDraft : "הכתב מקליד…"} />}
            <div ref={threadEnd} />
          </div>

          {showNewsroom && (
            <ArticleFormChips
              type={s.type ?? null}
              tone={s.tone ?? null}
              locked={closed}
              onChange={(patch) => !busy && !closed && chooseForm.mutate(patch)}
            />
          )}
          {showNewsroom && composer}
          {showNewsroom && (
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
          )}
        </div>

        {showNewsroom && <div className={styles.divider} />}
        {showNewsroom && <div className={styles.desktopDraft}>{draftPanel}</div>}
      </div>

      {sheetOpen && showNewsroom && (
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
        <div className={styles.errorBar}>
          <ErrorState error={send.error || draftIt.error || publish.error} />
          {publish.error && (
            <>
              <Button size="md" onClick={() => publish.mutate(publish.variables ?? s.draft)}>
                {desk.retry}
              </Button>
              <Button variant="outline" size="md" onClick={() => drop.mutate()} disabled={drop.isPending}>
                {desk.discard}
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
