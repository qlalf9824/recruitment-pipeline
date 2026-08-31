interface ApplicantSearchProps {
  onChange(value: string): void
  value: string
}

export function ApplicantSearch({ onChange, value }: ApplicantSearchProps) {
  return (
    <label className="relative block min-w-0 max-w-md flex-1">
      <span className="sr-only">지원자 이름 검색</span>
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
        <path d="m16 16 4 4" stroke="currentColor" strokeWidth="2" />
      </svg>
      <input
        aria-label="지원자 이름 검색"
        className="h-10 w-full rounded-lg border border-zinc-300 bg-white py-2 pl-10 pr-3 text-sm text-zinc-800 shadow-sm outline-none placeholder:text-zinc-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        onChange={(event) => onChange(event.target.value)}
        placeholder="지원자 이름 검색"
        type="search"
        value={value}
      />
    </label>
  )
}
