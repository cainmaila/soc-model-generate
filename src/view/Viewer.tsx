import { useThreeSceneInit } from '../hooks/threeSceneHooks'

function Viewer() {
  const { viewerRef } = useThreeSceneInit()

  return <div className="Viewer" ref={viewerRef}></div>
}

export default Viewer
