import type { Applicant } from '../models/applicant'

interface ContentComponentProps {
  applicants: Applicant[]
}

export function ContentComponent({ applicants }: ContentComponentProps) {
  return <p>지원자 {applicants.length}명을 불러왔습니다.</p>
}
