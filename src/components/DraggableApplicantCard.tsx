import { useDraggable } from '@dnd-kit/react'
import type { Applicant } from '../models/applicant'
import { ApplicantCard } from './ApplicantCard'

interface DraggableApplicantCardProps {
  applicant: Applicant
  isDisabled?: boolean
}

export function DraggableApplicantCard({
  applicant,
  isDisabled = false,
}: DraggableApplicantCardProps) {
  const { isDragging, ref } = useDraggable({
    id: applicant.id,
    disabled: isDisabled,
  })

  return (
    <li className="min-w-0">
      <div
        ref={ref}
        aria-disabled={isDisabled || undefined}
        className={`cursor-grab ${
          isDragging ? 'cursor-grabbing opacity-50' : ''
        }`}
      >
        <ApplicantCard applicant={applicant} />
      </div>
    </li>
  )
}
