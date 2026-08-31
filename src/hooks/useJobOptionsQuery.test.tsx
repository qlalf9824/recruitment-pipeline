import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApplicantApiProvider } from '../contexts/ApplicantApiProvider'
import type { ApplicantApi } from '../services/applicantApi'
import {
  JOB_OPTIONS_QUERY_KEY,
  useJobOptionsQuery,
} from './useJobOptionsQuery'

afterEach(cleanup)

describe('useJobOptionsQuery', () => {
  it('loads job options from the applicant API under its fixed query key', async () => {
    const getJobOptions = vi.fn(async () => ['Frontend Engineer'])
    const api: ApplicantApi = {
      getApplicants: vi.fn(),
      getJobOptions,
      updateApplicantStage: vi.fn(),
    }
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <ApplicantApiProvider api={api}>{children}</ApplicantApiProvider>
      </QueryClientProvider>
    )

    const { result } = renderHook(() => useJobOptionsQuery(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(['Frontend Engineer'])
    expect(
      queryClient.getQueryData<string[]>(JOB_OPTIONS_QUERY_KEY),
    ).toEqual(['Frontend Engineer'])
    expect(getJobOptions).toHaveBeenCalledTimes(1)
  })
})
