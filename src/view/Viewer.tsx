/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-ts-comment */
import { useThreeSceneInit } from '../hooks/threeSceneHooks'
import { useDragFileUpload } from '../hooks/dragFileUploadHooks'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { LoadingManager } from 'three'
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { PackagedModel } from '../utils/modelFileTools'
import { createMachine, assign } from 'xstate'
import { useMachine } from '@xstate/react'

const manager = new LoadingManager()
const loader = new GLTFLoader(manager)
const dracoLoader = new DRACOLoader()
dracoLoader.setDecoderPath('/examples/jsm/libs/draco/')
loader.setDRACOLoader(dracoLoader)

const toggleMachine = createMachine({
  id: 'xstate',
  initial: 'none',
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
    const tree = [] as any[]
    const queue = [] as any[]
    send('NEXT') //拆解中
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
    })
    saveSocModel('SOC_Model', tree, queue)
    async function saveSocModel(name: string, tree: any[], queue: any[]) {
      const packagedModel = new PackagedModel()
      while (queue.length) {
        const { node, name } = queue.shift()
        await packagedModel.appScene(node, name)
      }
      packagedModel.appJson(
        {
          version: '2.0.0',
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
