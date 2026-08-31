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

    const firstApplicants = await api.getApplicants(undefined, immediateSuccess)
    firstApplicants[0].name = 'Changed'
    const secondApplicants = await api.getApplicants(undefined, immediateSuccess)

    expect(secondApplicants).toEqual(createApplicantSeed())
    expect(storage.save).not.toHaveBeenCalled()
  })

  it('filters names without changing persisted applicant data', async () => {
    storedApplicants = [
      {
        id: 'applicant-1',
        name: 'Kim Codex',
        position: 'Frontend Engineer',
        appliedAt: '2026-08-31',
        stage: APPLICANT_STAGE.DOCUMENT_REVIEW,
      },
      {
        id: 'applicant-2',
        name: 'Lee Query',
        position: 'Backend Engineer',
        appliedAt: '2026-08-30',
        stage: APPLICANT_STAGE.INTERVIEW,
      },
    ]
    const originalApplicants = storedApplicants.map((applicant) => ({
      ...applicant,
    }))
    const api = createApplicantApi({ storage, behavior })

    await expect(
      api.getApplicants({ searchTerm: 'cOdEx' }, immediateSuccess),
    ).resolves.toEqual([originalApplicants[0]])
    await expect(
      api.getApplicants({ searchTerm: '   ' }, immediateSuccess),
    ).resolves.toEqual(originalApplicants)
    expect(storedApplicants).toEqual(originalApplicants)
    expect(storage.save).not.toHaveBeenCalled()
  })

  it('returns applicants matching any selected job', async () => {
    const applicants = createApplicantSeed()
    storedApplicants = applicants
    const api = createApplicantApi({ storage, behavior })

    await expect(
      api.getApplicants(
        {
          selectedJobs: ['Frontend Engineer', 'Product Designer'],
        },
        immediateSuccess,
      ),
    ).resolves.toEqual([applicants[0], applicants[2]])
  })

  it('combines name and selected-job filters without changing stored data', async () => {
    storedApplicants = [
      {
        id: 'applicant-1',
        name: 'Kim Frontend',
        position: 'Frontend Engineer',
        appliedAt: '2026-08-31',
        stage: APPLICANT_STAGE.DOCUMENT_REVIEW,
      },
      {
        id: 'applicant-2',
        name: 'Kim Backend',
        position: 'Backend Engineer',
        appliedAt: '2026-08-30',
        stage: APPLICANT_STAGE.INTERVIEW,
      },
      {
        id: 'applicant-3',
        name: 'Lee Frontend',
        position: 'Frontend Engineer',
        appliedAt: '2026-08-29',
        stage: APPLICANT_STAGE.OFFER,
      },
    ]
    const originalApplicants = storedApplicants.map((applicant) => ({
      ...applicant,
    }))
    const api = createApplicantApi({ storage, behavior })

    await expect(
      api.getApplicants(
        { searchTerm: 'kim', selectedJobs: ['Frontend Engineer'] },
        immediateSuccess,
      ),
    ).resolves.toEqual([originalApplicants[0]])
    expect(storedApplicants).toEqual(originalApplicants)
    expect(storage.save).not.toHaveBeenCalled()
  })

  it('returns unique seed job options in first-seen order', async () => {
    const api = createApplicantApi({ storage, behavior })

    await expect(api.getJobOptions()).resolves.toEqual([
      'Frontend Engineer',
      'Backend Engineer',
      'Product Designer',
      'Data Analyst',
      'Product Manager',
    ])
  })

  it('gets job options without behavior or storage dependencies', async () => {
    const api = createApplicantApi({ storage, behavior })

    await api.getJobOptions()

    expect(behavior.resolve).not.toHaveBeenCalled()
    expect(behavior.wait).not.toHaveBeenCalled()
    expect(storage.load).not.toHaveBeenCalled()
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

  it('keeps one stage update after recreating the API graph over the same storage', async () => {
    const initialApplicants = createApplicantSeed()
    const target = initialApplicants[0]
    const firstApi = createApplicantApi({ storage, behavior })

    await firstApi.updateApplicantStage(
      target.id,
      APPLICANT_STAGE.OFFER,
      immediateSuccess,
    )

    const recreatedApi = createApplicantApi({ storage, behavior })
    const applicants = await recreatedApi.getApplicants(undefined, immediateSuccess)

    expect(applicants).toEqual(
      initialApplicants.map((applicant) =>
        applicant.id === target.id
          ? { ...applicant, stage: APPLICANT_STAGE.OFFER }
          : applicant,
      ),
    )
  })

  it('uses persisted applicants for later reads', async () => {
    const persisted = createApplicantSeed()
    persisted[0].stage = APPLICANT_STAGE.HIRED
    storedApplicants = persisted
    const api = createApplicantApi({ storage, behavior })

    await expect(
      api.getApplicants(undefined, immediateSuccess),
    ).resolves.toEqual(persisted)
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

    await expect(
      api.getApplicants(undefined, immediateSuccess),
    ).rejects.toMatchObject({
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

    await expect(
      api.getApplicants(undefined, immediateSuccess),
    ).rejects.toMatchObject({
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

    await expect(
      api.getApplicants(undefined, immediateSuccess),
    ).rejects.toMatchObject({
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
    const applicants = await recreatedApi.getApplicants(undefined, immediateSuccess)

    expect(
      applicants.find(({ id }) => id === 'applicant-001')?.stage,
    ).toBe(APPLICANT_STAGE.OFFER)
  })
})
