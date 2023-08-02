export function sleeper(ms = 0) {
  return new Promise<void>((resolve) => setTimeout(() => resolve(), ms))
}

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
 * 将树形结构转换为数组
 * @param tree - 树形结构
 * @param list - 转换后的数组
 * @param childrenKey - 子节点的key
 * @param parentKey - 父节点的key
 * @returns 转换后的数组
 */
export const treeToArray = (
  tree: any,
  list: any[] = [],
  childrenKey: string = 'childs',
  parentKey: string = 'parent',
) => {
  const _childs = tree[childrenKey]
  if (!_childs) throw new Error('childrenKey is not exist')
  _childs.forEach((item: any) => {
    const _item = { ...item, parent: tree?.id || '_root' }
    list.push(_item)
    const _lv2childs = item[childrenKey]
    delete _item[childrenKey]
    if (_lv2childs?.length) treeToArray(item, list, childrenKey, parentKey)
  })
  return list
}

/**
 * 将数组转换为树形结构
 * @param list - 数组
 * @param idKey - id的key
 * @param parentKey - 父节点的key
 * @param childrenKey - 子节点的key
 * @returns - 树形结构
 */
export function arrayToTree(
  list: any[],
  idKey: string = 'id',
  parentKey: string = 'parent',
  childrenKey: string = 'childs',
) {
  const _list = list.map((item) => ({ ...item }))
  const _tree: any[] = []
  _list.forEach((item) => {
    const _parent = _list.find((i) => i[idKey] === item[parentKey])
    if (_parent) {
      if (!_parent[childrenKey]) _parent[childrenKey] = []
      _parent[childrenKey].push(item)
    } else {
      _tree.push(item)
    }
  })
  return { id: '_root', [childrenKey]: _tree }
}

/**
 * 判斷字串是否為http開頭
 * @param str - 字串
 * @returns 是否為http開頭
 */
function _isHttp(str: string) {
  return str.indexOf('http') === 0
}
