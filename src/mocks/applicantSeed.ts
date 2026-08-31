import { APPLICANT_STAGE } from '../models/applicant'
import type { Applicant } from '../models/applicant'

const APPLICANT_SEED = [
  {
    id: 'applicant-001',
    name: '김민지',
    position: 'Frontend Engineer',
    appliedAt: '2026-08-20',
    stage: APPLICANT_STAGE.DOCUMENT_REVIEW,
    resume: 'React와 TypeScript 기반 프론트엔드 개발 경력 4년',
    memo: '제품 사용성과 협업 경험을 중점적으로 확인할 예정',
  },
  {
    id: 'applicant-002',
    name: '이준호',
    position: 'Backend Engineer',
    appliedAt: '2026-08-18',
    stage: APPLICANT_STAGE.INTERVIEW,
    resume: 'Node.js 기반 백엔드 시스템 개발 경력 5년',
    memo: null,
  },
  {
    id: 'applicant-003',
    name: '박소라',
    position: 'Product Designer',
    appliedAt: '2026-08-15',
    stage: APPLICANT_STAGE.OFFER,
    resume: 'B2B 제품 디자인 및 디자인 시스템 구축 경험',
    memo: '포트폴리오의 문제 해결 과정이 구체적임',
  },
  {
    id: 'applicant-004',
    name: '최유진',
    position: 'Data Analyst',
    appliedAt: '2026-08-10',
    stage: APPLICANT_STAGE.HIRED,
    resume: null,
    memo: '분석 결과를 비기술 직군에 전달하는 역량이 강점',
  },
  {
    id: 'applicant-005',
    name: '정현우',
    position: 'Product Manager',
    appliedAt: '2026-08-08',
    stage: APPLICANT_STAGE.REJECTED,
    resume: null,
    memo: null,
  },
] as const satisfies readonly Applicant[]

export function createApplicantSeed(): Applicant[] {
  return APPLICANT_SEED.map((applicant) => ({ ...applicant }))
}
