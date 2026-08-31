import { isApplicantStage } from '../models/applicant'
import type { Applicant } from '../models/applicant'

const APPLICANT_STORAGE_KEY = 'recruitment-pipeline:applicants'
const APPLICANT_KEYS = ['id', 'name', 'position', 'appliedAt', 'stage'] as const

export interface ApplicantStorage {
  load(): Applicant[] | null
  save(applicants: Applicant[]): void
}

export class ApplicantStorageDataError extends Error {
  constructor() {
    super('Stored applicant data is invalid.')
    this.name = 'ApplicantStorageDataError'
  }
}

function isApplicant(value: unknown): value is Applicant {
  if (typeof value !== 'object' || value === null) return false

  const candidate = value as Record<string, unknown>
  const keys = Object.keys(candidate)
  if (
    keys.length !== APPLICANT_KEYS.length ||
    !APPLICANT_KEYS.every((key) => Object.hasOwn(candidate, key))
  ) {
    return false
  }

  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    typeof candidate.position === 'string' &&
    typeof candidate.appliedAt === 'string' &&
    isApplicantStage(candidate.stage)
  )
}

function assertApplicantArray(value: unknown): asserts value is Applicant[] {
  if (!Array.isArray(value) || !value.every(isApplicant)) {
    throw new ApplicantStorageDataError()
  }

  const ids = value.map(({ id }) => id)
  if (new Set(ids).size !== ids.length) {
    throw new ApplicantStorageDataError()
  }
}

export function createLocalStorageApplicantStorage(
  getStorage: () => Storage,
): ApplicantStorage {
  return {
    load() {
      const storage = getStorage()
      const rawValue = storage.getItem(APPLICANT_STORAGE_KEY)
      if (rawValue === null) return null

      let parsedValue: unknown
      try {
        parsedValue = JSON.parse(rawValue)
      } catch {
        throw new ApplicantStorageDataError()
      }

      assertApplicantArray(parsedValue)
      return parsedValue
    },
    save(applicants) {
      assertApplicantArray(applicants)
      const storage = getStorage()
      storage.setItem(APPLICANT_STORAGE_KEY, JSON.stringify(applicants))
    },
  }
}
