import type { PropsWithChildren } from 'react'
import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ApplicantApi } from '../services/applicantApi'
import { ApplicantApiProvider } from './ApplicantApiProvider'
import { useApplicantApi } from './useApplicantApi'

const applicantApi: ApplicantApi = {
  getApplicants: vi.fn(async () => []),
  updateApplicantStage: vi.fn(async (id, stage) => ({
    id,
    name: 'Kim Codex',
    position: 'Frontend Engineer',
    appliedAt: '2026-08-31',
    stage,
  })),
}

describe('ApplicantApiContext', () => {
  it('returns the same injected API across rerenders', () => {
    const wrapper = ({ children }: PropsWithChildren) => (
      <ApplicantApiProvider api={applicantApi}>
        {children}
      </ApplicantApiProvider>
    )

    const { result, rerender } = renderHook(() => useApplicantApi(), {
      wrapper,
    })

    expect(result.current).toBe(applicantApi)
    rerender()
    expect(result.current).toBe(applicantApi)
  })

  it('throws a clear error outside the provider', () => {
    expect(() => renderHook(() => useApplicantApi())).toThrow(
      'useApplicantApi must be used within ApplicantApiProvider.',
    )
  })
})
