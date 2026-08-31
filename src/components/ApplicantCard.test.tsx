import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { APPLICANT_STAGE } from '../models/applicant'
import { ApplicantCard } from './ApplicantCard'

afterEach(cleanup)

describe('ApplicantCard', () => {
  it('shows the applicant card fields and stage label', () => {
    render(
      <ApplicantCard
        applicant={{
          id: 'applicant-card',
          name: '김민지',
          position: 'Frontend Engineer',
          appliedAt: '2026-08-20',
          stage: APPLICANT_STAGE.DOCUMENT_REVIEW,
        }}
      />,
    )

    const card = screen.getByRole('article', { name: '김민지 지원자' })
    expect(within(card).getByText('김민지')).toBeTruthy()
    expect(within(card).getByText('Frontend Engineer')).toBeTruthy()
    expect(within(card).getByText('2026-08-20')).toBeTruthy()
    expect(within(card).getByText('서류검토')).toBeTruthy()
  })
})
