import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApplicantApiProvider } from '../contexts/ApplicantApiProvider'
import { APPLICANT_STAGE } from '../models/applicant'
import type { Applicant } from '../models/applicant'
import type { ApplicantApi } from '../services/applicantApi'
import { ContentComponent } from './ContentComponent'

interface ApplicantBoardProps {
  searchTerm: string
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

afterEach(() => {
  vi.useRealTimers()
  cleanup()
  applicantBoard.latestProps = undefined
})

describe('ContentComponent', () => {
  it('shows job options returned by the job-options API', async () => {
    const api: ApplicantApi = {
      getApplicants: vi.fn(async () => [applicant]),
      getJobOptions: vi.fn(async () => ['QA Engineer']),
      updateApplicantStage: vi.fn(),
    }
    const queryClient = new QueryClient()

    render(
      <QueryClientProvider client={queryClient}>
        <ApplicantApiProvider api={api}>
          <ContentComponent />
        </ApplicantApiProvider>
      </QueryClientProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: '직무 전체' }))

    expect(
      await screen.findByRole('checkbox', { name: 'QA Engineer' }),
    ).toBeTruthy()
    expect(
      screen.queryByRole('checkbox', { name: 'Frontend Engineer' }),
    ).toBeNull()
  })

  it('renders name search and job filter controls below the title in order', () => {
    const api: ApplicantApi = {
      getApplicants: vi.fn(async () => [applicant, designerApplicant]),
      getJobOptions: vi.fn(async () => [
        'Frontend Engineer',
        'Product Designer',
      ]),
      updateApplicantStage: vi.fn(),
    }
    const queryClient = new QueryClient()

    render(
      <QueryClientProvider client={queryClient}>
        <ApplicantApiProvider api={api}>
          <ContentComponent />
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
  })

  it('opens a multi-select job dropdown, reports its count, and supports dismissal', async () => {
    const api: ApplicantApi = {
      getApplicants: vi.fn(async () => [applicant, designerApplicant]),
      getJobOptions: vi.fn(async () => [
        'Frontend Engineer',
        'Product Designer',
      ]),
      updateApplicantStage: vi.fn(),
    }
    const queryClient = new QueryClient()

    render(
      <QueryClientProvider client={queryClient}>
        <ApplicantApiProvider api={api}>
          <ContentComponent />
        </ApplicantApiProvider>
      </QueryClientProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: '직무 전체' }))
    fireEvent.click(
      await screen.findByRole('checkbox', { name: 'Frontend Engineer' }),
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

  it('shows the entered value immediately and passes it to the board after 150ms', () => {
    vi.useFakeTimers()
    const api: ApplicantApi = {
      getApplicants: vi.fn(),
      getJobOptions: vi.fn(async () => []),
      updateApplicantStage: vi.fn(),
    }
    const queryClient = new QueryClient()

    render(
      <QueryClientProvider client={queryClient}>
        <ApplicantApiProvider api={api}>
          <ContentComponent />
        </ApplicantApiProvider>
      </QueryClientProvider>,
    )

    const search = screen.getByRole<HTMLInputElement>('searchbox', {
      name: '지원자 이름 검색',
    })
    fireEvent.change(search, { target: { value: 'Kim' } })

    expect(search.value).toBe('Kim')
    expect(applicantBoard.latestProps?.searchTerm).toBe('')

    act(() => {
      vi.advanceTimersByTime(149)
    })
    expect(applicantBoard.latestProps?.searchTerm).toBe('')

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(applicantBoard.latestProps?.searchTerm).toBe('Kim')
  })
})
