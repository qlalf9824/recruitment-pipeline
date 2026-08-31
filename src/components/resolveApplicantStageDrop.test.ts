import { describe, expect, it } from 'vitest'
import { APPLICANT_STAGE } from '../models/applicant'
import type { Applicant } from '../models/applicant'
import { resolveApplicantStageDrop } from './resolveApplicantStageDrop'

const interviewApplicant: Applicant = {
  id: 'interview-applicant',
  name: '이준호',
  position: 'Backend Engineer',
  appliedAt: '2026-08-21',
  stage: APPLICANT_STAGE.INTERVIEW,
  resume: null,
  memo: null,
}

describe('resolveApplicantStageDrop', () => {
  it('returns the applicant and target stage for a valid move', () => {
    expect(
      resolveApplicantStageDrop({
        applicants: [interviewApplicant],
        isCanceled: false,
        sourceId: interviewApplicant.id,
        targetId: APPLICANT_STAGE.OFFER,
      }),
    ).toEqual({
      applicantId: interviewApplicant.id,
      stage: APPLICANT_STAGE.OFFER,
    })
  })

  const ignoredDrops: Array<{
    isCanceled: boolean
    sourceId: string | number | undefined
    targetId: string | number | undefined
  }> = [
    {
      isCanceled: true,
      sourceId: interviewApplicant.id,
      targetId: APPLICANT_STAGE.OFFER,
    },
    {
      isCanceled: false,
      sourceId: undefined,
      targetId: APPLICANT_STAGE.OFFER,
    },
    {
      isCanceled: false,
      sourceId: interviewApplicant.id,
      targetId: undefined,
    },
    {
      isCanceled: false,
      sourceId: 'missing',
      targetId: APPLICANT_STAGE.OFFER,
    },
    {
      isCanceled: false,
      sourceId: interviewApplicant.id,
      targetId: 'invalid-stage',
    },
    {
      isCanceled: false,
      sourceId: interviewApplicant.id,
      targetId: APPLICANT_STAGE.INTERVIEW,
    },
  ]

  it.each(ignoredDrops)('returns null for an ignored drop %#', (input) => {
    expect(
      resolveApplicantStageDrop({
        applicants: [interviewApplicant],
        ...input,
      }),
    ).toBeNull()
  })
})
