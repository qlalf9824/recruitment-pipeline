import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { ApplicantApiProvider } from './contexts/ApplicantApiProvider'
import { APPLICANT_STAGE } from './models/applicant'
import type { Applicant } from './models/applicant'
import type { ApplicantApi } from './services/applicantApi'

const dragDropProvider = vi.hoisted(() => ({
  onDragEnd: undefined as undefined | ((event: unknown) => void),
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
    }: {
      children: React.ReactNode
      onDragEnd?: (event: unknown) => void
    }) => {
      dragDropProvider.onDragEnd = onDragEnd
      return children
    },
  }
})

const applicant: Applicant = {
  id: 'applicant-1',
  name: 'Kim Codex',
  position: 'Frontend Engineer',
  appliedAt: '2026-08-31',
  stage: APPLICANT_STAGE.DOCUMENT_REVIEW,
  resume: null,
  memo: null,
}

const otherApplicant: Applicant = {
  id: 'applicant-2',
  name: 'Lee Query',
  position: 'Backend Engineer',
  appliedAt: '2026-08-30',
  stage: APPLICANT_STAGE.REJECTED,
  resume: null,
  memo: null,
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

function renderApp(
  getApplicants: ApplicantApi['getApplicants'],
  updateApplicantStage: ApplicantApi['updateApplicantStage'] = vi.fn(
    async () => {
      throw new Error('updateApplicantStage should not be called')
    },
  ),
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
  const api: ApplicantApi = {
    getApplicants,
    getJobOptions: vi.fn(async () => [
      'Frontend Engineer',
      'Backend Engineer',
    ]),
    updateApplicantStage,
  }

  return render(
    <QueryClientProvider client={queryClient}>
      <ApplicantApiProvider api={api}>
        <App />
      </ApplicantApiProvider>
    </QueryClientProvider>,
  )
}

afterEach(() => {
  cleanup()
  dragDropProvider.onDragEnd = undefined
})

async function deliverApplicantMove(
  applicantId: string,
  stage: Applicant['stage'],
) {
  await act(async () => {
    dragDropProvider.onDragEnd?.({
      canceled: false,
      operation: {
        source: { id: applicantId },
        target: { id: stage },
      },
    })
  })
}

describe('App applicant query states', () => {
  it('keeps the same focused search input while a searched request is pending', async () => {
    const searchedRequest = createDeferred<Applicant[]>()
    const getApplicants = vi
      .fn<ApplicantApi['getApplicants']>()
      .mockResolvedValueOnce([applicant, otherApplicant])
      .mockReturnValueOnce(searchedRequest.promise)
    renderApp(getApplicants)

    const search = await screen.findByRole('searchbox', {
      name: '지원자 이름 검색',
    })
    search.focus()
    fireEvent.change(search, { target: { value: 'Kim' } })

    await waitFor(() => {
      expect(getApplicants).toHaveBeenLastCalledWith({
        searchTerm: 'Kim',
        selectedJobs: [],
      })
    })
    expect(
      screen.getByRole('searchbox', { name: '지원자 이름 검색' }),
    ).toBe(search)
    expect(document.activeElement).toBe(search)

    searchedRequest.resolve([applicant])
  })

  it('shows loading while the initial request is unresolved', () => {
    renderApp(vi.fn(() => new Promise<Applicant[]>(() => undefined)))

    const loadingStatus = screen.getByRole('status', {
      name: '지원자 정보를 불러오는 중입니다.',
    })

    expect(loadingStatus).toBeTruthy()
    expect(
      screen
        .getByRole('region', { name: '채용 단계 보드' })
        .getAttribute('aria-busy'),
    ).toBe('true')
  })

  it('shows the applicant board after a successful request', async () => {
    const getApplicants = vi.fn(async () => [applicant])
    renderApp(getApplicants)

    expect(
      await screen.findByRole('heading', { level: 1, name: '지원자 관리' }),
    ).toBeTruthy()
    expect(screen.getByRole('region', { name: '채용 단계 보드' })).toBeTruthy()
    expect(
      await screen.findByRole('article', { name: 'Kim Codex 지원자' }),
    ).toBeTruthy()
    expect(getApplicants).toHaveBeenCalledTimes(1)
  })

  it('requests and shows applicants filtered by the entered name', async () => {
    const getApplicants = vi
      .fn<ApplicantApi['getApplicants']>()
      .mockResolvedValueOnce([applicant, otherApplicant])
      .mockResolvedValueOnce([applicant])
    renderApp(getApplicants)

    const search = await screen.findByRole('searchbox', {
      name: '지원자 이름 검색',
    })
    fireEvent.change(search, { target: { value: 'Kim' } })

    await waitFor(() => {
      expect(getApplicants).toHaveBeenLastCalledWith({
        searchTerm: 'Kim',
        selectedJobs: [],
      })
    })
    expect(
      await screen.findByRole('article', { name: 'Kim Codex 지원자' }),
    ).toBeTruthy()
    expect(
      screen.queryByRole('article', { name: 'Lee Query 지원자' }),
    ).toBeNull()
  })

  it('requests and shows applicants filtered by the selected job', async () => {
    const getApplicants = vi
      .fn<ApplicantApi['getApplicants']>()
      .mockResolvedValueOnce([applicant, otherApplicant])
      .mockResolvedValueOnce([applicant])
    renderApp(getApplicants)

    fireEvent.click(screen.getByRole('button', { name: '직무 전체' }))
    fireEvent.click(
      await screen.findByRole('checkbox', { name: 'Frontend Engineer' }),
    )

    await waitFor(() => {
      expect(getApplicants).toHaveBeenLastCalledWith({
        searchTerm: '',
        selectedJobs: ['Frontend Engineer'],
      })
    })
    expect(
      await screen.findByRole('article', { name: 'Kim Codex 지원자' }),
    ).toBeTruthy()
    expect(
      screen.queryByRole('article', { name: 'Lee Query 지원자' }),
    ).toBeNull()
  })

  it('shows a filtered empty state and restores all applicants after clearing jobs', async () => {
    const getApplicants = vi
      .fn<ApplicantApi['getApplicants']>()
      .mockResolvedValueOnce([applicant, otherApplicant])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([applicant, otherApplicant])
    renderApp(getApplicants)

    fireEvent.click(screen.getByRole('button', { name: '직무 전체' }))
    const frontendOption = await screen.findByRole('checkbox', {
      name: 'Frontend Engineer',
    })
    fireEvent.click(frontendOption)

    expect(
      await screen.findByText('검색 조건에 맞는 지원자가 없습니다.'),
    ).toBeTruthy()
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(5)

    fireEvent.click(frontendOption)

    await waitFor(() => {
      expect(getApplicants).toHaveBeenLastCalledWith({
        searchTerm: '',
        selectedJobs: [],
      })
    })
    expect(
      await screen.findByRole('article', { name: 'Kim Codex 지원자' }),
    ).toBeTruthy()
    expect(
      screen.getByRole('article', { name: 'Lee Query 지원자' }),
    ).toBeTruthy()
  })

  it('distinguishes an empty search result from an empty applicant collection', async () => {
    const getApplicants = vi
      .fn<ApplicantApi['getApplicants']>()
      .mockResolvedValueOnce([applicant, otherApplicant])
      .mockResolvedValueOnce([])
    renderApp(getApplicants)

    fireEvent.change(
      await screen.findByRole('searchbox', { name: '지원자 이름 검색' }),
      { target: { value: 'Nobody' } },
    )

    expect(
      await screen.findByText('검색 조건에 맞는 지원자가 없습니다.'),
    ).toBeTruthy()
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(5)
    expect(screen.queryByText('지원자가 없습니다')).toBeNull()
  })

  it('passes an empty applicant result to the content state', async () => {
    renderApp(vi.fn(async () => []))

    expect(await screen.findAllByRole('heading', { level: 2 })).toHaveLength(5)
    expect(await screen.findAllByText('지원자가 없습니다')).toHaveLength(1)
  })

  it('shows a safe error state and retry action when the request fails', async () => {
    renderApp(vi.fn(async () => Promise.reject(new Error('internal detail'))))

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('지원자 정보를 불러오지 못했습니다.')
    expect(alert.textContent).not.toContain('internal detail')
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(5)
    expect(screen.getByRole('button', { name: '다시 시도' })).toBeTruthy()
  })

  it('makes one new request and shows content when retry succeeds', async () => {
    const getApplicants = vi
      .fn<ApplicantApi['getApplicants']>()
      .mockRejectedValueOnce(new Error('initial failure'))
      .mockResolvedValueOnce([applicant])
    renderApp(getApplicants)

    fireEvent.click(
      await screen.findByRole('button', { name: '다시 시도' }),
    )

    expect(
      await screen.findByRole('article', { name: 'Kim Codex 지원자' }),
    ).toBeTruthy()
    expect(getApplicants).toHaveBeenCalledTimes(2)
  })

  it('keeps the error state and retry action when retry fails', async () => {
    const getApplicants = vi.fn(async () =>
      Promise.reject(new Error('request failure')),
    )
    renderApp(getApplicants)

    fireEvent.click(
      await screen.findByRole('button', { name: '다시 시도' }),
    )

    await waitFor(() => {
      expect(getApplicants).toHaveBeenCalledTimes(2)
    })
    expect(screen.getByRole('alert')).toBeTruthy()
    expect(screen.getByRole('button', { name: '다시 시도' })).toBeTruthy()
  })

  it('disables retry while the new request is in progress', async () => {
    const retryRequest = createDeferred<Applicant[]>()
    const getApplicants = vi
      .fn<ApplicantApi['getApplicants']>()
      .mockRejectedValueOnce(new Error('initial failure'))
      .mockReturnValueOnce(retryRequest.promise)
    renderApp(getApplicants)

    fireEvent.click(
      await screen.findByRole('button', { name: '다시 시도' }),
    )

    const retryingButton = await screen.findByRole<HTMLButtonElement>(
      'button',
      { name: '다시 시도 중' },
    )
    expect(retryingButton.disabled).toBe(true)
    fireEvent.click(retryingButton)
    expect(getApplicants).toHaveBeenCalledTimes(2)

    await act(async () => {
      retryRequest.resolve([applicant])
      await retryRequest.promise
    })
  })

  it('does not refetch after focus or reconnect events', async () => {
    const getApplicants = vi.fn(async () => [applicant])
    renderApp(getApplicants)
    await screen.findByRole('article', { name: 'Kim Codex 지원자' })

    await act(async () => {
      window.dispatchEvent(new Event('focus'))
      window.dispatchEvent(new Event('online'))
      await Promise.resolve()
    })

    expect(getApplicants).toHaveBeenCalledTimes(1)
  })
})

describe('App applicant stage movement', () => {
  it('shows the persisted stage after a successful move refetch without changing another applicant', async () => {
    const movedApplicant = {
      ...applicant,
      stage: APPLICANT_STAGE.INTERVIEW,
    }
    const getApplicants = vi
      .fn<ApplicantApi['getApplicants']>()
      .mockResolvedValueOnce([applicant, otherApplicant])
      .mockResolvedValueOnce([movedApplicant, otherApplicant])
    const updateApplicantStage = vi.fn(async () => movedApplicant)
    renderApp(getApplicants, updateApplicantStage)

    await screen.findByRole('article', { name: 'Kim Codex 지원자' })
    await deliverApplicantMove('applicant-1', APPLICANT_STAGE.INTERVIEW)

    const interviewColumn = await screen.findByRole('region', {
      name: '면접 단계',
    })
    expect(
      within(interviewColumn).getByRole('article', {
        name: 'Kim Codex 지원자',
      }),
    ).toBeTruthy()
    expect(
      within(
        screen.getByRole('region', { name: '서류검토 단계' }),
      ).queryByRole('article', { name: 'Kim Codex 지원자' }),
    ).toBeNull()
    expect(
      within(screen.getByRole('region', { name: '불합격 단계' })).getByRole(
        'article',
        { name: 'Lee Query 지원자' },
      ),
    ).toBeTruthy()
    expect(updateApplicantStage).toHaveBeenCalledTimes(1)
    expect(updateApplicantStage).toHaveBeenCalledWith(
      'applicant-1',
      APPLICANT_STAGE.INTERVIEW,
    )
    expect(getApplicants).toHaveBeenCalledTimes(2)
  })

  it('moves the card optimistically and ignores a repeated move while saving', async () => {
    const updateRequest = createDeferred<Applicant>()
    const getApplicants = vi.fn(async () => [applicant, otherApplicant])
    const updateApplicantStage = vi.fn(() => updateRequest.promise)
    renderApp(getApplicants, updateApplicantStage)

    await screen.findByRole('article', {
      name: 'Kim Codex 지원자',
    })
    const initialDragEnd = dragDropProvider.onDragEnd
    await deliverApplicantMove('applicant-1', APPLICANT_STAGE.INTERVIEW)

    await waitFor(() => {
      const movedArticle = within(
        screen.getByRole('region', { name: '면접 단계' }),
      ).getByRole('article', { name: 'Kim Codex 지원자' })
      expect(movedArticle.closest('li')?.querySelector('[aria-disabled="true"]')).not.toBeNull()
    })
    expect(dragDropProvider.onDragEnd).not.toBe(initialDragEnd)
    await deliverApplicantMove('applicant-1', APPLICANT_STAGE.INTERVIEW)

    expect(updateApplicantStage).toHaveBeenCalledTimes(1)
    expect(
      within(
        screen.getByRole('region', { name: '면접 단계' }),
      ).getByRole('article', { name: 'Kim Codex 지원자' }),
    ).toBeTruthy()
    expect(
      within(
        screen.getByRole('region', { name: '서류검토 단계' }),
      ).queryByRole('article', { name: 'Kim Codex 지원자' }),
    ).toBeNull()

    await act(async () => {
      updateRequest.resolve({
        ...applicant,
        stage: APPLICANT_STAGE.INTERVIEW,
      })
      await updateRequest.promise
    })
  })

  it('rolls the card back and shows a snackbar when saving its stage fails', async () => {
    const updateRequest = createDeferred<Applicant>()
    const getApplicants = vi.fn(async () => [applicant, otherApplicant])
    const updateApplicantStage = vi.fn(() => updateRequest.promise)
    renderApp(getApplicants, updateApplicantStage)

    await screen.findByRole('article', {
      name: 'Kim Codex 지원자',
    })
    await deliverApplicantMove('applicant-1', APPLICANT_STAGE.INTERVIEW)
    await waitFor(() => {
      const movedArticle = within(
        screen.getByRole('region', { name: '면접 단계' }),
      ).getByRole('article', { name: 'Kim Codex 지원자' })
      expect(movedArticle.closest('li')?.querySelector('[aria-disabled="true"]')).not.toBeNull()
    })

    await act(async () => {
      updateRequest.reject(new Error('update failed'))
      try {
        await updateRequest.promise
      } catch {
        // Expected rejection is contained at this test boundary.
      }
    })

    const rolledBackArticle = await within(
      screen.getByRole('region', { name: '서류검토 단계' }),
    ).findByRole('article', { name: 'Kim Codex 지원자' })
    expect(
      rolledBackArticle.closest('li')?.querySelector('[aria-disabled="true"]'),
    ).toBeNull()
    expect(updateApplicantStage).toHaveBeenCalledTimes(1)
    await waitFor(() => {
      expect(getApplicants).toHaveBeenCalledTimes(2)
    })
    expect(
      within(
        screen.getByRole('region', { name: '서류검토 단계' }),
      ).getByRole('article', { name: 'Kim Codex 지원자' }),
    ).toBeTruthy()
    expect(
      within(
        screen.getByRole('region', { name: '면접 단계' }),
      ).queryByRole('article', { name: 'Kim Codex 지원자' }),
    ).toBeNull()
    expect(
      await screen.findByText(
        '단계 변경을 저장하지 못해 이전 단계로 되돌렸습니다.',
      ),
    ).toBeTruthy()
  })
})
