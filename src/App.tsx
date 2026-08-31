import { Toaster } from 'sonner'
import { ContentComponent } from './components/ContentComponent'

function App() {
  return (
    <>
      <Toaster position="bottom-center" richColors />
      <ContentComponent />
    </>
  )
}

export default App
