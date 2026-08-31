import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { APPLICANT_STAGE } from '../models/applicant'
import { BoardColumn } from './BoardColumn'

vi.mock('@dnd-kit/react', () => ({
  useDroppable: () => ({
    isDropTarget: true,
    ref: vi.fn(),
  }),
}))

afterEach(cleanup)

describe('BoardColumn', () => {
  it('draws its drop-target highlight inside the column boundary', () => {
    render(
      <BoardColumn
        applicants={[]}
        columnClassName="border-blue-200 bg-blue-50"
        countClassName="text-blue-500"
        isBoardEmpty={false}
        label="면접"
        stage={APPLICANT_STAGE.INTERVIEW}
        statusClassName="bg-blue-500"
      />,
    )

    const column = screen.getByRole('region', { name: '면접 단계' })

    expect(column.classList.contains('ring-inset')).toBe(true)
    expect(column.classList.contains('ring-offset-2')).toBe(false)
  })
})
