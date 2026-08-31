import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { toast } from 'sonner'
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

function createDeferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })

  return { promise, reject, resolve }
}

describe('useUpdateApplicantStageMutation', () => {
  it('saves the requested stage and invalidates the applicant query', async () => {
    const queryClient = new QueryClient()
    queryClient.setQueryData(APPLICANT_QUERY_KEY, [applicant])
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries')
    const updateRequest = createDeferred<Applicant>()
    const updateApplicantStage = vi.fn(() => updateRequest.promise)
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

    let mutationPromise!: Promise<Applicant>
    act(() => {
      mutationPromise = result.current.mutateAsync({
        applicantId: 'applicant-1',
        stage: APPLICANT_STAGE.INTERVIEW,
      })
    })

    await waitFor(() => {
      expect(queryClient.getQueryData<Applicant[]>(APPLICANT_QUERY_KEY)).toEqual([
        { ...applicant, stage: APPLICANT_STAGE.INTERVIEW },
      ])
    })

    await act(async () => {
      updateRequest.resolve({
        ...applicant,
        stage: APPLICANT_STAGE.INTERVIEW,
      })
      await mutationPromise
    })

    expect(updateApplicantStage).toHaveBeenCalledWith(
      'applicant-1',
      APPLICANT_STAGE.INTERVIEW,
    )
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: APPLICANT_QUERY_KEY,
    })
  })

  it('rolls back the optimistic stage and reports the failure when saving fails', async () => {
    const queryClient = new QueryClient()
    queryClient.setQueryData(APPLICANT_QUERY_KEY, [applicant])
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries')
    const updateRequest = createDeferred<Applicant>()
    const updateApplicantStage = vi.fn(() => updateRequest.promise)
    const toastError = vi.spyOn(toast, 'error').mockImplementation(() => 'toast-id')
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

    const mutationPromise = result.current.mutateAsync({
      applicantId: 'applicant-1',
      stage: APPLICANT_STAGE.INTERVIEW,
    })

    await waitFor(() => {
      expect(queryClient.getQueryData<Applicant[]>(APPLICANT_QUERY_KEY)).toEqual([
        { ...applicant, stage: APPLICANT_STAGE.INTERVIEW },
      ])
    })

    await act(async () => {
      updateRequest.reject(new Error('update failed'))
      await expect(mutationPromise).rejects.toThrow('update failed')
    })

    expect(queryClient.getQueryData(APPLICANT_QUERY_KEY)).toEqual([applicant])
    expect(toastError).toHaveBeenCalledWith(
      '단계 변경을 저장하지 못해 이전 단계로 되돌렸습니다.',
    )
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: APPLICANT_QUERY_KEY,
    })
  })
})
