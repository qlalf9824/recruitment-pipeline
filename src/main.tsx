import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './styles.css'
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
const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ApplicantApiProvider api={applicantApi}>
        <App />
      </ApplicantApiProvider>
    </QueryClientProvider>
  </StrictMode>,
)
