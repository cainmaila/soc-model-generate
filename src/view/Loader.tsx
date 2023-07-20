import { useLayoutEffect } from 'react'
import { useThreeSceneInit } from '../hooks/threeSceneHooks'
import { dtSocGroupLoader } from '../utils/dtSocGroupLoaderV3'

let isInit = false //是否初始化旗標，避掉重複初始化

function Loader() {
  const { viewerRef, sceneRef } = useThreeSceneInit()

  useLayoutEffect(() => {
    if (!viewerRef.current) return
    if (isInit) return
    // const group = dtSocGroupLoader('hq39-v4/', {
    const group = dtSocGroupLoader('https://3d-models.eyeots.com/coral/0711/hq39-v4/', {
      root: '',
      onProgress: (id: number) => {
        console.log(id)
      },
      onComplete: () => {
        console.log('complete')
      },
    })
    sceneRef.current.add(group)
    isInit = true
  }, [viewerRef, sceneRef])

  return <div id="Viewer" ref={viewerRef}></div>
}

export default Loader
