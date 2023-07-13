import { useLayoutEffect } from 'react'
import { useThreeSceneInit } from '../hooks/threeSceneHooks'
import { dtSocGroupLoader } from '../utils/dtSocGroupLoader'

function Loader() {
  const { viewerRef, sceneRef } = useThreeSceneInit()

  useLayoutEffect(() => {
    if (!viewerRef.current) return
    const group = dtSocGroupLoader('https://3d-models.eyeots.com/coral/0711/hq39-v2', {
      onProgress: (id: string) => {
        console.log(id)
      },
    })
    sceneRef.current.add(group)
  }, [viewerRef, sceneRef])

  return <div id="Viewer" ref={viewerRef}></div>
}

export default Loader
