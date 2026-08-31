import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, render, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApplicantApiProvider } from '../contexts/ApplicantApiProvider'
import { useApplicantQuery } from '../hooks/useApplicantQuery'
import { APPLICANT_STAGE } from '../models/applicant'
import type { Applicant, ApplicantStage } from '../models/applicant'
import type { ApplicantApi } from '../services/applicantApi'
import { ContentComponent } from './ContentComponent'

interface ApplicantBoardProps {
  applicants: Applicant[]
  movingApplicantId?: string
  onMoveApplicant(applicantId: string, stage: ApplicantStage): void
}

const applicantBoard = vi.hoisted(() => ({
  latestProps: undefined as ApplicantBoardProps | undefined,
}))

vi.mock('./ApplicantBoard', () => ({
  ApplicantBoard: (props: ApplicantBoardProps) => {
    applicantBoard.latestProps = props
    return null
  },
}))

const applicant: Applicant = {
  id: 'applicant-1',
  name: 'Kim Codex',
  position: 'Frontend Engineer',
  appliedAt: '2026-08-31',
  stage: APPLICANT_STAGE.DOCUMENT_REVIEW,
}

function ActiveApplicantQuery() {
  useApplicantQuery()
  return null
}

afterEach(() => {
  cleanup()
  applicantBoard.latestProps = undefined
})

describe('ContentComponent', () => {
  it('saves a delivered move and refreshes the active applicant query', async () => {
    const getApplicants = vi.fn(async () => [applicant])
    const updateApplicantStage = vi.fn(async () => ({
      ...applicant,
      stage: APPLICANT_STAGE.INTERVIEW,
    }))
    const api: ApplicantApi = { getApplicants, updateApplicantStage }
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    render(
      <QueryClientProvider client={queryClient}>
        <ApplicantApiProvider api={api}>
          <ActiveApplicantQuery />
          <ContentComponent applicants={[applicant]} />
        </ApplicantApiProvider>
      </QueryClientProvider>,
    )

    await waitFor(() => {
      expect(getApplicants).toHaveBeenCalledTimes(1)
    })

    await act(async () => {
      applicantBoard.latestProps?.onMoveApplicant(
        'applicant-1',
        APPLICANT_STAGE.INTERVIEW,
      )
    })

    expect(updateApplicantStage).toHaveBeenCalledTimes(1)
    expect(updateApplicantStage).toHaveBeenCalledWith(
      'applicant-1',
      APPLICANT_STAGE.INTERVIEW,
    )
    await waitFor(() => {
      expect(getApplicants).toHaveBeenCalledTimes(2)
    })
  })
})
