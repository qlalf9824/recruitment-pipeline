import { Feedback } from "@dnd-kit/dom";
import { DragDropProvider } from "@dnd-kit/react";
import type { DragEndEvent } from "@dnd-kit/react";
import type { Applicant } from "../models/applicant";
import type { ApplicantStage } from "../models/applicant";
import { APPLICANT_BOARD_STAGES } from "./applicantBoardStages";
import { BoardColumn } from "./BoardColumn";
import { resolveApplicantStageDrop } from "./resolveApplicantStageDrop";

interface ApplicantBoardProps {
  applicants: Applicant[];
  movingApplicantId?: string;
  onMoveApplicant(applicantId: string, stage: ApplicantStage): void;
}

export function ApplicantBoard({
  applicants,
  movingApplicantId,
  onMoveApplicant,
}: ApplicantBoardProps) {
  const isBoardEmpty = applicants.length === 0;

  const handleDragEnd = (event: DragEndEvent) => {
    const move = resolveApplicantStageDrop({
      applicants,
      isCanceled: event.canceled,
      sourceId: event.operation.source?.id,
      targetId: event.operation.target?.id,
    });

    if (move) {
      onMoveApplicant(move.applicantId, move.stage);
    }
  };

  return (
    <DragDropProvider
      onDragEnd={handleDragEnd}
      plugins={(defaults) => [
        ...defaults,
        Feedback.configure({ dropAnimation: null }),
      ]}
    >
      <div
        className="grid min-w-[1200px] grid-cols-5 gap-3"
        aria-label="채용 단계"
      >
        {APPLICANT_BOARD_STAGES.map(
          ({
            columnClassName,
            countClassName,
            label,
            stage,
            statusClassName,
          }) => (
            <BoardColumn
              key={stage}
              applicants={applicants.filter(
                (applicant) => applicant.stage === stage,
              )}
              columnClassName={columnClassName}
              countClassName={countClassName}
              isBoardEmpty={isBoardEmpty}
              label={label}
              movingApplicantId={movingApplicantId}
              stage={stage}
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
    </DragDropProvider>
  );
}
