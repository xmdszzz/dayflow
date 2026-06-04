import './commands'
import TitleBar from './components/layout/TitleBar'
import MainLayout from './components/layout/MainLayout'
import { useWindowResize } from './hooks/useWindowResize'

function App() {
  const { onEdgeMouseDown, edgeClass } = useWindowResize()

  return (
    <>
      {/* Frameless window resize edges — outside main container to avoid overflow:hidden clipping */}
      <div className={edgeClass('left')} onMouseDown={onEdgeMouseDown('left')} />
      <div className={edgeClass('right')} onMouseDown={onEdgeMouseDown('right')} />
      <div className={edgeClass('bottom')} onMouseDown={onEdgeMouseDown('bottom')} />
      <div className={edgeClass('bottom-left')} onMouseDown={onEdgeMouseDown('bottom-left')} />
      <div className={edgeClass('bottom-right')} onMouseDown={onEdgeMouseDown('bottom-right')} />

      <div className="h-screen bg-[#1e1e2e] text-[#cdd6f4] flex flex-col overflow-hidden">
        <TitleBar />
        <MainLayout />
      </div>
    </>
  )
}

export default App
