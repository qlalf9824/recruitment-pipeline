import { useDroppable } from '@dnd-kit/react'
import type { Applicant, ApplicantStage } from '../models/applicant'
import { DraggableApplicantCard } from './DraggableApplicantCard'

export interface BoardColumnProps {
  applicants: Applicant[]
  columnClassName: string
  countClassName: string
  isBoardEmpty: boolean
  label: string
  movingApplicantId?: string
  onSelectApplicant: (applicantId: string) => void
  stage: ApplicantStage
  statusClassName: string
}

export function BoardColumn({
  applicants,
  columnClassName,
  countClassName,
  isBoardEmpty,
  label,
  movingApplicantId,
  onSelectApplicant,
  stage,
  statusClassName,
}: BoardColumnProps) {
  const { isDropTarget, ref } = useDroppable({ id: stage })

  return (
    <section
      ref={ref}
      className={`min-w-0 rounded-xl border p-3 ${columnClassName} ${
        isDropTarget ? 'ring-2 ring-inset ring-blue-500' : ''
      }`}
      role="region"
      aria-label={`${label} 단계`}
    >
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold leading-[1.4] text-zinc-700">
        <span
          className={`size-2 shrink-0 rounded-full ${statusClassName}`}
          aria-hidden="true"
        />
        {label}
        <span className={`tabular-nums ${countClassName}`}>
          {applicants.length}
        </span>
      </h2>
      {!isBoardEmpty && (
        applicants.length === 0 ? (
          <p className="rounded-[10px] border border-dashed border-zinc-300 bg-white/55 px-2 py-7 text-center text-[13px] leading-6 text-zinc-500">
            지원자가 없습니다
          </p>
        ) : (
          <ul className="grid list-none gap-2.5 p-0 m-0">
            {applicants.map((applicant) => (
              <DraggableApplicantCard
                key={applicant.id}
                applicant={applicant}
                isDisabled={movingApplicantId === applicant.id}
                onSelect={onSelectApplicant}
              />
            ))}
          </ul>
        )
      )}
    </section>
  )
}
