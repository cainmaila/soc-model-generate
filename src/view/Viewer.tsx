/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-ts-comment */
import { useThreeSceneInit } from '../hooks/threeSceneHooks'
import { useDragFileUpload } from '../hooks/dragFileUploadHooks'
import { useCallback, useEffect, useState } from 'react'
import { Group, LoadingManager } from 'three'
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { saveJson, saveScene } from '../utils/modelFileTools'

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
  const [gltf, setGltf] = useState<GLTF>()

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
        setGltf(gltf)
      },
      undefined,
      (error) => {
        setMessage('檔案格式錯誤:' + error.message)
        console.error(error)
      },
    )
  }, [data, sceneRef, setMessage])

  const handleGenerate = useCallback(() => {
    if (!gltf) return
    const tree = [] as any[]
    const queue = [] as any[]
    gltf.scene.children.forEach((child) => {
      const node = {
        id: child.name,
        parent: null,
        matrix4: arrayToString(child.matrix.toArray() as unknown as string[]),
      }
      //@ts-ignore
      node.childs = child.children.map((child) => {
        queue.push({ node: child, name: `${node.id}_${child.name}` })
        return {
          id: child.name,
          //@ts-ignore
          parent: node.id,
          matrix4: null,
          path: `${node.id}_${child.name}.glb`,
        }
      })
      tree.push(node)
      saveSocModel('SOC_Model', tree, queue)
    })

    async function saveSocModel(name: string, tree: any[], queue: any[]) {
      while (queue.length) {
        console.log(queue.length)
        const { node, name } = queue.shift()
        await saveSceneSync(node, name)
      }
      console.log({
        version: '2.0.0',
        name,
        tree,
      })
      saveJson(
        {
          version: '2.0.0',
          name,
          tree,
        },
        'modelTiles',
      )
    }

    function saveSceneSync(group: Group, name: string) {
      return new Promise<void>((resolve) => {
        saveScene(group, name)
        setTimeout(() => {
          resolve()
        }, 1000)
      })
    }
  }, [gltf])

  return (
    <>
      <div id="Message">{message}</div>
      <div id="Viewer" ref={viewerRef}></div>
      <div id="UI">
        <button onClick={handleGenerate}>生成漸進載入結構模型</button>
      </div>
    </>
  )
}

export default Viewer

//字串陣列轉字串逗號分隔
function arrayToString(array: string[]) {
  let str = ''
  array.forEach((item) => {
    str += item + ','
  })
  return str
}
