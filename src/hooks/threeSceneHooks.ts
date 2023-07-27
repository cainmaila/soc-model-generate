import { useEffect, useLayoutEffect, useRef } from 'react'
import {
  WebGLRenderer,
  PCFSoftShadowMap,
  PerspectiveCamera,
  AmbientLight,
  Scene,
  HemisphereLight,
  PointLight,
  SRGBColorSpace,
} from 'three'
import { useWindowSize } from 'usehooks-ts'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

export interface I_ThreeSceneInitSettings {
  clearColor?: number
}

const defSetting: I_ThreeSceneInitSettings = {
  clearColor: 0x888888,
}

/**
 * 初始化three场景
 * @returns { viewerRef, cameraRef, sceneRef, rendererRef, controlsRef }
 */
export const useThreeSceneInit = (setting: I_ThreeSceneInitSettings = {}) => {
  const { clearColor } = { ...defSetting, ...setting }
  const viewerRef = useRef<HTMLDivElement>(null)
  const cameraRef = useRef<PerspectiveCamera>(
    new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.001, 99999),
  )
  const sceneRef = useRef<Scene>(new Scene())
  const rendererRef = useRef<WebGLRenderer>()
  const controlsRef = useRef<OrbitControls>()
  const { width, height } = useWindowSize()

  useEffect(() => {
    if (width + height <= 0 || !cameraRef.current || !rendererRef.current) return
    const camera = cameraRef.current
    const renderer = rendererRef.current
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    renderer.setSize(width, height)
  }, [width, height])

  useLayoutEffect(() => {
    if (!viewerRef.current) return
    const renderer = new WebGLRenderer()
    rendererRef.current = renderer
    const scene = sceneRef.current
    renderer.setSize(window.innerWidth, window.innerHeight)
    viewerRef.current?.appendChild(renderer.domElement)
    // renderer.setClearColor(0x000000)
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = PCFSoftShadowMap
    renderer.outputColorSpace = SRGBColorSpace
    const light = new AmbientLight(0x000000) // soft white light
    scene.add(light)
    const hemiLight = new HemisphereLight(0xddeeff, 0x0f0e0d, 1)
    scene.add(hemiLight)
    const light2 = new PointLight(0xffffff, 1, 4000)
    light2.position.set(100, 0, 200)
    light2.castShadow = true
    scene.add(light2)
    const controls = new OrbitControls(cameraRef.current, renderer.domElement)
    controlsRef.current = controls

    cameraRef.current.position.z = 50

    animate()
    function animate() {
      const scene = sceneRef.current
      const camera = cameraRef.current
      const renderer = rendererRef.current
      controls.update()
      renderer?.render(scene, camera)
      requestAnimationFrame(animate)
    }

    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      viewerRef.current?.removeChild(renderer.domElement)
      rendererRef.current?.dispose()
      rendererRef.current?.forceContextLoss()
      rendererRef.current = undefined
    }
  }, [])

  useEffect(() => {
    if (!rendererRef.current) return
    rendererRef.current.setClearColor(clearColor || 0x888888)
  }, [clearColor, rendererRef])

  return {
    viewerRef,
    cameraRef,
    sceneRef,
    rendererRef,
    controlsRef,
  }
}
