interface ErrorComponentProps {
  isRetrying: boolean
  onRetry(): void
}

export function ErrorComponent({
  isRetrying,
  onRetry,
}: ErrorComponentProps) {
  return (
    <div role="alert">
      <p>지원자 정보를 불러오지 못했습니다.</p>
      <button type="button" onClick={onRetry} disabled={isRetrying}>
        {isRetrying ? '다시 시도 중' : '다시 시도'}
      </button>
    </div>
  )
}
