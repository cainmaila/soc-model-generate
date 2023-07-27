import { createHashRouter, RouterProvider } from 'react-router-dom'
import './App.css'
import { Viewer, BaseViewer } from './view'
import { lazy, Suspense } from 'react'

const Loader = lazy(() => import('./view/Loader'))

const router = createHashRouter([
  {
    path: '/viewer',
    element: <BaseViewer />,
  },
  {
    path: '/loader',
    element: (
      <Suspense fallback={<div>Loading...</div>}>
        <Loader />
      </Suspense>
    ),
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
