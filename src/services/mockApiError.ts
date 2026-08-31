export const MOCK_API_STATUS = {
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
} as const
export type MockApiStatus =
  (typeof MOCK_API_STATUS)[keyof typeof MOCK_API_STATUS]

export const MOCK_API_ERROR_CODE = {
  INVALID_STAGE: 'INVALID_STAGE',
  APPLICANT_NOT_FOUND: 'APPLICANT_NOT_FOUND',
  STORAGE_DATA_INVALID: 'STORAGE_DATA_INVALID',
  SIMULATED_FAILURE: 'SIMULATED_FAILURE',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const
export type MockApiErrorCode =
  (typeof MOCK_API_ERROR_CODE)[keyof typeof MOCK_API_ERROR_CODE]

export class MockApiError extends Error {
  readonly status: MockApiStatus
  readonly code: MockApiErrorCode

  constructor(
    status: MockApiStatus,
    code: MockApiErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'MockApiError'
    this.status = status
    this.code = code
  }
}
