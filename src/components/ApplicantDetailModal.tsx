import * as Dialog from '@radix-ui/react-dialog'
import type { Applicant } from '../models/applicant'
import { getApplicantStageLabel } from './applicantBoardStages'

interface ApplicantDetailModalProps {
  applicant: Applicant | null
  onClose: () => void
}

export function ApplicantDetailModal({
  applicant,
  onClose,
}: ApplicantDetailModalProps) {
  return (
    <Dialog.Root
      open={applicant !== null}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose()
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-40 bg-zinc-950/45"
          data-testid="applicant-detail-overlay"
        />
        {applicant && (
          <Dialog.Content
            className="fixed left-1/2 top-1/2 z-50 max-h-[calc(100vh-2rem)] w-[min(92vw,560px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl focus:outline-none"
            onInteractOutside={(event) => event.preventDefault()}
            onPointerDownOutside={(event) => event.preventDefault()}
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <Dialog.Title className="text-lg font-semibold text-zinc-900">
                {applicant.name} 지원자 상세
              </Dialog.Title>
              <Dialog.Close asChild>
                <button
                  aria-label="상세 보기 닫기"
                  className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-xl leading-none text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                  type="button"
                >
                  <span aria-hidden="true">×</span>
                </button>
              </Dialog.Close>
            </div>

            <dl className="grid grid-cols-[max-content_minmax(0,1fr)] gap-x-5 gap-y-3 border-b border-zinc-200 pb-6 text-sm leading-6">
              <dt className="font-medium text-zinc-500">이름</dt>
              <dd className="m-0 text-zinc-800">{applicant.name}</dd>
              <dt className="font-medium text-zinc-500">직무</dt>
              <dd className="m-0 text-zinc-800">{applicant.position}</dd>
              <dt className="font-medium text-zinc-500">지원일</dt>
              <dd className="m-0 text-zinc-800">{applicant.appliedAt}</dd>
              <dt className="font-medium text-zinc-500">현재 단계</dt>
              <dd className="m-0 text-zinc-800">
                {getApplicantStageLabel(applicant.stage)}
              </dd>
            </dl>

            <div className="mt-6 grid gap-6">
              <section aria-labelledby="applicant-resume-title">
                <h3
                  className="mb-2 text-sm font-semibold text-zinc-800"
                  id="applicant-resume-title"
                >
                  이력 정보
                </h3>
                <p className="m-0 min-h-6 whitespace-pre-wrap text-sm leading-6 text-zinc-700">
                  {applicant.resume}
                </p>
              </section>
              <section aria-labelledby="applicant-memo-title">
                <h3
                  className="mb-2 text-sm font-semibold text-zinc-800"
                  id="applicant-memo-title"
                >
                  메모
                </h3>
                <p className="m-0 min-h-6 whitespace-pre-wrap text-sm leading-6 text-zinc-700">
                  {applicant.memo}
                </p>
              </section>
            </div>
          </Dialog.Content>
        )}
      </Dialog.Portal>
    </Dialog.Root>
  )
}
