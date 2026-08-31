import { Feedback } from '@dnd-kit/dom'
import { DragDropProvider } from '@dnd-kit/react'
import type { DragEndEvent } from '@dnd-kit/react'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { useApplicantQuery } from '../hooks/useApplicantQuery'
import { useUpdateApplicantStageMutation } from '../hooks/useUpdateApplicantStageMutation'
import type { Applicant, ApplicantStage } from '../models/applicant'
import { APPLICANT_BOARD_STAGES } from './applicantBoardStages'
import { BoardColumn } from './BoardColumn'
import { ApplicantDetailModal } from './ApplicantDetailModal'
import { resolveApplicantStageDrop } from './resolveApplicantStageDrop'

interface ApplicantBoardProps {
  searchTerm: string
  selectedJobs: string[]
}

interface BoardColumnsProps {
  applicants: Applicant[]
  movingApplicantId?: string
  onSelectApplicant: (applicantId: string) => void
}

const BoardColumns = ({
  applicants,
  movingApplicantId,
  onSelectApplicant,
}: BoardColumnsProps) => {
  const isBoardEmpty = applicants.length === 0

  return APPLICANT_BOARD_STAGES.map(
    ({ columnClassName, countClassName, label, stage, statusClassName }) => (
      <BoardColumn
        key={stage}
        applicants={applicants.filter((applicant) => applicant.stage === stage)}
        columnClassName={columnClassName}
        countClassName={countClassName}
        isBoardEmpty={isBoardEmpty}
        label={label}
        movingApplicantId={movingApplicantId}
        onSelectApplicant={onSelectApplicant}
        stage={stage}
        statusClassName={statusClassName}
      />
    ),
  )
}

const BoardMessage = ({
  children,
  label,
  role,
}: {
  children: ReactNode
  label?: string
  role?: 'alert' | 'status'
}) => (
  <div
    aria-label={label}
    className="col-span-5 rounded-xl border border-dashed border-zinc-300 bg-white px-4 py-10 text-center text-[13px] leading-6 text-zinc-500"
    role={role}
  >
    {children}
  </div>
)

export function ApplicantBoard({
  searchTerm,
  selectedJobs,
}: ApplicantBoardProps) {
  const [isRetryingError, setIsRetryingError] = useState(false)
  const [selectedApplicantId, setSelectedApplicantId] = useState<string | null>(
    null,
  )
  const { data = [], isError, isFetching, isPending, refetch } =
    useApplicantQuery(searchTerm, selectedJobs)
  const updateStageMutation = useUpdateApplicantStageMutation()

  const handleMoveApplicant = (applicantId: string, stage: ApplicantStage) => {
    if (updateStageMutation.isPending) return
    updateStageMutation.mutate({ applicantId, stage })
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const move = resolveApplicantStageDrop({
      applicants: data,
      isCanceled: event.canceled,
      sourceId: event.operation.source?.id,
      targetId: event.operation.target?.id,
    })

    if (move) handleMoveApplicant(move.applicantId, move.stage)
  }

  const handleRetry = () => {
    setIsRetryingError(true)
    void refetch()
  }

  const handleSelectApplicant = (applicantId: string) => {
    setSelectedApplicantId(applicantId)
  }

  const handleCloseApplicantDetail = () => {
    setSelectedApplicantId(null)
  }

  const movingApplicantId = updateStageMutation.isPending
    ? updateStageMutation.variables?.applicantId
    : undefined
  const isInitialLoading = isPending && data.length === 0
  const shouldShowError =
    isError || (isRetryingError && isFetching && data.length === 0)
  const hasFilters = Boolean(searchTerm.trim()) || selectedJobs.length > 0
  const emptyMessage = hasFilters
    ? '검색 조건에 맞는 지원자가 없습니다.'
    : '지원자가 없습니다'
  const selectedApplicant =
    data.find((applicant) => applicant.id === selectedApplicantId) ?? null

  return (
    <>
      <div
        aria-busy={isFetching}
        aria-label="채용 단계 보드"
        className="overflow-x-auto rounded-[14px] focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-blue-600"
        role="region"
        tabIndex={0}
      >
        <DragDropProvider
          onDragEnd={handleDragEnd}
          plugins={(defaults) => [
            ...defaults,
            Feedback.configure({ dropAnimation: null }),
          ]}
        >
          <div
            aria-label="채용 단계"
            className="grid min-w-[1200px] grid-cols-5 gap-3"
          >
            <BoardColumns
              applicants={shouldShowError || isInitialLoading ? [] : data}
              movingApplicantId={movingApplicantId}
              onSelectApplicant={handleSelectApplicant}
            />
            {isInitialLoading && (
              <BoardMessage
                label="지원자 정보를 불러오는 중입니다."
                role="status"
              >
                지원자 정보를 불러오는 중입니다.
              </BoardMessage>
            )}
            {shouldShowError && (
              <BoardMessage role="alert">
                <p className="font-semibold text-zinc-700">
                  지원자 정보를 불러오지 못했습니다.
                </p>
                <button
                  className="mt-4 inline-flex min-h-10 items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-blue-300"
                  disabled={isFetching}
                  onClick={handleRetry}
                  type="button"
                >
                  {isFetching ? '다시 시도 중' : '다시 시도'}
                </button>
              </BoardMessage>
            )}
            {!isPending && !shouldShowError && data.length === 0 && (
              <BoardMessage>{emptyMessage}</BoardMessage>
            )}
          </div>
        </DragDropProvider>
      </div>
      <ApplicantDetailModal
        applicant={selectedApplicant}
        onClose={handleCloseApplicantDetail}
      />
    </>
  )
}
