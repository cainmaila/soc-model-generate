import { useLayoutEffect, useMemo, useState } from 'react'
import { useThreeSceneInit } from '../hooks/threeSceneHooks'
import { dtSocGroupLoader } from '../utils/dtSocGroupLoaderV3'
import { LoadingBar } from '../components/LoadingBar'
import ModelTree from '../components/ModelTree'
import { I_ModelTiles } from '../utils/dtSocGroupLoaderV3/interface'
import { delay } from '../utils/tools'
import _ from 'lodash'
import { Object3D } from 'three'

let isInit = false //是否初始化旗標，避掉重複初始化

function Loader() {
  const { viewerRef, sceneRef, setBestView } = useThreeSceneInit()
  const [progress, setProgress] = useState(0)
  const [loadingShow, setLoadingShow] = useState(false)
  const [modelJson, setModelJson] = useState<I_ModelTiles>()

  useLayoutEffect(() => {
    if (!viewerRef.current) return
    if (isInit) return
    // const group = dtSocGroupLoader('hq39-v4/', {
    const group = dtSocGroupLoader('https://3d-models.eyeots.com/coral/0725/hq39-v4/', {
      root: '',
      onJson: setModelJson,
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
    settingCamera(group)
    async function settingCamera(group: Object3D) {
      await delay(1)
      const box = setBestView(group)
      //呼叫自己
      if (!box) settingCamera(group)
    }
  }, [viewerRef, sceneRef, setProgress, setModelJson])

  const movable = useMemo(() => {
    if (!modelJson) return undefined
    const { tree } = modelJson
    return _.find(tree, { id: 'Movable' })
  }, [modelJson])

  return (
    <>
      <LoadingBar progress={progress} show={loadingShow}></LoadingBar>
      {movable ? <ModelTree movable={movable}></ModelTree> : null}
      <div id="Viewer" ref={viewerRef}></div>
    </>
  )
}

export default Loader
