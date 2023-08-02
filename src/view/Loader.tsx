import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useThreeSceneInit } from '../hooks/threeSceneHooks'
import { dtSocGroupLoader } from '../utils/dtSocGroupLoaderV3_1'
import { LoadingBar } from '../components/LoadingBar'
import ModelTree from '../components/ModelTree'
import { I_ModelTiles } from '../utils/dtSocGroupLoaderV3_1/interface'
import { delay } from '../utils/tools'
import _ from 'lodash'
import { Object3D } from 'three'
import { flyToBestView } from '../utils/threeTools'

let isInit = false //是否初始化旗標，避掉重複初始化

function Loader() {
  const { viewerRef, sceneRef, setBestView, cameraRef, controlsRef } = useThreeSceneInit()
  const [progress, setProgress] = useState(0)
  const [loadingShow, setLoadingShow] = useState(false)
  const [modelJson, setModelJson] = useState<I_ModelTiles>()
  const groupRef = useRef<Object3D>()

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
    groupRef.current = group
    async function settingCamera(group: Object3D) {
      await delay(1)
      const box = setBestView(group)
      //呼叫自己
      if (!box) settingCamera(group)
    }
  }, [viewerRef, sceneRef, setProgress, setModelJson, groupRef])

  const movable = useMemo(() => {
    if (!modelJson) return undefined
    const { tree } = modelJson
    return _.find(tree, { id: 'Movable' })
  }, [modelJson])

  const onSelected = (id: string) => {
    if (!groupRef.current) return
    if (!controlsRef.current) return
    const object3D = groupRef.current.getObjectByName(id)
    object3D && flyToBestView(object3D, cameraRef.current, controlsRef.current)
  }

  return (
    <>
      <LoadingBar progress={progress} show={loadingShow}></LoadingBar>
      {movable ? <ModelTree movable={movable} onSelected={onSelected}></ModelTree> : null}
      <div id="Viewer" ref={viewerRef}></div>
    </>
  )
}

export default Loader
