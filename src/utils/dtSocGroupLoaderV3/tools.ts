/**
 * 判斷root是否有值，並組合模型路徑
 * @param root - root
 * @param treePath - 模型路徑
 * @returns 模型路徑
 */
export function modeRootHelper(root: string | null | undefined, treePath: string) {
  const _isTreeIsEndWithSlash = isEndWithSlash(treePath)
  if (root) {
    return _isHttp(root)
      ? isEndWithSlash(root)
        ? root
        : root + '/'
      : _isTreeIsEndWithSlash
      ? treePath + root
      : root
  } else {
    return _isTreeIsEndWithSlash ? treePath : ''
  }
}

/**
 * 判斷結為是否為/結尾
 * @param str - 字串
 * @returns 是否為/結尾
 */
export function isEndWithSlash(str: string) {
  return str[str.length - 1] === '/'
}

/**
 * 判斷字串是否為http開頭
 * @param str - 字串
 * @returns 是否為http開頭
 */
function _isHttp(str: string) {
  return str.indexOf('http') === 0
}
