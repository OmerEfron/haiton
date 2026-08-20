import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import styles from "./InterviewRoom.module.css";
import { ChatBubble, TimeStamp, TypingIndicator } from "../components/interview/ChatBubble";
import { DraftPanel } from "../components/interview/DraftPanel";
import { KartesetStrip } from "../components/interview/KartesetStrip";
import { ArticleFormChips } from "../components/interview/ArticleFormChips";
import { InterviewComposer } from "../components/interview/InterviewComposer";
import { heDate, InterviewBar } from "../components/interview/InterviewBar";
import { ErrorState, Loading } from "../components/ui/Bits";
import { Button, ButtonLink } from "../components/ui/Button";
import { Chip } from "../components/ui/Chip";
import { EmptyState } from "../components/ui/EmptyState";
import { CREDITS_DRAFT, MAX_INTERVIEW_MESSAGES, type ArticleTypeId, type Draft, type ProposedFact, type ToneId } from "../api/types";
import { getQuota } from "../api/core/desk";
import {
  discardSession, loadOrStartSession, publishDraftWithFacts, requestDraft, restartSession, sendMessage, setArticleForm,
} from "../api/reporter/interview";
import { qk } from "../lib/queryKeys";
import { useSession } from "../lib/session";
import { desk } from "../copy/desk";

