import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { ApplicantApiProvider } from './contexts/ApplicantApiProvider'
import { createApplicantApi } from './services/applicantApi'
import { createLocalStorageApplicantStorage } from './services/applicantStorage'
import { createMockApiBehaviorService } from './services/mockApiBehavior'

const applicantStorage = createLocalStorageApplicantStorage(
  () => window.localStorage,
)
const mockApiBehavior = createMockApiBehaviorService()
const applicantApi = createApplicantApi({
  storage: applicantStorage,
  behavior: mockApiBehavior,
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ApplicantApiProvider api={applicantApi}>
      <App />
    </ApplicantApiProvider>
  </StrictMode>,
)
