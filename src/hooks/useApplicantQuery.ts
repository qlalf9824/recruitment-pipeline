import { useQuery } from '@tanstack/react-query'
import { useApplicantApi } from '../contexts/useApplicantApi'

export const APPLICANT_QUERY_KEY = ['applicants'] as const

export function useApplicantQuery(searchTerm = '', selectedJobs: string[] = []) {
  const applicantApi = useApplicantApi()

  return useQuery({
    queryKey: [...APPLICANT_QUERY_KEY, searchTerm, selectedJobs],
    queryFn: () => applicantApi.getApplicants({ searchTerm, selectedJobs }),
    placeholderData: (previousData) => previousData,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })
}
