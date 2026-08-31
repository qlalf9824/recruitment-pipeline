import type { Applicant } from '../models/applicant'
import { ApplicantCard } from './ApplicantCard'

export interface BoardColumnProps {
  applicants: Applicant[]
  columnClassName: string
  countClassName: string
  isBoardEmpty: boolean
  label: string
  statusClassName: string
}

export function BoardColumn({
  applicants,
  columnClassName,
  countClassName,
  isBoardEmpty,
  label,
  statusClassName,
}: BoardColumnProps) {
  return (
    <section
      className={`min-w-0 rounded-xl border p-3 ${columnClassName}`}
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
              <li className="min-w-0" key={applicant.id}>
                <ApplicantCard applicant={applicant} />
              </li>
            ))}
          </ul>
        )
      )}
    </section>
  )
}
