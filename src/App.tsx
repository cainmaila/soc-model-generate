import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './App.css'
import { Viewer, Loader } from './view'

const router = createBrowserRouter(
  [
    {
      path: '/loader',
      element: <Loader />,
    },
    {
      path: '*',
      element: <Viewer />,
    },
  ],
  {
    basename: '/soc-model-generate',
  },
)

function App() {
  return (
    <>
      <RouterProvider router={router} />
    </>
  )
}

export default App
