import { Box3, BoxGeometry, Group, Matrix4, Mesh, MeshBasicMaterial, Object3D } from 'three'
import axios from 'axios'
import _, { get } from 'lodash'
import * as localforage from 'localforage'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { I_ModelTiles, I_TreeNode } from './interface'

/* 檔案讀取用 */
const loader = new GLTFLoader()
const dracoLoader = new DRACOLoader()
dracoLoader.setDecoderPath('/examples/jsm/libs/draco/')
loader.setDRACOLoader(dracoLoader)
const m = new Matrix4()

const _config = {
  version: '1.0.0',
}

interface I_dtSocGroupLoaderOptions {
  onProgress?: (id: string) => void
  onComplete?: () => void
  onQueue?: (queue: string[]) => void
  root?: string
}

interface I_dtSocGroupLoaderWorkerOptions extends I_dtSocGroupLoaderOptions {
  queue?: string[]
}

/**
 * dtsoc 模型資料讀取
 * @param {string} treePath - 包含图块树数据路徑。
 * @param {I_dtSocGroupLoaderOptions} options - `options` 参数是一个可选对象，可以包含用于 `dtSocGroupLoader`
 * 函数的额外配置选项。这些选项可用于自定义函数的行为并控制它加载图块树的方式。 `I_dtSocGroupLoaderOptions` 类型很可能
 * @returns 函数“dtSocGroupLoader”返回一个“Group”对象，其中包含已加载的图块树。
 */
