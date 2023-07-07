import { createHashRouter, RouterProvider } from 'react-router-dom'
import './App.css'
import { Viewer, Loader } from './view'

const router = createHashRouter([
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
