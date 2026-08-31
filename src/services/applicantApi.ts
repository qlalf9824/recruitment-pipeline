import { isApplicantStage } from '../models/applicant'
import type { Applicant, ApplicantStage } from '../models/applicant'
import { createApplicantSeed } from '../mocks/applicantSeed'
import type { ApplicantStorage } from './applicantStorage'
import { ApplicantStorageDataError } from './applicantStorage'
import type {
  MockApiBehaviorOptions,
  MockApiBehaviorService,
} from './mockApiBehavior'
import {
  MOCK_API_ERROR_CODE,
  MOCK_API_STATUS,
  MockApiError,
} from './mockApiError'

export interface ApplicantApi {
  getJobOptions(): Promise<string[]>
  getApplicants(
    params?: GetApplicantsParams,
    options?: MockApiBehaviorOptions,
  ): Promise<Applicant[]>
  updateApplicantStage(
    id: string,
    stage: ApplicantStage,
    options?: MockApiBehaviorOptions,
  ): Promise<Applicant>
}

export interface GetApplicantsParams {
  searchTerm?: string
}

export interface ApplicantApiDependencies {
  storage: ApplicantStorage
  behavior: MockApiBehaviorService
}

function cloneApplicants(applicants: Applicant[]): Applicant[] {
  return applicants.map((applicant) => ({ ...applicant }))
}

function filterApplicantsByName(
  applicants: Applicant[],
  searchTerm = '',
): Applicant[] {
  const normalizedSearchTerm = searchTerm.trim().toLocaleLowerCase()
  if (!normalizedSearchTerm) return applicants

  return applicants.filter((applicant) =>
    applicant.name.toLocaleLowerCase().includes(normalizedSearchTerm),
  )
}

function throwIfSimulatedFailure(shouldFail: boolean): void {
  if (!shouldFail) return

  throw new MockApiError(
    MOCK_API_STATUS.INTERNAL_SERVER_ERROR,
    MOCK_API_ERROR_CODE.SIMULATED_FAILURE,
    'The simulated API request failed.',
  )
}

function normalizeApiError(error: unknown): MockApiError {
  if (error instanceof MockApiError) return error
  if (error instanceof ApplicantStorageDataError) {
    return new MockApiError(
      MOCK_API_STATUS.INTERNAL_SERVER_ERROR,
      MOCK_API_ERROR_CODE.STORAGE_DATA_INVALID,
      'Stored applicant data is invalid.',
    )
  }
  return new MockApiError(
    MOCK_API_STATUS.INTERNAL_SERVER_ERROR,
    MOCK_API_ERROR_CODE.INTERNAL_ERROR,
    'An unexpected error occurred.',
  )
}

export function createApplicantApi({
  storage,
  behavior,
}: ApplicantApiDependencies): ApplicantApi {
  return {
    async getJobOptions() {
      return [
        ...new Set(
          createApplicantSeed().map((applicant) => applicant.position),
        ),
      ]
    },
    async getApplicants(params, options) {
      try {
        const resolved = behavior.resolve(options)
        await behavior.wait(resolved.delayMs)
        throwIfSimulatedFailure(resolved.shouldFail)
        const applicants = cloneApplicants(storage.load() ?? createApplicantSeed())
        return filterApplicantsByName(applicants, params?.searchTerm)
      } catch (error) {
        throw normalizeApiError(error)
      }
    },
    async updateApplicantStage(id, stage, options) {
      try {
        const resolved = behavior.resolve(options)
        await behavior.wait(resolved.delayMs)

        if (!isApplicantStage(stage)) {
          throw new MockApiError(
            MOCK_API_STATUS.BAD_REQUEST,
            MOCK_API_ERROR_CODE.INVALID_STAGE,
            'Applicant stage is invalid.',
          )
        }

        const applicants = storage.load() ?? createApplicantSeed()
        const applicantIndex = applicants.findIndex(
          (applicant) => applicant.id === id,
        )
        if (applicantIndex === -1) {
          throw new MockApiError(
            MOCK_API_STATUS.NOT_FOUND,
            MOCK_API_ERROR_CODE.APPLICANT_NOT_FOUND,
            'Applicant was not found.',
          )
        }

        throwIfSimulatedFailure(resolved.shouldFail)

        const updatedApplicant = {
          ...applicants[applicantIndex],
          stage,
        }
        const nextApplicants = applicants.map((applicant, index) =>
          index === applicantIndex ? updatedApplicant : { ...applicant },
        )

        storage.save(nextApplicants)
        return { ...updatedApplicant }
      } catch (error) {
        throw normalizeApiError(error)
      }
    },
  }
}
