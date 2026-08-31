import { isApplicantStage } from '../models/applicant'
import type { Applicant, ApplicantStage } from '../models/applicant'

interface ResolveApplicantStageDropInput {
  applicants: Applicant[]
  isCanceled: boolean
  sourceId: string | number | undefined
  targetId: string | number | undefined
}

export interface ApplicantStageDrop {
  applicantId: string
  stage: ApplicantStage
}

export function resolveApplicantStageDrop(
  input: ResolveApplicantStageDropInput,
): ApplicantStageDrop | null {
  if (input.isCanceled || input.sourceId === undefined || input.targetId === undefined) {
    return null
  }

  const applicant = input.applicants.find(
    ({ id }) => id === String(input.sourceId),
  )

  if (!applicant || !isApplicantStage(input.targetId)) {
    return null
  }

  if (applicant.stage === input.targetId) {
    return null
  }

  return {
    applicantId: applicant.id,
    stage: input.targetId,
  }
}