export function dtSocGroupLoader(treePath: string, options: I_dtSocGroupLoaderOptions = {}) {
  options.root || (options.root = treePath + '/')
  const group = new Group()
  group.name = '__root__'
  group.userData.name = group.name
  _loadTilesTree(`${treePath}/modelTiles.json`, group, options)
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
  treePath: string,
  container: Object3D,
  options: I_dtSocGroupLoaderOptions = {},
) {
  try {
    const { data } = await axios.get(treePath)
    const queue: string[] = _treeLoop(data) //掃描樹狀結構
    _loadTiles(data, container, { queue, ...options }) //讀取模型
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
  const { onComplete } = options
  //排序 Background 先 load
  const treeSort = _.sortBy(tree, function () {
    // return o.id === 'Background' ? 0 : 999
    return 0
  })
  await _treeLoopSync(treeSort, container, options)
  pathQueue.forEach((path) => {
    const a = container.getObjectByName(path)
    if (!a) return
    localforage.getItem(path).then(async (model) => {
      const gltf = await _loadModelSync(URL.createObjectURL(model as unknown as Blob))
      gltf.scene.children.forEach((child) => {
        child.applyMatrix4(a.matrix)
        a.parent?.add(child)
        a.parent?.remove(a)
      })
    })
  })
  onComplete && onComplete()
}

async function _treeLoopSync(
  childs: I_TreeNode[],
  container: Object3D,
  options: I_dtSocGroupLoaderWorkerOptions = {},
) {
  let len = 0
  return new Promise<void>(async (resolve, reject) => {
    // const queue = childs.map((child) => {
    //   return _nodeLoadAsync(child, container, options)
    // })
    // try {
    //   await Promise.all(queue)
    //   resolve()
    // } catch (error) {
    //   reject(error)
    // }

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
  const { id, matrix4, path, childs } = node
  const { onProgress, queue, onQueue, root } = options

  // eslint-disable-next-line no-async-promise-executor
  return new Promise(async (resolve, reject) => {
    if (path) {
      try {
        if (onQueue && queue) {
          onQueue(queue)
          options.queue = queue.filter((item) => item !== id)
        }
        const _group = await _loadModelAsync(`${root || ''}${path}`, container, matrix4)
        onProgress && onProgress(id)
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

const pathQueue: string[] = []

/**
 * 讀取模型
 * @param path 模型路徑
 * @param container 模型容器
 * @param matrix 模型矩陣
 * @param setting 設定
 * @param setting.hasContainer 是否有容器
 */
async function _loadModelAsync(
  path: string,
  container: Object3D,
  matrix: string | null = null,
  setting: { hasContainer?: boolean; onProgress?: (progress: number) => void } = {},
) {
  const { hasContainer, onProgress } = setting
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
      const geometry = new BoxGeometry(10, 10, 10)
      const material = new MeshBasicMaterial({ color: 0x00ff00 })
      material.wireframe = true
      const cube = new Mesh(geometry, material)
      _container.add(cube)
      if (_config.version !== '2.0.0') {
        cube.applyMatrix4(m)
      }
      cube.name = path
      pathQueue.push(path)

      // let model = await localforage.getItem(path)
      // if (!model) {
      //   console.info('＃緩存', path)
      //   const { data } = await axios.get(path, { responseType: 'blob' })
      //   model = data
      //   await localforage.setItem(path, data)
      // }
      // const gltf = await _loadModelSync(URL.createObjectURL(model as unknown as Blob), onProgress)
      // gltf.scene.children.forEach((child) => {
      //   _container.add(child)
      //   if (_config.version !== '2.0.0') {
      //     child.applyMatrix4(m)
      //   }
      // })
      resolve(_container)
    } catch (err) {
      reject(err)
    }
  })
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

/* 檔案下載用 */
const link = document.createElement('a')
link.style.display = 'none'
const exporter = new GLTFExporter()

/**
 * 此函数将 JSON 对象保存为文件。
 * @param {unknown} data - json物件
 * @param {string} filename - filename 该函数将向文件名添加“.json”扩展名，以确保将文件保存为
 * JSON 文件。
 */
export function saveJson(data: unknown, filename: string) {
  const output = JSON.stringify(data)
  _saveArrayBuffer(output, `${filename}.json`)
}

/**
 * 此函数将 Three.js 场景导出为 glTF 文件。
 * @param {Group} scene - scene 参数是一个 Three.js Group 对象。
 * @param {string | undefined} name - name 表示正在保存的场景的名称。如果未定义，该函数将使用存储在场景对象的 userData 属性中的名称，不需要副檔名。
 */
export function saveScene(scene: Group, name: string | undefined) {
  exporter.parse(
    scene,
    // called when the gltf has been generated
    function (model) {
      _saveModel(model, name ? name : scene.userData.name)
    },
    // called when there is an error in the generation
    function () {
      console.log('An error happened')
    },
    { binary: true, includeCustomExtensions: true },
  )
}

/**
 * 此函数将 GLB 数据转换为 Blob 对象。
 */
export function glbToBlob(glbData: BlobPart) {
  return new Blob([glbData], { type: 'application/octet-stream' })
}

/**
 * 该函数根据数据类型以 GLB 或 GLTF 格式保存模型。
 * @param {any} data - 数据参数的类型为“any”，这意味着它可以是任何数据类型。用于传递需要保存的模型数据。
 * @param {string} filename - filename 参数是一个字符串，表示将要保存的文件的名称。该函数将根据保存的数据类型添加文件扩展名（“.glb”或“.gltf”）。
 */
function _saveModel(data: unknown, filename: string) {
  if (data instanceof ArrayBuffer) {
    _saveArrayBuffer(data, `${filename}.glb`)
  } else {
    const output = JSON.stringify(data, null, 2)
    _saveArrayBuffer(output, `${filename}.gltf`)
  }
}

/**
 * 该函数将数组缓冲区保存为具有指定文件名的文件。
 * @param {BlobPart} buffer - 一个 ArrayBuffer。
 * @param {string} filename - 要下载的文件的所需名称。
 * @param {boolean} isArrayBuffer - glb?
 */
function _saveArrayBuffer(buffer: BlobPart, filename: string, isArrayBuffer = true) {
  _save(
    new Blob([buffer], { type: isArrayBuffer ? 'application/octet-stream' : 'text/plain' }),
    filename,
  )
}

/**
 * 该函数将 Blob 对象保存为具有指定文件名的文件。
 * @param {Blob} blob
 * 原生格式的数据，例如图像、视频或其他二进制数据。
 * @param {string} filename - 要下载的文件的所需名称
 */
function _save(blob: Blob, filename: string) {
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.click()
}
