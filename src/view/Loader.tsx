import { useLayoutEffect } from 'react'
import { useThreeSceneInit } from '../hooks/threeSceneHooks'
import { dtSocGroupLoader } from '../utils/dtSocGroupLoader'

let isInit = false //是否初始化旗標，避掉重複初始化

function Loader() {
  const { viewerRef, sceneRef } = useThreeSceneInit()

  useLayoutEffect(() => {
    if (!viewerRef.current) return
    if (isInit) return
    const group = dtSocGroupLoader('https://3d-models.eyeots.com/coral/0711/hq39-v2', {
      onProgress: (id: string) => {
        console.log(id)
      },
    })
    sceneRef.current.add(group)
    isInit = true
  }, [viewerRef, sceneRef])

  return <div id="Viewer" ref={viewerRef}></div>
}

export default Loader
