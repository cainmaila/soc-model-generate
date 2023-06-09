/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/no-inferrable-types */
/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable no-async-promise-executor */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { Group, Matrix4, Object3D } from 'three'
import axios from 'axios'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'
import { ZipTool } from './zipTools'

/* 檔案讀取用 */
const loader = new GLTFLoader()
const dracoLoader = new DRACOLoader()
dracoLoader.setDecoderPath('/examples/jsm/libs/draco/')
loader.setDRACOLoader(dracoLoader)
const m = new Matrix4()

interface I_dtSocGroupLoaderOptions {
  onProgress?: (id: string) => void
  onComplete?: () => void
  onQueue?: (queue: string[]) => void
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
  const group = new Group()
  group.name = '__root__'
  group.userData.name = group.name
  _loadTilesTree(treePath, group, options)
  return group
}

/**
 * 此函数循环遍历树结构并返回节点 ID 数组。
 */
function _treeLoop(tilesJson: { tree: any[] }) {
  const { tree } = tilesJson
  const queue: any[] = []
  _treeNodeLoop(tree, queue)
  return queue.map((node) => node.id)
}

function _treeNodeLoop(nodeList: any[], queue: any[]) {
  nodeList.forEach((node: any) => {
    const { path, childs } = node
    if (path) {
      queue.push(node)
    } else {
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
  tilesJson: { tree: any[] },
  container: Object3D,
  options: I_dtSocGroupLoaderWorkerOptions = {},
) {
  const { tree } = tilesJson
  const { onComplete } = options
  await _treeLoopSync(tree, container, options)
  onComplete && onComplete()
}

async function _treeLoopSync(
  childs: any[],
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
  node: any,
  container: Object3D,
  options: I_dtSocGroupLoaderWorkerOptions = {},
) {
  const { id, matrix4, path, childs } = node
  const { onProgress, queue, onQueue } = options

  return new Promise(async (resolve, reject) => {
    if (path) {
      try {
        if (onQueue && queue) {
          onQueue(queue)
          options.queue = queue.filter((item) => item !== id)
        }
        const _group = await _loadModelAsync(path, container, matrix4)
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
        m.fromArray(matrix4)
        group.applyMatrix4(m)
      }
      container.add(group)
      await _treeLoopSync(childs, group, options)
      resolve(group)
    }
  })
}

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
  matrix: number[] | null = null,
  setting: { hasContainer?: boolean; onProgress?: (progress: number) => void } = {},
) {
  const { hasContainer, onProgress } = setting
  let _container = container
  if (hasContainer) {
    const _group = new Group()
    if (matrix) {
      m.fromArray(matrix)
      _group.applyMatrix4(m)
      container.add(_group)
      _container = _group
    }
  } else {
    if (matrix) {
      m.fromArray(matrix)
      _container.applyMatrix4(m)
    }
  }

  return new Promise(async (resolve, reject) => {
    try {
      const gltf = await _loadModelSync(path, onProgress)
      //@ts-ignore
      gltf.scene.children.forEach((child) => {
        _container.add(child)
      })
      resolve(_container)
    } catch (err) {
      reject(err)
    }
  })
}

function _loadModelSync(path: string, onProgress?: (progress: number) => void) {
  return new Promise((resolve, reject) => {
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
 * @param {any} data - json物件
 * @param {string} filename - filename 该函数将向文件名添加“.json”扩展名，以确保将文件保存为
 * JSON 文件。
 */
export function saveJson(data: Object, filename: string) {
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
 * 轉成blob
 * @param data - 要轉的資料
 * @param isArrayBuffer - 是否為ArrayBuffer
 * @returns {Blob} - 返回 Blob 对象。
 */
function _toBlob(data: any, isArrayBuffer: boolean = true) {
  return new Blob([data], { type: isArrayBuffer ? 'application/octet-stream' : 'text/plain' })
}

/**
 * 该函数根据数据类型以 GLB 或 GLTF 格式保存模型。
 * @param {any} data - 数据参数的类型为“any”，这意味着它可以是任何数据类型。用于传递需要保存的模型数据。
 * @param {string} filename - filename 参数是一个字符串，表示将要保存的文件的名称。该函数将根据保存的数据类型添加文件扩展名（“.glb”或“.gltf”）。
 */
function _saveModel(data: any, filename: string) {
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
function _saveArrayBuffer(buffer: BlobPart, filename: string, isArrayBuffer: boolean = true) {
  _save(_toBlob(buffer, isArrayBuffer), filename)
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

export class PackagedModel {
  private _pag: ZipTool
  constructor() {
    this._pag = new ZipTool()
  }
  appScene(scene: Group, name: string) {
    const _pag = this._pag

    return new Promise<void>((resolve, reject) => {
      exporter.parse(
        scene,
        // called when the gltf has been generated
        function (model) {
          if (model instanceof ArrayBuffer) {
            _pag.appFileBlob(`${name}.glb`, _toBlob(model))
          } else {
            const output = JSON.stringify(model, null, 2)
            _pag.appFileBlob(`${name}.gltf`, _toBlob(output))
          }
          resolve()
        },
        // called when there is an error in the generation
        reject,
        { binary: true, includeCustomExtensions: true },
      )
    })
  }
  appJson(data: Object, fileName: string) {
    const output = JSON.stringify(data)
    this._pag.appFileBlob(`${fileName}.json`, _toBlob(output, false))
  }
  generateZip(fileName: string, onComplete: () => void) {
    this._pag.download(fileName, onComplete)
  }
}
