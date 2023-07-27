import { Box } from '@mui/material'
export default function ModelTree() {
  return (
    <Box
      sx={{
        position: 'absolute',
        left: 10,
        top: 10,
        bottom: 10,
        width: 200,
        height: 'calc(100% - 20px)',
        backgroundColor: '#0003',
        /* 毛玻璃濾鏡 */
        backdropFilter: 'blur(2px)',
      }}
    ></Box>
  )
}
