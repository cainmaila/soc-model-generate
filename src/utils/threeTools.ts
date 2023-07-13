import { Box3, Object3D, PerspectiveCamera, Vector3 } from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

/**
 * 將鏡頭設置到最佳視野
 * @param obj - 物件
 * @param camera - 鏡頭
 * @param controls - 控制器
 */
export function setCameraToBestView(
  obj: Object3D,
  camera: PerspectiveCamera,
  controls: OrbitControls,
) {
  const box = new Box3().setFromObject(obj)
  const size = box.getSize(new Vector3()).length()
  const center = box.getCenter(new Vector3())
  //   camera.near = size / 100
  //   camera.far = size * 100
  camera.updateProjectionMatrix()
  camera.position.copy(center)
  camera.position.x += size / 2.0
  camera.position.y += size / 5.0
  camera.position.z += size / 2.0
  camera.lookAt(center)
  //物件至中
  controls.target.copy(center)
  controls.maxDistance = size * 10
  controls.saveState()
}
