import { request } from "./client";

/**
 * 학습 미션(FR-39, WP20) 호출과 타입. 계약은 docs/contracts/api/wp20-missions.yml 조각이며,
 * 공유 파일 규칙에 따라 타입은 types.ts 가 아니라 이 파일에 둔다.
 * - GET /missions 는 공개(정의만), /me/missions·check 는 로그인 필요. 판정은 서버가 호출 때마다 다시 한다.
 */
export type MissionDifficulty = "BASIC" | "INTERMEDIATE" | "ADVANCED";

export interface MissionCondition {
  type: string;
  label: string;
  value: string | null;
  min: number | null;
  conditions: MissionCondition[];
}

export interface MissionConcept { id: string; title: string }

export interface Mission {
  id: string;
  orderNo: number;
  title: string;
  goal: string;
  difficulty: MissionDifficulty;
  hints: string[];
  concepts: MissionConcept[];
  screenPath: string;
  conditions: MissionCondition[];
}

export interface ConditionStatus {
  type: string;
  label: string;
  satisfied: boolean;
  current: string | null;
  children: ConditionStatus[];
}

export interface MissionStatus {
  missionId: string;
  completed: boolean;
  newlyCompleted: boolean;
  completedBusinessDate: string | null;
  completedAt: string | null;
  lastCheckedAt: string | null;
  conditions: ConditionStatus[];
}

export interface MyMissions {
  completedCount: number;
  totalCount: number;
  businessDate: string | null;
  missions: MissionStatus[];
}

export const missionsApi = {
  list: (signal?: AbortSignal) => request<Mission[]>("/missions", { signal }),
  mine: (signal?: AbortSignal) => request<MyMissions>("/me/missions", { signal }),
  check: (missionId: string) => request<MissionStatus>(`/me/missions/${encodeURIComponent(missionId)}/check`, { method: "POST" }),
};

export const DIFFICULTY_LABEL: Record<MissionDifficulty, { label: string; tone: "neutral" | "info" | "warn" }> = {
  BASIC: { label: "기초", tone: "neutral" },
  INTERMEDIATE: { label: "중급", tone: "info" },
  ADVANCED: { label: "심화", tone: "warn" },
};

/** 연결 화면 경로를 버튼 글자로. 모르는 경로는 "연결 화면 열기". */
export function screenLabel(path: string): string {
  if (path === "/sandbox") return "모의 여신 현황 열기";
  if (path === "/sandbox/profile") return "가상 고객 프로필 열기";
  if (path === "/sandbox/apply") return "대출 신청 열기";
  if (path === "/sandbox/notifications") return "알림함 열기";
  if (path.startsWith("/learn/")) return "개념 읽고 문제 풀기";
  return "연결 화면 열기";
}
