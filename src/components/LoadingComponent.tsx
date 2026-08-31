export function LoadingComponent() {
  return (
    <main className="grid min-h-screen place-items-center px-6 py-10">
      <div
        aria-busy="true"
        aria-label="지원자 정보를 불러오는 중입니다."
        className="flex flex-col items-center gap-4 text-center"
        role="status"
      >
        <span
          aria-hidden="true"
          className="size-8 animate-spin rounded-full border-[3px] border-blue-100 border-t-blue-600"
        />
        <p className="m-0 text-sm font-medium text-zinc-600">
          지원자 정보를 불러오는 중입니다.
        </p>
      </div>
    </main>
  )
}
