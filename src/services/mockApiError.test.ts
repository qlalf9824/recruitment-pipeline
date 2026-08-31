import { describe, expect, it } from 'vitest'
import {
  MOCK_API_ERROR_CODE,
  MOCK_API_STATUS,
  MockApiError,
} from './mockApiError'

describe('MockApiError', () => {
  it('exposes stable API error metadata', () => {
    const error = new MockApiError(
      MOCK_API_STATUS.BAD_REQUEST,
      MOCK_API_ERROR_CODE.INVALID_STAGE,
      'Applicant stage is invalid.',
    )

    expect(error).toBeInstanceOf(Error)
    expect(error).toMatchObject({
      name: 'MockApiError',
      status: 400,
      code: 'INVALID_STAGE',
      message: 'Applicant stage is invalid.',
    })
  })
})
