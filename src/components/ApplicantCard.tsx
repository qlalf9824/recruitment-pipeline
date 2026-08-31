import type { Applicant } from '../models/applicant'
import { getApplicantStageLabel } from './applicantBoardStages'

interface ApplicantCardProps {
  applicant: Applicant
  onSelect?: () => void
}

export function ApplicantCard({ applicant, onSelect }: ApplicantCardProps) {
  return (
    <article
      className="rounded-[10px] border border-zinc-200 bg-white p-3.5 shadow-sm"
      aria-label={`${applicant.name} 지원자`}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="min-w-0 text-[15px] font-semibold leading-[1.4] text-zinc-800">
          {applicant.name}
        </h3>
        {onSelect && (
          <button
            aria-label={`${applicant.name} 지원자 상세 보기`}
            className="shrink-0 cursor-pointer rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-[11px] font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            onClick={onSelect}
            type="button"
          >
            상세 보기
          </button>
        )}
      </div>
      <dl className="m-0 grid grid-cols-[max-content_minmax(0,1fr)] gap-x-2.5 gap-y-1.5 text-xs leading-6">
        <dt className="text-zinc-500">직무</dt>
        <dd className="m-0 min-w-0 break-words text-zinc-700">
          {applicant.position}
        </dd>
        <dt className="text-zinc-500">지원일</dt>
        <dd className="m-0 min-w-0 break-words text-zinc-700">
          {applicant.appliedAt}
        </dd>
        <dt className="text-zinc-500">현재 단계</dt>
        <dd className="m-0 min-w-0 break-words text-zinc-700">
          {getApplicantStageLabel(applicant.stage)}
        </dd>
      </dl>
    </article>
  )
}
