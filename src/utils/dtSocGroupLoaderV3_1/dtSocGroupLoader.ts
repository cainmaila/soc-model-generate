import {
  BoxGeometry,
  BoxHelper,
  Group,
  Material,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  Object3D,
} from 'three'
import axios from 'axios'
import _ from 'lodash'
import * as localforage from 'localforage'
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { I_ModelTiles, I_TreeNode } from './interface'
import { isEndWithSlash, modeRootHelper, sleeper } from './tools'

/* 檔案讀取用 */
const loader = new GLTFLoader()
const dracoLoader = new DRACOLoader()
dracoLoader.setDecoderPath('/examples/jsm/libs/draco/')
loader.setDRACOLoader(dracoLoader)
const m = new Matrix4()

//預設值
const _config = {
  version: '1.0.0',
}

interface I_dtSocGroupLoaderOptions {
  onJson?: (json: I_ModelTiles) => void
  onProgress?: (id: number) => void
  onComplete?: () => void
  onQueue?: (queue: string[]) => void
  root?: string
}

interface I_dtSocGroupLoaderWorkerOptions extends I_dtSocGroupLoaderOptions {
  queue?: string[]
}

/**
 * dtsoc 模型資料讀取 v1.0.0
 * @param {string|Object} tree - 树数据或路徑路徑。
 * @param {I_dtSocGroupLoaderOptions} options - `options` 参数是一个可选对象，可以包含用于 `dtSocGroupLoader`
 * 函数的额外配置选项。这些选项可用于自定义函数的行为并控制它加载图块树的方式。 `I_dtSocGroupLoaderOptions` 类型很可能
 * @returns 函数dtSocGroupLoader返回一个Group对象，其中包含已加载的图块树。
 */
export function dtSocGroupLoader(tree: any, options: I_dtSocGroupLoaderOptions = {}) {
  let modelTilesPath: string | Object
  if (typeof tree === 'string') {
    const _isTreeIsEndWithSlash = isEndWithSlash(tree)
    modelTilesPath = _isTreeIsEndWithSlash ? tree + 'modelTiles.json' : tree
    const { root } = options
    /*
     * 如果有給root，且treePath不是api形式，模型路徑會變成 treePath+root+模型路徑
     * 如果有給root，且treePath是api形式，模型路徑會變成 root+模型路徑
     * 如果沒給root，且treePath不是api形式，模型路徑會變成 treePath+模型路徑
     * 如果沒給root，且treePath是api形式，模型路徑會變成 直接用模型路徑
     */
    options.root = modeRootHelper(root, tree)
  } else {
    modelTilesPath = tree as I_ModelTiles
  }
  const group = new Group()
  group.name = '__root__'
  group.userData.name = group.name
  _loadTilesTree(modelTilesPath, group, options)

  return group
}

/**
 * 此函数循环遍历树结构并返回节点 ID 数组。
 */
function _treeLoop(tilesJson: I_ModelTiles) {
  const { tree, version, name } = tilesJson
  //初始化localforage
  localforage.config({
    name: `${name}-${version}`,
  })
  _config.version = version
  const queue: I_TreeNode[] = []
  _treeNodeLoop(tree, queue)
  return queue.map((node) => node.id)
}

function _treeNodeLoop(nodeList: I_TreeNode[], queue: I_TreeNode[]) {
  nodeList.forEach((node: I_TreeNode) => {
    const { path, childs } = node
    if (path) {
      queue.push(node)
    } else if (childs) {
      return _treeNodeLoop(childs, queue)
    }
  })
}

async function _loadTilesTree(
  treePath: string | Object,
  container: Object3D,
  options: I_dtSocGroupLoaderOptions = {},
) {
  const { onJson } = options
  let mata: I_ModelTiles
  try {
    if (treePath instanceof Object) {
      mata = treePath as I_ModelTiles
    } else {
      const { data } = await axios.get(treePath)
      mata = data
    }
    onJson && onJson(mata) //返回json
    const queue: string[] = _treeLoop(mata) //掃描樹狀結構
    _loadTiles(mata, container, { queue, ...options }) //讀取模型
  } catch (error) {
    console.error('#loadTilesTree error!', error)
    return
  }
}

