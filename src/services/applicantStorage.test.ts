/// <reference types="vitest/jsdom" />

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { APPLICANT_STAGE } from '../models/applicant'
import type { Applicant } from '../models/applicant'
import {
  ApplicantStorageDataError,
  createLocalStorageApplicantStorage,
} from './applicantStorage'

const STORAGE_KEY = 'recruitment-pipeline:applicants'
const browserStorage = jsdom.window.localStorage
const applicant: Applicant = {
  id: 'applicant-1',
  name: 'Kim Codex',
  position: 'Frontend Engineer',
  appliedAt: '2026-08-31',
  stage: APPLICANT_STAGE.DOCUMENT_REVIEW,
}

describe('createLocalStorageApplicantStorage', () => {
  beforeEach(() => {
    browserStorage.clear()
  })

  it('returns null when the storage key is absent', () => {
    const storage = createLocalStorageApplicantStorage(() => browserStorage)

    expect(storage.load()).toBeNull()
  })

  it('defers browser storage access until an operation runs', () => {
    const getStorage = vi.fn(() => browserStorage)
    const storage = createLocalStorageApplicantStorage(getStorage)

    expect(getStorage).not.toHaveBeenCalled()
    expect(storage.load()).toBeNull()
    expect(getStorage).toHaveBeenCalledTimes(1)
  })

  it('round-trips a complete applicant collection', () => {
    const storage = createLocalStorageApplicantStorage(() => browserStorage)

    storage.save([applicant])

    expect(storage.load()).toEqual([applicant])
  })

  it.each([
    ['invalid JSON', '{'],
    ['non-array root', JSON.stringify({ applicant })],
    [
      'missing id',
      JSON.stringify([
        {
          name: applicant.name,
          position: applicant.position,
          appliedAt: applicant.appliedAt,
          stage: applicant.stage,
        },
      ]),
    ],
    ['missing name', JSON.stringify([{ ...applicant, name: undefined }])],
    [
      'missing position',
      JSON.stringify([{ ...applicant, position: undefined }]),
    ],
    [
      'missing appliedAt',
      JSON.stringify([{ ...applicant, appliedAt: undefined }]),
    ],
    ['missing stage', JSON.stringify([{ ...applicant, stage: undefined }])],
    ['wrong id type', JSON.stringify([{ ...applicant, id: 1 }])],
    ['wrong name type', JSON.stringify([{ ...applicant, name: 1 }])],
    [
      'wrong position type',
      JSON.stringify([{ ...applicant, position: false }]),
    ],
    [
      'wrong appliedAt type',
      JSON.stringify([{ ...applicant, appliedAt: 20260831 }]),
    ],
    ['wrong stage type', JSON.stringify([{ ...applicant, stage: 1 }])],
    ['invalid stage', JSON.stringify([{ ...applicant, stage: 'unknown' }])],
    ['extra detail field', JSON.stringify([{ ...applicant, memo: null }])],
    ['duplicate IDs', JSON.stringify([applicant, { ...applicant }])],
  ])('rejects %s without replacing the stored value', (_label, rawValue) => {
    const storage = createLocalStorageApplicantStorage(() => browserStorage)
    browserStorage.setItem(STORAGE_KEY, rawValue)

    expect(() => storage.load()).toThrow(ApplicantStorageDataError)
    expect(browserStorage.getItem(STORAGE_KEY)).toBe(rawValue)
  })

  it('rejects an invalid write without replacing valid stored data', () => {
    const storage = createLocalStorageApplicantStorage(() => browserStorage)
    storage.save([applicant])
    const previousValue = browserStorage.getItem(STORAGE_KEY)

    expect(() => storage.save([{ ...applicant, stage: 'unknown' } as never])).toThrow(
      ApplicantStorageDataError,
    )
    expect(browserStorage.getItem(STORAGE_KEY)).toBe(previousValue)
  })
})
