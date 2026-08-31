import { createContext } from 'react'
import type { ApplicantApi } from '../services/applicantApi'

export const ApplicantApiContext = createContext<ApplicantApi | null>(null)
