import { describe, expect, it } from 'vitest'
import { createApplicantSeed } from './applicantSeed'

describe('createApplicantSeed', () => {
  it('provides applicants across all fixed stages', () => {
    const stages = new Set(createApplicantSeed().map(({ stage }) => stage))

    expect(stages).toEqual(
      new Set(['documentReview', 'interview', 'offer', 'hired', 'rejected']),
    )
  })

  it('returns copies that cannot mutate later reads', () => {
    const firstApplicants = createApplicantSeed()
    const originalName = firstApplicants[0].name

    firstApplicants[0].name = 'Changed'

    expect(createApplicantSeed()[0].name).toBe(originalName)
  })
})
