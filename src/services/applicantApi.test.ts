/// <reference types="vitest/jsdom" />

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { APPLICANT_STAGE } from '../models/applicant'
import type { Applicant } from '../models/applicant'
import { createApplicantSeed } from '../mocks/applicantSeed'
import { createApplicantApi } from './applicantApi'
import type { ApplicantStorage } from './applicantStorage'
import {
  ApplicantStorageDataError,
  createLocalStorageApplicantStorage,
} from './applicantStorage'
import {
  MOCK_API_DELAY_MODE,
  MOCK_API_OUTCOME,
  createMockApiBehaviorService,
} from './mockApiBehavior'
import type { MockApiBehaviorService } from './mockApiBehavior'

const immediateSuccess = {
  outcome: MOCK_API_OUTCOME.SUCCESS,
  delay: MOCK_API_DELAY_MODE.NONE,
} as const

describe('createApplicantApi', () => {
  let storedApplicants: Applicant[] | null
  let storage: ApplicantStorage
  let behavior: MockApiBehaviorService

  beforeEach(() => {
    storedApplicants = null
    storage = {
      load: vi.fn(() =>
        storedApplicants?.map((applicant) => ({ ...applicant })) ?? null,
      ),
      save: vi.fn((applicants: Applicant[]) => {
        storedApplicants = applicants.map((applicant) => ({ ...applicant }))
      }),
    }
    behavior = {
      resolve: vi.fn(() => ({ shouldFail: false, delayMs: 0 })),
      wait: vi.fn(async () => undefined),
    }
  })

  it('returns isolated seed data without persisting an initial read', async () => {
    const api = createApplicantApi({ storage, behavior })

    const firstApplicants = await api.getApplicants(immediateSuccess)
    firstApplicants[0].name = 'Changed'
    const secondApplicants = await api.getApplicants(immediateSuccess)

    expect(secondApplicants).toEqual(createApplicantSeed())
    expect(storage.save).not.toHaveBeenCalled()
  })

  it('persists the complete collection with only the selected applicant changed', async () => {
    const api = createApplicantApi({ storage, behavior })
    const initialApplicants = createApplicantSeed()
    const target = initialApplicants[0]

    const updatedApplicant = await api.updateApplicantStage(
      target.id,
      APPLICANT_STAGE.INTERVIEW,
      immediateSuccess,
    )

    expect(updatedApplicant).toEqual({
      ...target,
      stage: APPLICANT_STAGE.INTERVIEW,
    })
    expect(storedApplicants).toEqual(
      initialApplicants.map((applicant) =>
        applicant.id === target.id
          ? { ...applicant, stage: APPLICANT_STAGE.INTERVIEW }
          : applicant,
      ),
    )
    expect(storage.save).toHaveBeenCalledTimes(1)
  })

  it('uses persisted applicants for later reads', async () => {
    const persisted = createApplicantSeed()
    persisted[0].stage = APPLICANT_STAGE.HIRED
    storedApplicants = persisted
    const api = createApplicantApi({ storage, behavior })

    await expect(api.getApplicants(immediateSuccess)).resolves.toEqual(persisted)
  })

  it('waits before rejecting an invalid stage and does not load data', async () => {
    const events: string[] = []
    behavior.resolve = vi.fn(() => {
      events.push('resolve')
      return { shouldFail: false, delayMs: 300 }
    })
    behavior.wait = vi.fn(async () => {
      events.push('wait')
    })
    storage.load = vi.fn(() => {
      events.push('load')
      return null
    })
    const api = createApplicantApi({ storage, behavior })

    await expect(
      api.updateApplicantStage('applicant-001', 'invalid' as never),
    ).rejects.toMatchObject({ status: 400, code: 'INVALID_STAGE' })
    expect(events).toEqual(['resolve', 'wait'])
  })

  it('maps corrupt storage data to a storage-specific 500 error', async () => {
    storage.load = vi.fn(() => {
      throw new ApplicantStorageDataError()
    })
    const api = createApplicantApi({ storage, behavior })

    await expect(api.getApplicants(immediateSuccess)).rejects.toMatchObject({
      status: 500,
      code: 'STORAGE_DATA_INVALID',
    })
  })

  it('returns not found before applying a simulated failure', async () => {
    behavior.resolve = vi.fn(() => ({ shouldFail: true, delayMs: 0 }))
    const api = createApplicantApi({ storage, behavior })

    await expect(
      api.updateApplicantStage(
        'missing',
        APPLICANT_STAGE.INTERVIEW,
        immediateSuccess,
      ),
    ).rejects.toMatchObject({ status: 404, code: 'APPLICANT_NOT_FOUND' })
  })

  it('does not save when a simulated update failure occurs', async () => {
    behavior.resolve = vi.fn(() => ({ shouldFail: true, delayMs: 0 }))
    const api = createApplicantApi({ storage, behavior })

    await expect(
      api.updateApplicantStage(
        'applicant-001',
        APPLICANT_STAGE.INTERVIEW,
        immediateSuccess,
      ),
    ).rejects.toMatchObject({ status: 500, code: 'SIMULATED_FAILURE' })
    expect(storage.save).not.toHaveBeenCalled()
    expect(storedApplicants).toBeNull()
  })

  it('fails a list read before loading data when simulation selects failure', async () => {
    behavior.resolve = vi.fn(() => ({ shouldFail: true, delayMs: 0 }))
    const api = createApplicantApi({ storage, behavior })

    await expect(api.getApplicants(immediateSuccess)).rejects.toMatchObject({
      status: 500,
      code: 'SIMULATED_FAILURE',
    })
    expect(storage.load).not.toHaveBeenCalled()
  })

  it('normalizes storage write failures without persisting an update', async () => {
    storage.save = vi.fn(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError')
    })
    const api = createApplicantApi({ storage, behavior })

    await expect(
      api.updateApplicantStage(
        'applicant-001',
        APPLICANT_STAGE.INTERVIEW,
        immediateSuccess,
      ),
    ).rejects.toMatchObject({ status: 500, code: 'INTERNAL_ERROR' })
    expect(storedApplicants).toBeNull()
  })

  it('conceals unexpected dependency errors as an internal error', async () => {
    storage.load = vi.fn(() => {
      throw new Error('Sensitive storage implementation detail')
    })
    const api = createApplicantApi({ storage, behavior })

    await expect(api.getApplicants(immediateSuccess)).rejects.toMatchObject({
      status: 500,
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred.',
    })
  })
})

describe('Applicant API persistence integration', () => {
  it('keeps a successful stage update after recreating the service graph', async () => {
    const browserStorage = jsdom.window.localStorage
    browserStorage.clear()
    const createApi = () =>
      createApplicantApi({
        storage: createLocalStorageApplicantStorage(() => browserStorage),
        behavior: createMockApiBehaviorService(() => 1),
      })

    const firstApi = createApi()
    await firstApi.updateApplicantStage(
      'applicant-001',
      APPLICANT_STAGE.OFFER,
      immediateSuccess,
    )

    const recreatedApi = createApi()
    const applicants = await recreatedApi.getApplicants(immediateSuccess)

    expect(
      applicants.find(({ id }) => id === 'applicant-001')?.stage,
    ).toBe(APPLICANT_STAGE.OFFER)
  })
})
