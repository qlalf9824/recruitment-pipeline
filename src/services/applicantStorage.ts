import { isApplicantStage } from '../models/applicant'
import type { Applicant } from '../models/applicant'

const APPLICANT_STORAGE_KEY = 'recruitment-pipeline:applicants'
const LEGACY_APPLICANT_KEYS = [
  'id',
  'name',
  'position',
  'appliedAt',
  'stage',
] as const
const APPLICANT_KEYS = [
  ...LEGACY_APPLICANT_KEYS,
  'resume',
  'memo',
] as const

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

function hasExactKeys(
  candidate: Record<string, unknown>,
  expectedKeys: readonly string[],
): boolean {
  const keys = Object.keys(candidate)
  return (
    keys.length === expectedKeys.length &&
    expectedKeys.every((key) => Object.hasOwn(candidate, key))
  )
}

function hasValidApplicantSummary(candidate: Record<string, unknown>): boolean {
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    typeof candidate.position === 'string' &&
    typeof candidate.appliedAt === 'string' &&
    isApplicantStage(candidate.stage)
  )
}

function isNullableString(value: unknown): value is string | null {
  return typeof value === 'string' || value === null
}

function normalizeApplicant(value: unknown): Applicant | null {
  if (typeof value !== 'object' || value === null) return null

  const candidate = value as Record<string, unknown>
  if (!hasValidApplicantSummary(candidate)) return null

  if (hasExactKeys(candidate, LEGACY_APPLICANT_KEYS)) {
    return { ...(candidate as unknown as Omit<Applicant, 'resume' | 'memo'>), resume: null, memo: null }
  }

  if (
    !hasExactKeys(candidate, APPLICANT_KEYS) ||
    !isNullableString(candidate.resume) ||
    !isNullableString(candidate.memo)
  ) {
    return null
  }

  return candidate as unknown as Applicant
}

function normalizeApplicantArray(value: unknown): Applicant[] {
  if (!Array.isArray(value)) {
    throw new ApplicantStorageDataError()
  }

  const applicants = value.map(normalizeApplicant)
  if (applicants.some((applicant) => applicant === null)) {
    throw new ApplicantStorageDataError()
  }

  const normalizedApplicants = applicants as Applicant[]
  const ids = normalizedApplicants.map(({ id }) => id)
  if (new Set(ids).size !== ids.length) {
    throw new ApplicantStorageDataError()
  }

  return normalizedApplicants
}

function assertApplicantArray(value: unknown): asserts value is Applicant[] {
  const applicants = normalizeApplicantArray(value)
  if (
    applicants.some((applicant) =>
      !hasExactKeys(applicant as unknown as Record<string, unknown>, APPLICANT_KEYS),
    )
  ) {
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

      return normalizeApplicantArray(parsedValue)
    },
    save(applicants) {
      assertApplicantArray(applicants)
      const storage = getStorage()
      storage.setItem(APPLICANT_STORAGE_KEY, JSON.stringify(applicants))
    },
  }
}