export function InterviewRoom() {
  const client = useQueryClient();
  const navigate = useNavigate();
  const { session: appSession } = useSession();
  const [text, setText] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const threadEnd = useRef<HTMLDivElement>(null);

  const interview = useQuery({
    queryKey: qk.interview,
    queryFn: () => loadOrStartSession(),
    staleTime: 0,
  });
  const quota = useQuery({ queryKey: qk.quota, queryFn: getQuota });

  const send = useMutation({
    mutationFn: (value: string) => sendMessage(value),
    onMutate: (value) => {
      setText("");
      setPending(value.trim());
    },
    onError: (_err, value) => {
      setPending(null);
      setText(value);
    },
    onSuccess: (session) => {
      client.setQueryData(qk.interview, session);
      setPending(null);
      void client.invalidateQueries({ queryKey: qk.quota });
    },
  });

  const draftIt = useMutation({
    mutationFn: requestDraft,
    onSuccess: (session) => {
      client.setQueryData(qk.interview, session);
      void client.invalidateQueries({ queryKey: qk.quota });
    },
  });

  const chooseForm = useMutation({
    mutationFn: (patch: { type?: ArticleTypeId | null; tone?: ToneId | null }) =>
      setArticleForm(patch),
    onSuccess: (session) => client.setQueryData(qk.interview, session),
  });

  const publish = useMutation({
    mutationFn: ({ draft, fileFacts }: { draft: Draft; fileFacts: ProposedFact[] }) =>
      publishDraftWithFacts(draft, fileFacts),
    onSuccess: async (story) => {
      await client.cancelQueries({ queryKey: qk.interview });
      await discardSession();
      client.setQueryData(qk.interview, null);
      await client.invalidateQueries({ queryKey: qk.frontPage });
      await client.invalidateQueries({ queryKey: qk.profile });
      await client.invalidateQueries({ queryKey: qk.facts });
      await client.invalidateQueries({ queryKey: qk.deskInterviews });
      navigate(story.shareToken ? `/s/${story.shareToken}` : `/story/${story.id}`);
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

  const toggleTest = useMutation({
    mutationFn: (testMode: boolean) => restartSession({ testMode }),
    onSuccess: (session) => client.setQueryData(qk.interview, session),
    onError: () => { void client.invalidateQueries({ queryKey: qk.interview }); },
  });

  const saveDraft = () => {
    client.invalidateQueries({ queryKey: qk.interview });
    client.invalidateQueries({ queryKey: qk.frontPage });
    client.invalidateQueries({ queryKey: qk.profile });
    navigate("/?draft=saved");
  };
  const busy = send.isPending || draftIt.isPending || toggleTest.isPending;
  const confirmedTurns = interview.data?.messages.filter((m) => m.role === "reader").length ?? 0;
  const writingNow =
    draftIt.isPending || (send.isPending && confirmedTurns >= MAX_INTERVIEW_MESSAGES - 1);

  useEffect(() => {
    threadEnd.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [interview.data?.messages.length, busy, pending]);

  useEffect(() => {
    if (writingNow || interview.data?.draft.status === "ready") setSheetOpen(true);
  }, [writingNow, interview.data?.draft.status]);

  if (interview.isPending) return <Loading />;
  if (interview.error) return <ErrorState error={interview.error} />;

  const s = interview.data;
  if (!s) {
    return (
      <EmptyState
        title={desk.quotaTitle}
        body={desk.quotaBody}
        actions={<ButtonLink to="/" size="lg">{desk.backToEdition}</ButtonLink>}
      />
    );
  }

  const readerName = appSession?.user.name.split(" ")[0] ?? "אתה";
  const chatting = s.messages.length > 0 || Boolean(pending);
  const closed = s.exhausted || s.draft.status === "ready";
  const showDraft = writingNow || s.draft.status === "ready";
  const showComposer = !closed && !writingNow;
  const last = s.messages.at(-1);
  const remaining = quota.data?.remaining;
  const offerDraft =
    last?.role === "reporter" && confirmedTurns > 0 && !closed && !busy && (remaining ?? 0) >= CREDITS_DRAFT;
  const canDrop = closed || Boolean(publish.error);
  const canTest = import.meta.env.DEV && confirmedTurns === 0 && !closed && !busy && !pending;

  const formChange = (patch: { type?: ArticleTypeId | null; tone?: ToneId | null }) => {
    if (!busy && !closed) chooseForm.mutate(patch);
  };

  const draftPanel = (
    <DraftPanel
      key={`${s.draft.id}-${s.draft.status}`}
      draft={s.draft}
      writing={writingNow}
      onPublish={(d, fileFacts) => publish.mutate({ draft: d, fileFacts })}
      publishing={publish.isPending}
      onSave={saveDraft}
      onDrop={canDrop ? () => drop.mutate() : undefined}
      dropping={drop.isPending}
      type={s.type ?? null}
      tone={s.tone ?? null}
      onFormChange={formChange}
      formLocked={writingNow || closed}
      proposedFacts={s.proposedFacts ?? []}
    />
  );

  return (
    <div className={styles.room}>
      <InterviewBar
        startedAt={s.startedAt}
        elapsedLabel={s.elapsedLabel}
        factsLocked={s.factsLocked}
        closed={closed}
        testMode={s.testMode}
        onToggleTestMode={canTest ? () => toggleTest.mutate(!s.testMode) : undefined}
        creditsRemaining={remaining}
      />

      <div className={[styles.split, !showDraft && styles.splitSolo].filter(Boolean).join(" ")}>
        <div className={styles.chat}>
          <div className={styles.chatHead}>
            <div>
              <p className={styles.chatWho}>{chatting ? desk.reporterName : desk.emptyFirstTitle}</p>
              <p className={styles.chatSub}>{chatting ? desk.reporterSubtitle : desk.emptyFirstBody}</p>
            </div>
            {showDraft && (
              <div className={styles.chatTags}>
                {s.angleChosen && <Chip>{desk.angleChosen}</Chip>}
                <Chip>{desk.factsLocked(s.factsLocked)}</Chip>
              </div>
            )}
          </div>

          <div className={styles.thread}>
            <TimeStamp>{`היום, ${heDate(s.startedAt)}`}</TimeStamp>
            {s.messages.map((message) => (
              <ChatBubble
                key={message.id}
                message={message}
                readerName={readerName}
                onSuggestion={(value) => !busy && !closed && send.mutate(value)}
                onWriteDraft={offerDraft && message.id === last?.id ? () => draftIt.mutate() : undefined}
              />
            ))}
            {pending && (
              <ChatBubble
                message={{ id: "pending", role: "reader", text: pending, at: "" }}
                readerName={readerName}
              />
            )}
            {busy && !writingNow && <TypingIndicator />}
            <div ref={threadEnd} />
          </div>

          {!chatting && !closed && (
            <>
              <KartesetStrip
                facts={s.facts ?? []}
                lockNow
                onRelock={() => toggleTest.mutate(Boolean(s.testMode))}
              />
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
            </>
          )}

          {chatting && !showDraft && (
            <ArticleFormChips
              type={s.type ?? null}
              tone={s.tone ?? null}
              locked={closed || busy}
              onChange={formChange}
            />
          )}
          {showComposer && (
            <InterviewComposer
              value={text}
              onChange={setText}
              onSubmit={() => send.mutate(text)}
              disabled={busy}
            />
          )}
          {showDraft && (
            <div className={styles.draftToggle}>
              <Button variant="quiet" size="lg" block onClick={() => setSheetOpen(true)}>
                {desk.showDraft}
              </Button>
            </div>
          )}
        </div>

        {showDraft && <div className={styles.divider} />}
        {showDraft && <div className={styles.desktopDraft}>{draftPanel}</div>}
      </div>

      {sheetOpen && showDraft && (
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

      {(send.error || draftIt.error || publish.error || toggleTest.error) && (
        <div className={styles.errorBar}>
          <ErrorState error={send.error || draftIt.error || publish.error || toggleTest.error} />
          {publish.error && (
            <>
              <Button size="md" onClick={() => publish.mutate(publish.variables ?? { draft: s.draft, fileFacts: [] })}>
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
