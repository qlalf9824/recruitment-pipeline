import type { Applicant } from '../models/applicant'
import { APPLICANT_BOARD_STAGES } from './applicantBoardStages'
import { BoardColumn } from './BoardColumn'

interface ApplicantBoardProps {
  applicants: Applicant[]
}

export function ApplicantBoard({ applicants }: ApplicantBoardProps) {
  const isBoardEmpty = applicants.length === 0

  return (
    <div
      className="grid min-w-[1200px] grid-cols-5 gap-3"
      aria-label="채용 단계"
    >
      {APPLICANT_BOARD_STAGES.map(
        ({ columnClassName, countClassName, label, stage, statusClassName }) => (
          <BoardColumn
            key={stage}
            applicants={applicants.filter(
              (applicant) => applicant.stage === stage,
            )}
            columnClassName={columnClassName}
            countClassName={countClassName}
            isBoardEmpty={isBoardEmpty}
            label={label}
            statusClassName={statusClassName}
          />
        ),
      )}
      {isBoardEmpty && (
        <p className="col-span-5 rounded-xl border border-dashed border-zinc-300 bg-white px-4 py-10 text-center text-[13px] leading-6 text-zinc-500">
          지원자가 없습니다
        </p>
      )}
    </div>
  )
}
