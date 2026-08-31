import { describe, expect, it } from 'vitest'
import { APPLICANT_STAGE, isApplicantStage } from './applicant'

describe('isApplicantStage', () => {
  it.each(Object.values(APPLICANT_STAGE))('accepts %s', (stage) => {
    expect(isApplicantStage(stage)).toBe(true)
  })

  it.each(['technicalInterview', '', null, 1, {}])('rejects %j', (value) => {
    expect(isApplicantStage(value)).toBe(false)
  })
})
