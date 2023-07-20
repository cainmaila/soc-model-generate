import { Group } from 'three'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'

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