async function _loadTiles(
  tilesJson: I_ModelTiles,
  container: Object3D,
  options: I_dtSocGroupLoaderWorkerOptions = {},
) {
  const { tree } = tilesJson
  const { onComplete, onProgress } = options
  //排序 Background 先 load
  const treeSort = _.sortBy(tree, function () {
    // return o.id === 'Background' ? 0 : 999
    return 0
  })
  await _treeLoopSync(treeSort, container, options)
  let len = 0
  pathQueue.forEach(async ({ id, path }) => {
    const a = container.getObjectByName(id)
    if (!a) return
    localforage.getItem(id).then(async (model) => {
      if (!model) {
        console.info('＃緩存', id)
        const { data } = await axios.get(path, { responseType: 'blob' })
        model = data
        await localforage.setItem(id, data)
      }
      try {
        const gltf = await _loadModelSync(URL.createObjectURL(model as unknown as Blob))
        gltf.scene.children.forEach((child) => {
          child.applyMatrix4(a.matrix)
          a.parent?.add(child)
          a.parent?.remove(a)
        })
      } catch (error) {
        console.error('#_loadTiles error!', error)
        localforage.removeItem(path)
      }
      len++
      onProgress && onProgress((len / pathQueue.length) * 100)
      if (len === pathQueue.length) {
        onComplete && onComplete()
      }
    })
    await sleeper(100)
  })
}

async function _treeLoopSync(
  childs: I_TreeNode[],
  container: Object3D,
  options: I_dtSocGroupLoaderWorkerOptions = {},
) {
  let len = 0
  return new Promise<void>(async (resolve, reject) => {
    while (childs.length > len) {
      try {
        await _nodeLoadAsync(childs[len], container, options)
      } catch (error) {
        reject(error)
      }
      len++
    }
    resolve()
  })
}

async function _nodeLoadAsync(
  node: I_TreeNode,
  container: Object3D,
  options: I_dtSocGroupLoaderWorkerOptions = {},
) {
  const { id, matrix4, path, childs, box } = node
  const { queue, onQueue, root } = options

  // eslint-disable-next-line no-async-promise-executor
  return new Promise(async (resolve, reject) => {
    if (path) {
      try {
        if (onQueue && queue) {
          onQueue(queue)
          options.queue = queue.filter((item) => item !== id)
        }
        const _group = await _loadModelAsync(id, `${root || ''}${path}`, container, matrix4, {
          box,
        })
        resolve(_group)
      } catch (err) {
        reject(err)
      }
    } else if (childs?.length) {
      const group = new Group()
      group.name = id
      group.userData.name = id
      if (matrix4) {
        m.fromArray(_stringToArray(matrix4))
        group.applyMatrix4(m)
      }
      container.add(group)
      await _treeLoopSync(childs, group, options)
      resolve(group)
    }
  })
}

//將字串變陣列用逗號隔開
function _stringToArray(str: string) {
  return str.split(',').map((item) => parseFloat(item))
}

const pathQueue: { id: string; path: string }[] = []
//代替用的素材
const replaceMaterial = new MeshBasicMaterial({
  color: 0x00ff44,
  transparent: true,
  opacity: 0.5,
})
/**
 * 讀取模型
 * @param path 模型路徑
 * @param container 模型容器
 * @param matrix 模型矩陣
 * @param setting 設定
 * @param setting.hasContainer 是否有容器
 */
async function _loadModelAsync(
  id: string,
  path: string,
  container: Object3D,
  matrix: string | null = null,
  setting: { hasContainer?: boolean; box?: string } = {},
) {
  const { hasContainer, box } = setting
  let _container = container
  if (hasContainer) {
    const _group = new Group()
    if (matrix) {
      m.fromArray(_stringToArray(matrix))
      _group.applyMatrix4(m)
      container.add(_group)
      _container = _group
    }
  } else {
    if (matrix) {
      m.fromArray(_stringToArray(matrix))
      if (_config.version === '2.0.0') {
        _container.applyMatrix4(m)
      }
    }
  }
  return new Promise(async (resolve, reject) => {
    try {
      const cube = new Group()
      const boxArr = box ? _stringToArray(box) : []
      switch (boxArr.length) {
        case 6: //Mesh的物件
          const acube = _generateReplaceBox(boxArr, replaceMaterial)
          cube.add(acube)
          break
        case 7: //非Mesh的物件會多一個長度 0
          const acube2 = _generateReplaceBox(boxArr, replaceMaterial)
          const boxHelper = new BoxHelper(acube2)
          cube.add(boxHelper)
          break
        default:
      }
      if (_config.version !== '2.0.0') {
        cube.applyMatrix4(m)
      }
      cube.name = id
      _container.add(cube)
      pathQueue.push({ id, path })
      resolve(_container)
    } catch (err) {
      reject(err)
    }
  })
}

//生成代替用的方塊
function _generateReplaceBox(boxArr: number[], replaceMaterial: Material) {
  const geometry = new BoxGeometry(
    _distance(boxArr[3], boxArr[0]),
    _distance(boxArr[1], boxArr[4]),
    _distance(boxArr[2], boxArr[5]),
  )
  return new Mesh(geometry, replaceMaterial)
}

//兩數距離
function _distance(a: number, b: number) {
  return Math.abs(a - b)
}

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
