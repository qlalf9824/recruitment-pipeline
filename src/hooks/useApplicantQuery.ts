import { useQuery } from '@tanstack/react-query'
import { useApplicantApi } from '../contexts/useApplicantApi'

export const APPLICANT_QUERY_KEY = ['applicants'] as const

export function useApplicantQuery() {
  const applicantApi = useApplicantApi()

  return useQuery({
    queryKey: APPLICANT_QUERY_KEY,
    queryFn: () => applicantApi.getApplicants(),
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })
}
