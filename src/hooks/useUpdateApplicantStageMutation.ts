import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useApplicantApi } from '../contexts/useApplicantApi'
import type { Applicant, ApplicantStage } from '../models/applicant'
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
    onMutate: async ({ applicantId, stage }) => {
      await queryClient.cancelQueries({ queryKey: APPLICANT_QUERY_KEY })
      const previousApplicants =
        queryClient.getQueryData<Applicant[]>(APPLICANT_QUERY_KEY)

      queryClient.setQueryData<Applicant[]>(
        APPLICANT_QUERY_KEY,
        (applicants) =>
          applicants?.map((applicant) =>
            applicant.id === applicantId ? { ...applicant, stage } : applicant,
          ),
      )

      return { previousApplicants }
    },
    onError: (_error, _variables, context) => {
      if (context?.previousApplicants) {
        queryClient.setQueryData(
          APPLICANT_QUERY_KEY,
          context.previousApplicants,
        )
      }

      toast.error('단계 변경을 저장하지 못해 이전 단계로 되돌렸습니다.')
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: APPLICANT_QUERY_KEY })
    },
  })
}
