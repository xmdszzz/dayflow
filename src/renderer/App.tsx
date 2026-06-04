import './commands'
import TitleBar from './components/layout/TitleBar'
import MainLayout from './components/layout/MainLayout'

function App() {
  return (
    <div className="h-screen bg-[#1e1e2e] text-[#cdd6f4] flex flex-col overflow-hidden">
      <TitleBar />
      <MainLayout />
    </div>
  )
}

export default App
