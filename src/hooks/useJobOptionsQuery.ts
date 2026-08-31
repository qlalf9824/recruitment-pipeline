import { useQuery } from '@tanstack/react-query'
import { useApplicantApi } from '../contexts/useApplicantApi'

export const JOB_OPTIONS_QUERY_KEY = ['applicant-job-options'] as const

export const useJobOptionsQuery = () => {
  const applicantApi = useApplicantApi()

  return useQuery({
    queryKey: JOB_OPTIONS_QUERY_KEY,
    queryFn: () => applicantApi.getJobOptions(),
    staleTime: Infinity,
    retry: false,
  })
}
