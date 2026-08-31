export const APPLICANT_STAGE = {
  DOCUMENT_REVIEW: "documentReview",
  INTERVIEW: "interview",
  OFFER: "offer",
  HIRED: "hired",
  REJECTED: "rejected",
} as const;
export type ApplicantStage =
  (typeof APPLICANT_STAGE)[keyof typeof APPLICANT_STAGE];

export interface Applicant {
  id: string;
  name: string;
  position: string;
  appliedAt: string;
  stage: ApplicantStage;
  resume: string | null;
  memo: string | null;
}
