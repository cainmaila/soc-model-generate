import { useLayoutEffect } from 'react'
import { useThreeSceneInit } from '../hooks/threeSceneHooks'
import { dtSocGroupLoader } from '../utils/dtSocGroupLoader'

function Loader() {
  const { viewerRef, sceneRef } = useThreeSceneInit()

  useLayoutEffect(() => {
    if (!viewerRef.current) return
    const group = dtSocGroupLoader('/hq39', {
      onProgress: (id: string) => {
        console.log(id)
      },
    })
    sceneRef.current.add(group)
  }, [viewerRef, sceneRef])

  return <div id="Viewer" ref={viewerRef}></div>
}

export default Loader
