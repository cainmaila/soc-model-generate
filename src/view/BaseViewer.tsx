import { useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { useThreeSceneInit } from '../hooks/threeSceneHooks'
import { useSearchParams } from 'react-router-dom'
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { setCameraToBestView } from '../utils/threeTools'

function BaseViewer() {
  const [searchParams] = useSearchParams()
  const path = useMemo(() => searchParams.get('path'), [searchParams])
  const { viewerRef, sceneRef, cameraRef, controlsRef } = useThreeSceneInit()

  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!path) {
      setMessage('請輸入path參數')
    }
  }, [path])

  useLayoutEffect(() => {
    if (!viewerRef.current) return
    //http://localhost:5173/soc-model-generate/#/viewer?path=https://3d-models.eyeots.com/coral/0711/hq39-v2/CCTV-1201.glb
    path && loadModelSync(path)
    async function loadModelSync(path: string) {
      if (!controlsRef.current) return
      try {
        const gltf = await _loadModelSync(path, (progress: number) => {
          setMessage(`載入中...${progress.toFixed(2)}%`)
        })
        setMessage('')
        sceneRef.current.add(gltf.scene)
        setCameraToBestView(gltf.scene, cameraRef.current, controlsRef.current)
      } catch (error: unknown) {
        if (error instanceof Error) {
          setMessage(error?.message)
        } else {
          setMessage('發生未知錯誤')
        }
      }
    }
  }, [viewerRef, sceneRef, cameraRef, controlsRef, path])

  return (
    <>
      {message ? <div id="Message">{message}</div> : ''}
      <div id="Viewer" ref={viewerRef}></div>
    </>
  )
}

/* 檔案讀取用 */
const loader = new GLTFLoader()
const dracoLoader = new DRACOLoader()
dracoLoader.setDecoderPath('/examples/jsm/libs/draco/')
loader.setDRACOLoader(dracoLoader)

function _loadModelSync(path: string, onProgress?: (progress: number) => void) {
  return new Promise<GLTF>((resolve, reject) => {
    loader.load(
      path,
      resolve,
      // called while loading is progressing
      function (xhr) {
        onProgress && onProgress((xhr.loaded / xhr.total) * 100)
      },
      reject,
    )
  })
}

export default BaseViewer
