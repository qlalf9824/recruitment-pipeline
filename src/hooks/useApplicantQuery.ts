import { useQuery } from '@tanstack/react-query'
import { useApplicantApi } from '../contexts/useApplicantApi'

export const APPLICANT_QUERY_KEY = ['applicants'] as const

export function useApplicantQuery(searchTerm = '') {
  const applicantApi = useApplicantApi()

  return useQuery({
    queryKey: [...APPLICANT_QUERY_KEY, searchTerm],
    queryFn: () => applicantApi.getApplicants({ searchTerm }),
    placeholderData: (previousData) => previousData,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })
}
