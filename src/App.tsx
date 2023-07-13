import { createHashRouter, RouterProvider } from 'react-router-dom'
import './App.css'
import { Viewer, Loader, BaseViewer } from './view'

const router = createHashRouter([
  {
    path: '/viewer',
    element: <BaseViewer />,
  },
  {
    path: '/loader',
    element: <Loader />,
  },
  {
    path: '',
    element: <Viewer />,
  },
])

function App() {
  return (
    <>
      <RouterProvider router={router} />
    </>
  )
}

export default App
