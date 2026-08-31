export const APPLICANT_STAGE = {
  DOCUMENT_REVIEW: "documentReview",
  INTERVIEW: "interview",
  OFFER: "offer",
  HIRED: "hired",
  REJECTED: "rejected",
} as const;
export type ApplicantStage =
  (typeof APPLICANT_STAGE)[keyof typeof APPLICANT_STAGE];

const APPLICANT_STAGES = Object.values(APPLICANT_STAGE) as ApplicantStage[];

export function isApplicantStage(value: unknown): value is ApplicantStage {
  return APPLICANT_STAGES.some((stage) => stage === value);
}

export interface Applicant {
  id: string;
  name: string;
  position: string;
  appliedAt: string;
  stage: ApplicantStage;
  resume: string | null;
  memo: string | null;
}
