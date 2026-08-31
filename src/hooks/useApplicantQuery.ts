import { useQuery } from '@tanstack/react-query'
import { useApplicantApi } from '../contexts/useApplicantApi'

const APPLICANT_QUERY_KEY = ['applicants'] as const

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
