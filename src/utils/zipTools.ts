import JSZip from 'jszip'

/**
 * 把檔案打包成 zip
 */
export class ZipTool {
  private _zip: JSZip
  /**
   * 開始一包 zip
   */
  constructor() {
    this._zip = new JSZip()
  }
  /**
   * 增加檔案
   * @param filename - 檔案名稱
   * @param blob - 檔案內容
   */
  appFileBlob(filename: string, blob: Blob) {
    this._zip.file(filename, blob)
  }
  /**
   * 開始打包壓縮檔案
   * @returns - 壓縮檔案
   */
  generateAsync() {
    return this._zip.generateAsync({ type: 'blob' })
  }
  /**
   * 打包壓縮檔案並下載
   * @param filename - 檔案名稱
   * @param onComplete - 完成後的 callback
   */
  download(filename: string, onComplete: () => void) {
    this.generateAsync().then((content) => {
      const link = document.createElement('a')
      link.href = URL.createObjectURL(content)
      link.download = filename + '.zip'
      link.click()
      onComplete && onComplete()
    })
  }
}
