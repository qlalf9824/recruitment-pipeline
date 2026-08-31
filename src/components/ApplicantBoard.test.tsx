import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { APPLICANT_STAGE } from '../models/applicant'
import type { Applicant } from '../models/applicant'
import { ApplicantBoard } from './ApplicantBoard'

const interviewApplicant: Applicant = {
  id: 'interview-applicant',
  name: '이준호',
  position: 'Backend Engineer',
  appliedAt: '2026-08-21',
  stage: APPLICANT_STAGE.INTERVIEW,
}

const rejectedApplicant: Applicant = {
  id: 'rejected-applicant',
  name: '박서연',
  position: 'Product Designer',
  appliedAt: '2026-08-22',
  stage: APPLICANT_STAGE.REJECTED,
}

afterEach(cleanup)

describe('ApplicantBoard', () => {
  it('groups each applicant in its matching fixed-stage column', () => {
    render(
      <ApplicantBoard applicants={[interviewApplicant, rejectedApplicant]} />,
    )

    const headings = screen.getAllByRole('heading', { level: 2 })
    expect(headings.map((heading) => heading.textContent)).toEqual([
      '서류검토0',
      '면접1',
      '처우협의0',
      '최종합격0',
      '불합격1',
    ])

    const interviewColumn = screen.getByRole('region', { name: '면접 단계' })
    expect(
      within(interviewColumn).getByRole('article', { name: '이준호 지원자' }),
    ).toBeTruthy()
    expect(screen.getAllByRole('article', { name: '이준호 지원자' })).toHaveLength(
      1,
    )
    expect(within(interviewColumn).getByRole('list')).toBeTruthy()
    expect(within(interviewColumn).getAllByRole('listitem')).toHaveLength(1)

    const rejectedColumn = screen.getByRole('region', { name: '불합격 단계' })
    expect(
      within(rejectedColumn).getByRole('article', { name: '박서연 지원자' }),
    ).toBeTruthy()
    expect(screen.getAllByRole('article', { name: '박서연 지원자' })).toHaveLength(
      1,
    )
    expect(within(rejectedColumn).getAllByRole('listitem')).toHaveLength(1)
  })

  it('shows one empty message in an unpopulated column when the board has data', () => {
    render(<ApplicantBoard applicants={[interviewApplicant]} />)
    const emptyColumnLabels = ['서류검토', '처우협의', '최종합격', '불합격']

    emptyColumnLabels.forEach((label) => {
      const column = screen.getByRole('region', { name: `${label} 단계` })
      expect(within(column).getAllByText('지원자가 없습니다')).toHaveLength(1)
    })

    const interviewColumn = screen.getByRole('region', { name: '면접 단계' })
    expect(within(interviewColumn).queryByText('지원자가 없습니다')).toBeNull()
  })

  it('keeps five zero-count headers and shows one shared message when all data is empty', () => {
    render(<ApplicantBoard applicants={[]} />)
    const headings = screen.getAllByRole('heading', { level: 2 })
    expect(headings.map((heading) => heading.textContent)).toEqual([
      '서류검토0',
      '면접0',
      '처우협의0',
      '최종합격0',
      '불합격0',
    ])
    expect(screen.getAllByText('지원자가 없습니다')).toHaveLength(1)
  })
})
