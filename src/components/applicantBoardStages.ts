import { APPLICANT_STAGE } from '../models/applicant'
import type { ApplicantStage } from '../models/applicant'

export const APPLICANT_BOARD_STAGES = [
  {
    stage: APPLICANT_STAGE.DOCUMENT_REVIEW,
    label: '서류검토',
    columnClassName: 'border-slate-200 bg-slate-50',
    countClassName: 'text-slate-500',
    statusClassName: 'bg-slate-500',
  },
  {
    stage: APPLICANT_STAGE.INTERVIEW,
    label: '면접',
    columnClassName: 'border-blue-200 bg-blue-50',
    countClassName: 'text-blue-500',
    statusClassName: 'bg-blue-500',
  },
  {
    stage: APPLICANT_STAGE.OFFER,
    label: '처우협의',
    columnClassName: 'border-amber-200 bg-amber-50',
    countClassName: 'text-amber-500',
    statusClassName: 'bg-amber-500',
  },
  {
    stage: APPLICANT_STAGE.HIRED,
    label: '최종합격',
    columnClassName: 'border-emerald-200 bg-emerald-50',
    countClassName: 'text-emerald-500',
    statusClassName: 'bg-emerald-500',
  },
  {
    stage: APPLICANT_STAGE.REJECTED,
    label: '불합격',
    columnClassName: 'border-purple-200 bg-purple-50',
    countClassName: 'text-purple-500',
    statusClassName: 'bg-purple-500',
  },
] as const

export function getApplicantStageLabel(stage: ApplicantStage): string {
  return APPLICANT_BOARD_STAGES.find((item) => item.stage === stage)!.label
}
