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
import App from './App'
import { ApplicantApiProvider } from './contexts/ApplicantApiProvider'
import { APPLICANT_STAGE } from './models/applicant'
import type { Applicant } from './models/applicant'
import type { ApplicantApi } from './services/applicantApi'

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

function renderApp(getApplicants: ApplicantApi['getApplicants']) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
  const api: ApplicantApi = {
    getApplicants,
    updateApplicantStage: vi.fn(async () => {
      throw new Error('updateApplicantStage should not be called')
    }),
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
})

describe('App applicant query states', () => {
  it('shows loading while the initial request is unresolved', () => {
    renderApp(vi.fn(() => new Promise<Applicant[]>(() => undefined)))

    expect(
      screen.getByRole('status', {
        name: '지원자 정보를 불러오는 중입니다.',
      }),
    ).toBeTruthy()
  })

  it('shows the applicant count after a successful request', async () => {
    renderApp(vi.fn(async () => [applicant]))

    expect(
      await screen.findByText('지원자 1명을 불러왔습니다.'),
    ).toBeTruthy()
  })

  it('passes an empty applicant result to the content state', async () => {
    renderApp(vi.fn(async () => []))

    expect(
      await screen.findByText('지원자 0명을 불러왔습니다.'),
    ).toBeTruthy()
  })

  it('shows a safe error state and retry action when the request fails', async () => {
    renderApp(vi.fn(async () => Promise.reject(new Error('internal detail'))))

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('지원자 정보를 불러오지 못했습니다.')
    expect(alert.textContent).not.toContain('internal detail')
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
      await screen.findByText('지원자 1명을 불러왔습니다.'),
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
    await screen.findByText('지원자 1명을 불러왔습니다.')

    await act(async () => {
      window.dispatchEvent(new Event('focus'))
      window.dispatchEvent(new Event('online'))
      await Promise.resolve()
    })

    expect(getApplicants).toHaveBeenCalledTimes(1)
  })
})
