import type { PropsWithChildren } from 'react'
import type { ApplicantApi } from '../services/applicantApi'
import { ApplicantApiContext } from './ApplicantApiContext'

interface ApplicantApiProviderProps extends PropsWithChildren {
  api: ApplicantApi
}

export function ApplicantApiProvider({
  api,
  children,
}: ApplicantApiProviderProps) {
  return (
    <ApplicantApiContext.Provider value={api}>
      {children}
    </ApplicantApiContext.Provider>
  )
}
