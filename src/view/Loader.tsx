import { useLayoutEffect, useState } from 'react'
import { useThreeSceneInit } from '../hooks/threeSceneHooks'
import { dtSocGroupLoader } from '../utils/dtSocGroupLoaderV3'
import { LoadingBar } from '../components/LoadingBar'
import ModelTree from '../components/ModelTree'

let isInit = false //是否初始化旗標，避掉重複初始化

function Loader() {
  const { viewerRef, sceneRef } = useThreeSceneInit()
  const [progress, setProgress] = useState(0)
  const [loadingShow, setLoadingShow] = useState(false)

  useLayoutEffect(() => {
    if (!viewerRef.current) return
    if (isInit) return
    // const group = dtSocGroupLoader('hq39-v4/', {
    const group = dtSocGroupLoader('https://3d-models.eyeots.com/coral/0725/hq39-v4/', {
      root: '',
      onProgress: (progress: number) => {
        setLoadingShow(true)
        setProgress(progress)
      },
      onComplete: () => {
        console.log('complete')
        setLoadingShow(false)
      },
    })
    sceneRef.current.add(group)
    isInit = true
  }, [viewerRef, sceneRef, setProgress])

  return (
    <>
      <LoadingBar progress={progress} show={loadingShow}></LoadingBar>
      <ModelTree></ModelTree>
      <div id="Viewer" ref={viewerRef}></div>
    </>
  )
}

export default Loader
