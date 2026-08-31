import { APPLICANT_STAGE } from '../models/applicant'
import type { Applicant } from '../models/applicant'

const APPLICANT_SEED = [
  {
    id: 'applicant-001',
    name: '김민지',
    position: 'Frontend Engineer',
    appliedAt: '2026-08-20',
    stage: APPLICANT_STAGE.DOCUMENT_REVIEW,
  },
  {
    id: 'applicant-002',
    name: '이준호',
    position: 'Backend Engineer',
    appliedAt: '2026-08-18',
    stage: APPLICANT_STAGE.INTERVIEW,
  },
  {
    id: 'applicant-003',
    name: '박소라',
    position: 'Product Designer',
    appliedAt: '2026-08-15',
    stage: APPLICANT_STAGE.OFFER,
  },
  {
    id: 'applicant-004',
    name: '최유진',
    position: 'Data Analyst',
    appliedAt: '2026-08-10',
    stage: APPLICANT_STAGE.HIRED,
  },
  {
    id: 'applicant-005',
    name: '정현우',
    position: 'Product Manager',
    appliedAt: '2026-08-08',
    stage: APPLICANT_STAGE.REJECTED,
  },
] as const satisfies readonly Applicant[]

export function createApplicantSeed(): Applicant[] {
  return APPLICANT_SEED.map((applicant) => ({ ...applicant }))
}
