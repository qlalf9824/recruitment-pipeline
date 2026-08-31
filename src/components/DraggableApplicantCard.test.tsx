import { DragDropProvider } from '@dnd-kit/react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { APPLICANT_STAGE } from '../models/applicant'
import { DraggableApplicantCard } from './DraggableApplicantCard'

afterEach(cleanup)

describe('DraggableApplicantCard', () => {
  it('keeps its applicant card present while the draggable wrapper is disabled', () => {
    render(
      <DragDropProvider>
        <ul>
          <DraggableApplicantCard
            applicant={{
              id: 'interview-applicant',
              name: '이준호',
              position: 'Backend Engineer',
              appliedAt: '2026-08-21',
              stage: APPLICANT_STAGE.INTERVIEW,
            }}
            isDisabled
          />
        </ul>
      </DragDropProvider>,
    )

    const card = screen.getByRole('article', { name: '이준호 지원자' })
    const listItem = screen.getByRole('listitem')
    expect(screen.getAllByRole('article', { name: '이준호 지원자' })).toHaveLength(1)
    expect(card.closest('li')).toBe(listItem)
    expect(listItem.querySelector('[aria-disabled="true"]')).not.toBeNull()
  })
})
