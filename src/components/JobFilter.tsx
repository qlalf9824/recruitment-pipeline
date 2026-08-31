import { useEffect, useId, useRef, useState } from 'react'

interface JobFilterProps {
  jobs: string[]
  onChange(jobs: string[]): void
  selectedJobs: string[]
}

export function JobFilter({ jobs, onChange, selectedJobs }: JobFilterProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const listId = useId()
  const buttonLabel =
    selectedJobs.length === 0 ? '직무 전체' : `직무 ${selectedJobs.length}개 선택`

  useEffect(() => {
    if (!isOpen) return

    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const handleJobChange = (job: string) => {
    const nextJobs = selectedJobs.includes(job)
      ? selectedJobs.filter((selectedJob) => selectedJob !== job)
      : [...selectedJobs, job]

    onChange(nextJobs)
  }

  return (
    <div className="relative w-full max-w-64 shrink-0" ref={containerRef}>
      <button
        aria-controls={listId}
        aria-expanded={isOpen}
        className="flex h-10 w-full items-center justify-between rounded-lg border border-zinc-300 bg-white px-3 text-left text-sm font-medium text-zinc-700 shadow-sm outline-none hover:border-zinc-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <span>{buttonLabel}</span>
        <svg
          aria-hidden="true"
          className={`size-4 text-zinc-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
        >
          <path d="m7 10 5 5 5-5" stroke="currentColor" strokeWidth="2" />
        </svg>
      </button>

      {isOpen && (
        <fieldset
          className="absolute left-0 top-[calc(100%+0.5rem)] z-20 m-0 grid w-full min-w-64 gap-1 rounded-lg border border-zinc-200 bg-white p-2 shadow-lg"
          id={listId}
        >
          <legend className="sr-only">직무 선택</legend>
          {jobs.map((job) => (
            <label
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
              key={job}
            >
              <input
                checked={selectedJobs.includes(job)}
                className="size-4 accent-blue-600"
                onChange={() => handleJobChange(job)}
                type="checkbox"
              />
              <span>{job}</span>
            </label>
          ))}
        </fieldset>
      )}
    </div>
  )
}
