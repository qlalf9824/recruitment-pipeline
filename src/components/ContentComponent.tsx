import type { Applicant } from "../models/applicant";
import type { ApplicantStage } from "../models/applicant";
import { useUpdateApplicantStageMutation } from "../hooks/useUpdateApplicantStageMutation";
import { ApplicantBoard } from "./ApplicantBoard";

interface ContentComponentProps {
  applicants: Applicant[];
}

export function ContentComponent({ applicants }: ContentComponentProps) {
  const updateStageMutation = useUpdateApplicantStageMutation();

  const handleMoveApplicant = (applicantId: string, stage: ApplicantStage) => {
    if (updateStageMutation.isPending) return;

    updateStageMutation.mutate({ applicantId, stage });
  };

  const movingApplicantId = updateStageMutation.isPending
    ? updateStageMutation.variables?.applicantId
    : undefined;

  return (
    <main className="mx-auto w-[min(calc(100%-2rem),90rem)] py-8 max-sm:w-[min(calc(100%-1.5rem),90rem)] max-sm:py-6">
      <h1 className="mb-[18px] text-2xl font-semibold leading-[1.3] tracking-[-0.02em] text-zinc-800 max-sm:mb-3.5">
        지원자 관리
      </h1>
      <div
        aria-label="채용 단계 보드"
        className="overflow-x-auto rounded-[14px] focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-blue-600"
        role="region"
        tabIndex={0}
      >
        <ApplicantBoard
          applicants={applicants}
          movingApplicantId={movingApplicantId}
          onMoveApplicant={handleMoveApplicant}
        />
      </div>
    </main>
  );
}
