import { useContext } from 'react'
import type { ApplicantApi } from '../services/applicantApi'
import { ApplicantApiContext } from './ApplicantApiContext'

export function useApplicantApi(): ApplicantApi {
  const api = useContext(ApplicantApiContext)
  if (api === null) {
    throw new Error(
      'useApplicantApi must be used within ApplicantApiProvider.',
    )
  }
  return api
}
