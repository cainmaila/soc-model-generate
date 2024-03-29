import { Box3, Object3D, PerspectiveCamera, Vector3 } from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { gsap } from 'gsap'

/**
 * 將鏡頭設置到最佳視野
 * @param obj - 物件
 * @param camera - 鏡頭
 * @param controls - 控制器
 * @returns 返回一個Box3對象，其中包含物件的邊界框。如果物件沒有邊界框，則返回null。
 */
export function setCameraToBestView(
  obj: Object3D,
  camera: PerspectiveCamera,
  controls: OrbitControls,
) {
  const box = new Box3().setFromObject(obj)
  if (box.max.x === -Infinity) return null
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
  return box
}

const sizeOb = { nowSize: 0 }

/**
 * 飛到最佳視野
 * @param obj
 * @param camera
 * @param controls
 * @returns
 */
export function flyToBestView(
  obj: Object3D,
  camera: PerspectiveCamera,
  controls: OrbitControls,
  duration: number = 1.5,
) {
  const box = new Box3().setFromObject(obj)
  if (box.max.x === -Infinity) return null
  const size = box.getSize(new Vector3()).length() * 1.5 /* 距離 1~ */
  const nowCenter = controls.target.clone()
  const center = box.getCenter(new Vector3())
  const po = center.clone()
  /* 視角 */
  po.x += size / 2.0
  po.y += size / 10.0
  po.z += size / 2.0

  gsap.getById('size')?.kill()
  gsap.getById('center')?.kill()
  gsap.getById('position')?.kill()
  gsap.to(sizeOb, {
    nowSize: size,
    id: 'size',
    onUpdate: () => {
      controls.maxDistance = sizeOb.nowSize * 10
    },
    duration,
  })
  gsap.to(nowCenter, {
    ...center,
    id: 'center',
    onUpdate: () => {
      camera.lookAt(nowCenter)
      controls.target.copy(nowCenter)
    },
    duration,
  })
  gsap.to(camera.position, {
    ...po,
    id: 'position',
    onUpdate: () => {
      camera.updateProjectionMatrix()
      controls.update()
    },
    duration,
    onComplete: () => {
      controls.saveState()
    },
  })
  return box
}

/**
 * 此函数将 GLB 数据转换为 Blob 对象。
 */
export function glbToBlob(glbData: BlobPart) {
  return new Blob([glbData], { type: 'application/octet-stream' })
}
