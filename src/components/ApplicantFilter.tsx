import { ApplicantSearch } from './ApplicantSearch'
import { JobFilter } from './JobFilter'

interface ApplicantFilterProps {
  onSearchTermChange(value: string): void
  onSelectedJobsChange(jobs: string[]): void
  searchTerm: string
  selectedJobs: string[]
}

export function ApplicantFilter({
  onSearchTermChange,
  onSelectedJobsChange,
  searchTerm,
  selectedJobs,
}: ApplicantFilterProps) {
  return (
    <section
      aria-label="지원자 필터"
      className="mb-5 flex items-center gap-3"
    >
      <ApplicantSearch onChange={onSearchTermChange} value={searchTerm} />
      <JobFilter
        onChange={onSelectedJobsChange}
        selectedJobs={selectedJobs}
      />
    </section>
  )
}
