import { useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "../components/layout/PageHeader";
import { Footer } from "../components/layout/Footer";
import { Loading } from "../components/ui/Bits";
import { Button, ButtonLink } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { joinInvitation, previewInvitation, respondToInvitation } from "../api/core/connections";
import { qk } from "../lib/queryKeys";
import { useSession } from "../lib/session";
import { circle } from "../copy/circle";
import { common } from "../copy/common";

const JOIN_TOKEN_KEY = "iton_join";

export function joinReturnPath(from?: string): string {
  if (from && from !== "/login") return from;
  const token = sessionStorage.getItem(JOIN_TOKEN_KEY);
  return token ? `/join/${token}` : "/";
}

export function JoinPage() {
  const { token = "" } = useParams();
  const { session } = useSession();
  const location = useLocation();
  const navigate = useNavigate();
  const client = useQueryClient();

  const preview = useQuery({
    queryKey: qk.invitePreview(token),
    queryFn: () => previewInvitation(token),
    enabled: Boolean(token),
  });

  const join = useMutation({
    mutationFn: () => joinInvitation(token),
  });

  const respond = useMutation({
    mutationFn: (accept: boolean) => {
      const invitationId = join.data?.invitationId;
      if (!invitationId) throw new Error(circle.joinBody);
      return respondToInvitation({ id: invitationId, accept });
    },
    onSuccess: async (_, accept) => {
      sessionStorage.removeItem(JOIN_TOKEN_KEY);
      await client.invalidateQueries({ queryKey: qk.invitations });
      await client.invalidateQueries({ queryKey: qk.connections });
      const inviterId = join.data?.inviterId ?? preview.data?.id;
      if (accept && inviterId) {
        navigate(`/u/${inviterId}`, { replace: true });
        return;
      }
      navigate("/", { replace: true });
    },
  });

  useEffect(() => {
    if (token) sessionStorage.setItem(JOIN_TOKEN_KEY, token);
  }, [token]);

  useEffect(() => {
    if (!session || !token) return;
    join.mutate();
    // join once per visit — mutate identity is not a dep on purpose
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, token]);

  useEffect(() => {
    if (join.data?.connected && join.data.inviterId) {
      sessionStorage.removeItem(JOIN_TOKEN_KEY);
      navigate(`/u/${join.data.inviterId}`, { replace: true });
    }
  }, [join.data, navigate]);

  if (preview.isPending || (session && join.isPending && !join.data && !join.error)) {
    return (
      <>
        <PageHeader />
        <Loading />
      </>
    );
  }
  if (preview.error) {
    return (
      <>
        <PageHeader />
        <EmptyState
          title={preview.error instanceof Error ? preview.error.message : circle.joinBody}
          actions={
            <ButtonLink to="/" size="lg">
              {common.backHome}
            </ButtonLink>
          }
        />
        <Footer />
      </>
    );
  }

  const inviter = preview.data;
  const pending = Boolean(session && join.data && !join.data.connected && join.data.invitationId);

  return (
    <>
      <PageHeader />
      <EmptyState
        mark={inviter?.initial}
        title={inviter ? circle.joinTitle(inviter.name) : circle.title}
        body={join.error ? join.error.message : pending ? circle.gateApprove : circle.joinBody}
        actions={
          session ? (
            pending ? (
              <>
                <Button
                  size="lg"
                  block
                  onClick={() => respond.mutate(true)}
                  disabled={respond.isPending}
                >
                  {common.approve}
                </Button>
                <Button
                  variant="quiet"
                  size="lg"
                  block
                  onClick={() => respond.mutate(false)}
                  disabled={respond.isPending}
                >
                  {common.reject}
                </Button>
              </>
            ) : undefined
          ) : (
            <ButtonLink to="/login" state={{ from: location.pathname }} size="lg">
              {circle.loginCta}
            </ButtonLink>
          )
        }
      />
      <Footer />
    </>
  );
}
