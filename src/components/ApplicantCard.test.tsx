import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
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
          resume: null,
          memo: null,
        }}
      />,
    )

    const card = screen.getByRole('article', { name: '김민지 지원자' })
    expect(within(card).getByText('김민지')).toBeTruthy()
    expect(within(card).getByText('Frontend Engineer')).toBeTruthy()
    expect(within(card).getByText('2026-08-20')).toBeTruthy()
    expect(within(card).getByText('서류검토')).toBeTruthy()
  })

  it('selects the applicant from a dedicated visible detail button', () => {
    const handleSelect = vi.fn()
    render(
      <ApplicantCard
        applicant={{
          id: 'applicant-card',
          name: '김민지',
          position: 'Frontend Engineer',
          appliedAt: '2026-08-20',
          stage: APPLICANT_STAGE.DOCUMENT_REVIEW,
          resume: null,
          memo: null,
        }}
        onSelect={handleSelect}
      />,
    )
    expect(screen.getByText('상세 보기')).toBeTruthy()
    fireEvent.click(
      screen.getByRole('button', { name: '김민지 지원자 상세 보기' }),
    )

    expect(handleSelect).toHaveBeenCalledTimes(1)
  })
})
