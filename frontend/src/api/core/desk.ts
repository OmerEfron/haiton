import type { InterviewListItem, InterviewSession, Quota } from "../types";
import { request } from "../client";

export async function getQuota(): Promise<Quota> {
  return request<Quota>("/quota");
}

export async function listInterviews(): Promise<InterviewListItem[]> {
  return request<InterviewListItem[]>("/desk/interviews");
}

export async function getArchivedInterview(id: string): Promise<InterviewSession> {
  return request<InterviewSession>(`/desk/interviews/${encodeURIComponent(id)}`);
}
