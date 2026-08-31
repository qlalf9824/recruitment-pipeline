import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Feedback } from '@dnd-kit/dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ApplicantApiProvider } from '../contexts/ApplicantApiProvider'
import { APPLICANT_STAGE } from '../models/applicant'
import type { Applicant } from '../models/applicant'
import type { ApplicantApi } from '../services/applicantApi'
import { ApplicantBoard } from './ApplicantBoard'

const dragDropProvider = vi.hoisted(() => ({
  onDragEnd: undefined as undefined | ((event: unknown) => void),
  plugins: undefined as
    | undefined
    | ((defaults: unknown[]) => unknown[]),
}))

vi.mock('@dnd-kit/react', async () => {
  const actual = await vi.importActual<typeof import('@dnd-kit/react')>(
    '@dnd-kit/react',
  )

  return {
    ...actual,
    DragDropProvider: ({
      children,
      onDragEnd,
      plugins,
    }: {
      children: React.ReactNode
      onDragEnd?: (event: unknown) => void
      plugins?: (defaults: unknown[]) => unknown[]
    }) => {
      dragDropProvider.onDragEnd = onDragEnd
      dragDropProvider.plugins = plugins
      return children
    },
  }
})

const interviewApplicant: Applicant = {
  id: 'interview-applicant',
  name: '이준호',
  position: 'Backend Engineer',
  appliedAt: '2026-08-21',
  stage: APPLICANT_STAGE.INTERVIEW,
}

const rejectedApplicant: Applicant = {
  id: 'rejected-applicant',
  name: '박서연',
  position: 'Product Designer',
  appliedAt: '2026-08-22',
  stage: APPLICANT_STAGE.REJECTED,
}

afterEach(() => {
  cleanup()
  dragDropProvider.onDragEnd = undefined
  dragDropProvider.plugins = undefined
})

function renderApplicantBoard(
  applicants: Applicant[],
) {
  const updateApplicantStage = vi.fn(async (id: string, stage: Applicant['stage']) => ({
    ...applicants.find((applicant) => applicant.id === id)!,
    stage,
  }))
  const api: ApplicantApi = {
    getApplicants: vi.fn(async () => applicants),
    getJobOptions: vi.fn(async () => []),
    updateApplicantStage,
  }
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  queryClient.setQueryData(['applicants', '', []], applicants)

  const result = render(
    <QueryClientProvider client={queryClient}>
      <ApplicantApiProvider api={api}>
        <ApplicantBoard searchTerm="" selectedJobs={[]} />
      </ApplicantApiProvider>
    </QueryClientProvider>,
  )

  return { ...result, updateApplicantStage }
}

function renderQueryOwnedBoard(getApplicants: ApplicantApi['getApplicants']) {
  const api: ApplicantApi = {
    getApplicants,
    getJobOptions: vi.fn(async () => []),
    updateApplicantStage: vi.fn(),
  }
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <ApplicantApiProvider api={api}>
        <ApplicantBoard searchTerm="" selectedJobs={[]} />
      </ApplicantApiProvider>
    </QueryClientProvider>,
  )
}

describe('ApplicantBoard', () => {
  it('keeps five headers and shows one loading message during the initial request', () => {
    renderQueryOwnedBoard(() => new Promise<Applicant[]>(() => undefined))

    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(5)
    expect(screen.getByRole('status').textContent).toBe(
      '지원자 정보를 불러오는 중입니다.',
    )
  })

  it('groups each applicant in its matching fixed-stage column', () => {
    renderApplicantBoard([interviewApplicant, rejectedApplicant])

    const headings = screen.getAllByRole('heading', { level: 2 })
    expect(headings.map((heading) => heading.textContent)).toEqual([
      '서류검토0',
      '면접1',
      '처우협의0',
      '최종합격0',
      '불합격1',
    ])

    const interviewColumn = screen.getByRole('region', { name: '면접 단계' })
    expect(
      within(interviewColumn).getByRole('article', { name: '이준호 지원자' }),
    ).toBeTruthy()
    expect(screen.getAllByRole('article', { name: '이준호 지원자' })).toHaveLength(
      1,
    )
    expect(within(interviewColumn).getByRole('list')).toBeTruthy()
    expect(within(interviewColumn).getAllByRole('listitem')).toHaveLength(1)

    const rejectedColumn = screen.getByRole('region', { name: '불합격 단계' })
    expect(
      within(rejectedColumn).getByRole('article', { name: '박서연 지원자' }),
    ).toBeTruthy()
    expect(screen.getAllByRole('article', { name: '박서연 지원자' })).toHaveLength(
      1,
    )
    expect(within(rejectedColumn).getAllByRole('listitem')).toHaveLength(1)
  })

  it('shows one empty message in an unpopulated column when the board has data', () => {
    renderApplicantBoard([interviewApplicant])
    const emptyColumnLabels = ['서류검토', '처우협의', '최종합격', '불합격']

    emptyColumnLabels.forEach((label) => {
      const column = screen.getByRole('region', { name: `${label} 단계` })
      expect(within(column).getAllByText('지원자가 없습니다')).toHaveLength(1)
    })

    const interviewColumn = screen.getByRole('region', { name: '면접 단계' })
    expect(within(interviewColumn).queryByText('지원자가 없습니다')).toBeNull()
  })

  it('keeps five zero-count headers and shows one shared message when all data is empty', () => {
    renderApplicantBoard([])
    const headings = screen.getAllByRole('heading', { level: 2 })
    expect(headings.map((heading) => heading.textContent)).toEqual([
      '서류검토0',
      '면접0',
      '처우협의0',
      '최종합격0',
      '불합격0',
    ])
    expect(screen.getAllByText('지원자가 없습니다')).toHaveLength(1)
  })

  it('delegates a valid provider drag-end move to the update mutation once', async () => {
    const { updateApplicantStage } = renderApplicantBoard([interviewApplicant])

    expect(dragDropProvider.onDragEnd).toBeTruthy()

    await act(async () => {
      dragDropProvider.onDragEnd?.({
        canceled: false,
        operation: {
          source: { id: interviewApplicant.id },
          target: { id: APPLICANT_STAGE.OFFER },
        },
      })
    })

    await waitFor(() => {
      expect(updateApplicantStage).toHaveBeenCalledTimes(1)
    })
    expect(updateApplicantStage).toHaveBeenCalledWith(interviewApplicant.id, APPLICANT_STAGE.OFFER)
  })

  it('extends provider defaults with feedback that disables the drop animation', () => {
    renderApplicantBoard([interviewApplicant])
    const defaultPlugin = {}

    expect(dragDropProvider.plugins).toBeTruthy()

    const plugins = dragDropProvider.plugins?.([defaultPlugin])
    expect(plugins).toHaveLength(2)
    expect(plugins?.[0]).toBe(defaultPlugin)
    expect(plugins?.[1]).toMatchObject({
      plugin: Feedback,
      options: { dropAnimation: null },
    })
  })
})
