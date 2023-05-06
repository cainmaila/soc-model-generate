import { useThreeSceneInit } from '../hooks/threeSceneHooks'
import { useDragFileUpload } from '../hooks/dragFileUploadHooks'
import { useEffect } from 'react'
function Viewer() {
  const { viewerRef } = useThreeSceneInit()
  const { data } = useDragFileUpload(viewerRef.current)

  useEffect(() => {
    console.log(data)
  }, [data])

  return <div id="Viewer" ref={viewerRef}></div>
}

export default Viewer
