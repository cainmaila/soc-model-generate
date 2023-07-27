/**
 * 🌲結構節點
 */
export interface I_TreeNode {
  id: string
  parent: string | null
  matrix4?: string | null
  childs?: I_TreeNode[]
  path?: string | null
  box?: string
}

/**
 * 🌲模型結構
 */
export interface I_ModelTiles {
  tree: I_TreeNode[]
  name: string
  version: string
}
