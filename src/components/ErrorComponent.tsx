interface ErrorComponentProps {
  isRetrying: boolean
  onRetry(): void
}

export function ErrorComponent({
  isRetrying,
  onRetry,
}: ErrorComponentProps) {
  return (
    <main className="grid min-h-screen place-items-center px-6 py-10">
      <div
        className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white px-6 py-8 text-center shadow-sm"
        role="alert"
      >
        <span
          aria-hidden="true"
          className="mx-auto mb-4 grid size-10 place-items-center rounded-full bg-red-50 text-lg font-semibold text-red-600"
        >
          !
        </span>
        <h2 className="m-0 text-lg font-semibold leading-7 text-zinc-800">
          지원자 정보를 불러오지 못했습니다.
        </h2>
        <button
          className="mt-6 inline-flex min-h-10 items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:bg-blue-300"
          disabled={isRetrying}
          onClick={onRetry}
          type="button"
        >
          {isRetrying ? '다시 시도 중' : '다시 시도'}
        </button>
      </div>
    </main>
  )
}
