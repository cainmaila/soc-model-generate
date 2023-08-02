import { Box } from '@mui/material'
import { cardStyle } from '../../sx'
import { I_TreeNode } from '../../utils/dtSocGroupLoaderV3_1/interface'
import TreeItem from '@mui/lab/TreeItem'
import TreeView from '@mui/lab/TreeView'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import { SyntheticEvent } from 'react'
interface I_Props {
  movable: I_TreeNode
  onSelected?: (id: string) => void
}
export default function ModelTree({ movable, onSelected }: I_Props) {
  const renderTree = (nodes: I_TreeNode) => (
    <TreeItem key={nodes.id} nodeId={nodes.id} label={nodes.id}>
      {Array.isArray(nodes.childs) ? nodes.childs.map((node) => renderTree(node)) : null}
    </TreeItem>
  )

  return (
    <Box
      sx={{
        position: 'absolute',
        left: 10,
        top: 20,
        width: 'auto',
        minHeight: 100,
        maxHeight: 'calc(100% - 40px)',
        padding: 2,
        borderRadius: 2,
        ...cardStyle,
        color: 'white',
        overflowY: 'auto',
      }}
    >
      <TreeView
        aria-label="rich object"
        defaultCollapseIcon={<ExpandMoreIcon />}
        defaultExpanded={['root']}
        defaultExpandIcon={<ChevronRightIcon />}
        onNodeSelect={(_event: SyntheticEvent, nodeIds: string) =>
          onSelected && onSelected(nodeIds)
        }
        sx={{ margin: 1, textAlign: 'left' }}
      >
        {movable ? renderTree(movable) : null}
      </TreeView>
    </Box>
  )
}
