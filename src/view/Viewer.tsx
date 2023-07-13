/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-ts-comment */
import { useThreeSceneInit } from '../hooks/threeSceneHooks'
import { useDragFileUpload } from '../hooks/dragFileUploadHooks'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { LoadingManager, Matrix4, Object3D } from 'three'
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { PackagedModel } from '../utils/modelFileTools'
import { createMachine, assign } from 'xstate'
import { useMachine } from '@xstate/react'

const MOVABLE = 'Movable' /* Movable 是 iot 點位特別解析 */

const manager = new LoadingManager()
const loader = new GLTFLoader(manager)
const dracoLoader = new DRACOLoader()
dracoLoader.setDecoderPath('/examples/jsm/libs/draco/')
loader.setDRACOLoader(dracoLoader)

const toggleMachine = createMachine({
  id: 'xstate',
  initial: 'none',
  predictableActionArguments: true,
  context: {
    upLoadOff: false, //是否關閉上傳
  },
  states: {
    none: {
      //初始化狀態
      on: { NEXT: { target: 'uploading' }, ERROR: { target: 'error' } },
      entry: ['setUpLoadOn'],
    },
    uploading: {
      //上傳中
      on: { NEXT: { target: 'analyze' }, ERROR: { target: 'error' } },
      entry: ['setUpLoadOff'],
    },
    analyze: {
      //分析中
      on: { NEXT: { target: 'loaded' }, ERROR: { target: 'error' } },
    },
    loaded: {
      //載入完成
      on: { NEXT: { target: 'disassemble' }, ERROR: { target: 'error' } },
    },
    disassemble: {
      //拆解中
      on: { NEXT: { target: 'loaded' }, ERROR: { target: 'error' } },
    },
    error: {
      //錯誤
      on: { REST: 'none' },
    },
  },
})

function Viewer() {
  const { viewerRef, sceneRef } = useThreeSceneInit()
  const { data, isLoading, setOff: upLoadOff } = useDragFileUpload(viewerRef.current)
  const [message, setMessage] = useState('')
  const [isFirstLoad, setIsFirstLoad] = useState(false)
  const [gltf, setGltf] = useState<GLTF>()

  const [state, send] = useMachine(toggleMachine, {
    actions: {
      setUpLoadOn: assign({
        upLoadOff: false,
      }),
      setUpLoadOff: assign({
        upLoadOff: true,
      }),
    },
  })

  useEffect(() => {
    const { context, value } = state
    switch (value) {
      case 'none':
        setMessage('請拖曳上傳一個 gltf 檔案')
        break
      case 'uploading':
        setMessage('Upload...')
        break
      case 'analyze':
        setMessage('檔案解析中...')
        break
      case 'loaded':
        setMessage('')
        break
      case 'disassemble':
        setMessage('拆解中...需要時間，請勿關閉網頁')
        break
      case 'error':
        break
    }
    upLoadOff(!context.upLoadOff)
  }, [state, upLoadOff])

  //是否要顯示生成按鈕
  const showGenerate = useMemo(() => {
    return state.value === 'loaded'
  }, [state])

  useEffect(() => {
    if (isLoading) {
      send('NEXT') //上傳中
    } else if (data && !isLoading) {
      send('NEXT') //分析中
    } else if (data && !isFirstLoad) {
      send('NEXT') //載入完成
    }
  }, [isLoading, isFirstLoad, data, send])

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
        send('ERROR')
      },
    )
  }, [data, sceneRef, setMessage, send])

  const handleGenerate = useCallback(() => {
    if (!gltf) return
    const tree = [] as any[] //樹狀結構展開
    const queue = [] as any[] //需要轉檔處理的終端節點
    send('NEXT') //拆解中

    function generateEndNode(node: Object3D, parentId: string, isLoop: boolean): any {
      if (isLoop && node.children.length > 0) {
        return {
          id: node.name,
          parent: parentId,
          matrix4: arrayToString(node.matrix.toArray() as unknown as string[]),
          childs: node.children.map((child) => {
            return generateEndNode(child, node.name, isLoop)
          }),
        }
      }
      queue.push({ node, name: `${node.name}` })
      const matrix4 = arrayToString(node.matrix.toArray() as unknown as string[])
      const m = new Matrix4()
      m.copy(node.matrix)
      m.invert()
      node.applyMatrix4(m)
      return {
        id: node.name,
        parent: parentId,
        matrix4,
        path: `${node.name}.glb`,
      }
    }

    gltf.scene.children.forEach((child) => {
      const node = {
        id: child.name,
        parent: null,
        matrix4: arrayToString(child.matrix.toArray() as unknown as string[]),
      }
      //@ts-ignore
      node.childs = child.children.map((child) => {
        return generateEndNode(child, node.id, node.id === MOVABLE)
      })
      tree.push(node)
    })
    saveSocModel('SOC_Model', tree, queue)
    async function saveSocModel(name: string, tree: any[], queue: any[]) {
      const packagedModel = new PackagedModel()
      while (queue.length) {
        setMessage('拆解中...需要時間，請勿關閉網頁 待處理數量:' + queue.length)
        const { node, name } = queue.shift()
        await packagedModel.appScene(node, name)
      }
      packagedModel.appJson(
        {
          version: '2.1.0',
          name,
          tree,
        },
        'modelTiles',
      )
      packagedModel.generateZip('hq39', () => {
        send('NEXT') //完成
      })
    }
  }, [gltf, send])

  return (
    <>
      <div id="Message">{message}</div>
      <div id="Viewer" ref={viewerRef}></div>
      <div id="UI">
        {showGenerate && <button onClick={handleGenerate}>生成漸進載入結構模型</button>}
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
