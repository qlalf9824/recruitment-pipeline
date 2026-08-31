import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useApplicantApi } from '../contexts/useApplicantApi'
import type { ApplicantStage } from '../models/applicant'
import { APPLICANT_QUERY_KEY } from './useApplicantQuery'

interface UpdateApplicantStageVariables {
  applicantId: string
  stage: ApplicantStage
}

export function useUpdateApplicantStageMutation() {
  const applicantApi = useApplicantApi()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ applicantId, stage }: UpdateApplicantStageVariables) =>
      applicantApi.updateApplicantStage(applicantId, stage),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: APPLICANT_QUERY_KEY })
    },
  })
}
