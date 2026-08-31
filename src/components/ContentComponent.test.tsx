import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
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

const designerApplicant: Applicant = {
  ...applicant,
  id: 'applicant-2',
  name: 'Park Design',
  position: 'Product Designer',
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
  it('renders name search and job filter controls below the title in order', () => {
    const api: ApplicantApi = {
      getApplicants: vi.fn(async () => [applicant, designerApplicant]),
      updateApplicantStage: vi.fn(),
    }
    const queryClient = new QueryClient()

    render(
      <QueryClientProvider client={queryClient}>
        <ApplicantApiProvider api={api}>
          <ContentComponent applicants={[applicant, designerApplicant]} />
        </ApplicantApiProvider>
      </QueryClientProvider>,
    )

    const title = screen.getByRole('heading', { name: '지원자 관리' })
    const search = screen.getByRole('searchbox', { name: '지원자 이름 검색' })
    const jobFilter = screen.getByRole('button', { name: '직무 전체' })
    const filter = screen.getByRole('region', { name: '지원자 필터' })

    expect(
      title.compareDocumentPosition(search) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    expect(
      search.compareDocumentPosition(jobFilter) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    expect(filter.classList.contains('flex')).toBe(true)

    fireEvent.change(search, { target: { value: 'Kim' } })
    expect((search as HTMLInputElement).value).toBe('Kim')
  })

  it('opens a multi-select job dropdown, reports its count, and supports dismissal', () => {
    const api: ApplicantApi = {
      getApplicants: vi.fn(async () => [applicant, designerApplicant]),
      updateApplicantStage: vi.fn(),
    }
    const queryClient = new QueryClient()

    render(
      <QueryClientProvider client={queryClient}>
        <ApplicantApiProvider api={api}>
          <ContentComponent applicants={[applicant, designerApplicant]} />
        </ApplicantApiProvider>
      </QueryClientProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: '직무 전체' }))
    fireEvent.click(
      screen.getByRole('checkbox', { name: 'Frontend Engineer' }),
    )
    fireEvent.click(
      screen.getByRole('checkbox', { name: 'Product Designer' }),
    )

    expect(
      screen.getByRole('button', { name: '직무 2개 선택' }),
    ).toBeTruthy()

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(
      screen.queryByRole('checkbox', { name: 'Frontend Engineer' }),
    ).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: '직무 2개 선택' }))
    fireEvent.pointerDown(document.body)

    expect(
      screen.queryByRole('checkbox', { name: 'Frontend Engineer' }),
    ).toBeNull()
  })

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
