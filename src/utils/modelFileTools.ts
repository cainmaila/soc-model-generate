import { Group } from 'three'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'
import { ZipTool } from './zipTools'

const exporter = new GLTFExporter()

/**
 * 轉成blob
 * @param data - 要轉的資料
 * @param isArrayBuffer - 是否為ArrayBuffer
 * @returns {Blob} - 返回 Blob 对象。
 */
function _toBlob(data: any, isArrayBuffer: boolean = true) {
  return new Blob([data], { type: isArrayBuffer ? 'application/octet-stream' : 'text/plain' })
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
