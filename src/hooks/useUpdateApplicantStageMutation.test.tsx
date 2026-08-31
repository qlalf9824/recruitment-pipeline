import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { ApplicantApiProvider } from '../contexts/ApplicantApiProvider'
import { APPLICANT_STAGE } from '../models/applicant'
import type { Applicant } from '../models/applicant'
import type { ApplicantApi } from '../services/applicantApi'
import { APPLICANT_QUERY_KEY } from './useApplicantQuery'
import { useUpdateApplicantStageMutation } from './useUpdateApplicantStageMutation'

const applicant: Applicant = {
  id: 'applicant-1',
  name: 'Kim Codex',
  position: 'Frontend Engineer',
  appliedAt: '2026-08-31',
  stage: APPLICANT_STAGE.DOCUMENT_REVIEW,
}

describe('useUpdateApplicantStageMutation', () => {
  it('saves the requested stage and invalidates the applicant query', async () => {
    const queryClient = new QueryClient()
    queryClient.setQueryData(APPLICANT_QUERY_KEY, [applicant])
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries')
    const updateApplicantStage = vi.fn(async () => ({
      ...applicant,
      stage: APPLICANT_STAGE.INTERVIEW,
    }))
    const api: ApplicantApi = {
      getApplicants: vi.fn(async () => [applicant]),
      updateApplicantStage,
    }
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>
        <ApplicantApiProvider api={api}>{children}</ApplicantApiProvider>
      </QueryClientProvider>
    )
    const { result } = renderHook(() => useUpdateApplicantStageMutation(), {
      wrapper,
    })

    await act(async () => {
      await result.current.mutateAsync({
        applicantId: 'applicant-1',
        stage: APPLICANT_STAGE.INTERVIEW,
      })
    })

    expect(updateApplicantStage).toHaveBeenCalledWith(
      'applicant-1',
      APPLICANT_STAGE.INTERVIEW,
    )
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: APPLICANT_QUERY_KEY,
    })
  })

  it('does not invalidate the applicant query when saving the stage fails', async () => {
    const queryClient = new QueryClient()
    queryClient.setQueryData(APPLICANT_QUERY_KEY, [applicant])
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries')
    const updateApplicantStage = vi.fn(async () => {
      throw new Error('update failed')
    })
    const api: ApplicantApi = {
      getApplicants: vi.fn(async () => [applicant]),
      updateApplicantStage,
    }
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>
        <ApplicantApiProvider api={api}>{children}</ApplicantApiProvider>
      </QueryClientProvider>
    )
    const { result } = renderHook(() => useUpdateApplicantStageMutation(), {
      wrapper,
    })

    await act(async () => {
      await expect(
        result.current.mutateAsync({
          applicantId: 'applicant-1',
          stage: APPLICANT_STAGE.INTERVIEW,
        }),
      ).rejects.toThrow('update failed')
    })

    expect(invalidateQueries).not.toHaveBeenCalled()
  })
})
