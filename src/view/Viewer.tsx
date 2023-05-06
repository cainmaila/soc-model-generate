import { useThreeSceneInit } from '../hooks/threeSceneHooks'
import { useDragFileUpload } from '../hooks/dragFileUploadHooks'
import { useEffect, useState } from 'react'
import { LoadingManager } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'

const manager = new LoadingManager()
const loader = new GLTFLoader(manager)
const dracoLoader = new DRACOLoader()
dracoLoader.setDecoderPath('/examples/jsm/libs/draco/')
loader.setDRACOLoader(dracoLoader)

function Viewer() {
  const { viewerRef, sceneRef } = useThreeSceneInit()
  const { data, isLoading } = useDragFileUpload(viewerRef.current)
  const [message, setMessage] = useState('請拖曳上傳一個 gltf 檔案')
  const [isFirstLoad, setIsFirstLoad] = useState(false)

  useEffect(() => {
    if (isFirstLoad && data) {
      setMessage('')
    } else if (!data && !isLoading && !isFirstLoad) {
      setMessage('請拖曳上傳一個 gltf 檔案')
    } else if (data && isLoading && !isFirstLoad) {
      setMessage('Upload...')
    } else {
      setMessage('檔案解析中...')
    }
  }, [isLoading, isFirstLoad, data])

  useEffect(() => {
    if (data === null) return
    const _data = data as string
    loader.load(
      _data,
      (gltf) => {
        sceneRef.current.add(gltf.scene)
        setIsFirstLoad(true)
      },
      undefined,
      (error) => {
        setMessage('檔案格式錯誤:' + error.message)
        console.error(error)
      },
    )
  }, [data, sceneRef, setMessage])

  return (
    <>
      <div id="Message">{message}</div>
      <div id="Viewer" ref={viewerRef}></div>
    </>
  )
}

export default Viewer
