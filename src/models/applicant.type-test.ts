import { APPLICANT_STAGE } from './applicant'
import type { Applicant, ApplicantStage } from './applicant'

const expectedStage = {
  DOCUMENT_REVIEW: 'documentReview',
  INTERVIEW: 'interview',
  OFFER: 'offer',
  HIRED: 'hired',
  REJECTED: 'rejected',
} as const satisfies typeof APPLICANT_STAGE

const applicant: Applicant = {
  id: 'applicant-1',
  name: 'Kim Codex',
  position: 'Frontend Engineer',
  appliedAt: '2026-08-31',
  stage: 'documentReview',
  resume: null,
  memo: null,
}

// @ts-expect-error ApplicantStage must reject values outside the fixed stages.
const invalidStage: ApplicantStage = 'technicalInterview'

export { applicant, expectedStage, invalidStage }
