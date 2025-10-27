"use client"

import dynamic from "next/dynamic"
import { useMemo, useRef } from "react"
import * as THREE from "three"
import { Canvas, useFrame } from "@react-three/fiber"

const DynamicCanvas = dynamic(() => Promise.resolve(Canvas), { ssr: false })

function SynthWaveField() {
  const pointsRef = useRef<THREE.Points>(null!)
  const glowRef = useRef<THREE.Points>(null!)
  const linesRef = useRef<THREE.LineSegments>(null!)

  const width = 280
  const depth = 280
  const spacing = 0.1

  // --- Grid vertex geometry
  const geometry = useMemo(() => {
    const positions = new Float32Array(width * depth * 3)
    let i = 0
    for (let x = 0; x < width; x++) {
      for (let z = 0; z < depth; z++) {
        positions[i * 3 + 0] = (x - width / 2) * spacing
        positions[i * 3 + 1] = 0
        positions[i * 3 + 2] = (z - depth / 2) * spacing
        i++
      }
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3))
    geo.attributes.position.setUsage(THREE.DynamicDrawUsage)
    return geo
  }, [])

  // --- Grid line geometry
  const lineGeometry = useMemo(() => {
    const positions: number[] = []
    for (let x = 0; x < width; x++) {
      for (let z = 0; z < depth; z++) {
        const px = (x - width / 2) * spacing
        const pz = (z - depth / 2) * spacing
        if (x < width - 1) {
          const nx = ((x + 1) - width / 2) * spacing
          const nz = pz
          positions.push(px, 0, pz, nx, 0, nz)
        }
        if (z < depth - 1) {
          const nx = px
          const nz = ((z + 1) - depth / 2) * spacing
          positions.push(px, 0, pz, nx, 0, nz)
        }
      }
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3))
    geo.attributes.position.setUsage(THREE.DynamicDrawUsage)
    return geo
  }, [])

  // --- Line shader (neon green visible on white)
  const lineMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      transparent: true,
      blending: THREE.NormalBlending,
      depthWrite: false,
      vertexShader: `
        varying float vHeight;
        varying float vEdgeFade;
        void main() {
          vHeight = position.y;
          float dist = length(position.xz) / 14.0;
          vEdgeFade = 1.0 - smoothstep(0.7, 1.0, dist);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;
        varying float vHeight;
        varying float vEdgeFade;
        void main() {
          float heightFade = smoothstep(-0.3, 0.6, vHeight);
          float alpha = heightFade * vEdgeFade;
          vec3 color = vec3(0.0, 1.0, 0.3); // bright neon green
          gl_FragColor = vec4(color, alpha * 0.9);
          if (gl_FragColor.a < 0.05) discard;
        }
      `,
    })
  }, [])

  // --- Circular particles (neon green, visible on white)
  const glowMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
      uniforms: {
        uTime: { value: 0 },
        uSize: { value: 0.25 },
        uPixelRatio: {
          value:
            typeof window !== "undefined"
              ? Math.min(2, window.devicePixelRatio)
              : 1,
        },
      },
      vertexShader: `
        uniform float uSize;
        uniform float uPixelRatio;
        varying float vHeight;
        varying float vEdgeFade;
        void main() {
          vHeight = position.y;
          float dist = length(position.xz) / 14.0;
          vEdgeFade = 1.0 - smoothstep(0.7, 1.0, dist);
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = uSize * (250.0 / -mvPosition.z) * uPixelRatio;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        precision highp float;
        varying float vHeight;
        varying float vEdgeFade;

        void main() {
          vec2 p = gl_PointCoord - 0.5;
          float r = length(p);
          float circle = smoothstep(0.5, 0.1, r);
          float heightFade = smoothstep(-0.3, 0.6, vHeight);
          float alpha = heightFade * vEdgeFade;

          vec3 color = vec3(0.0, 1.0, 0.3); // vivid neon green
          gl_FragColor = vec4(color * 1.3, circle * alpha);
          if (gl_FragColor.a < 0.05) discard;
        }
      `,
    })
  }, [])

  const pointMaterial = useMemo(
    () =>
      new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.03,
        transparent: true,
        opacity: 0.0,
        depthWrite: false,
      }),
    []
  )

  // --- Animation loop
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    const pos = geometry.attributes.position as THREE.BufferAttribute
    const linePos = lineGeometry.attributes.position as THREE.BufferAttribute

    for (let x = 0; x < width; x++) {
      for (let z = 0; z < depth; z++) {
        const i = x * depth + z
        const px = (x - width / 2) * spacing
        const pz = (z - depth / 2) * spacing
        const dist = Math.sqrt(px * px + pz * pz) / (width * spacing * 0.5)
        const fade = Math.max(0.0, 1.0 - dist * dist * 1.3)
        const y =
          (Math.sin(px * 1.2 + t * 0.25) * 0.6 +
            Math.sin((px * 0.8 + pz * 0.9) - t * 0.18) * 0.3 +
            Math.sin(pz * 0.6 + t * 0.22) * 0.15) *
          fade
        pos.setY(i, y)
      }
    }

    // sync lines
    let v = 0
    for (let x = 0; x < width; x++) {
      for (let z = 0; z < depth; z++) {
        const i = x * depth + z
        const y = pos.getY(i)
        if (x < width - 1) {
          const yNext = pos.getY(i + depth)
          linePos.setY(v, y)
          linePos.setY(v + 1, yNext)
          v += 2
        }
        if (z < depth - 1) {
          const yNext = pos.getY(i + 1)
          linePos.setY(v, y)
          linePos.setY(v + 1, yNext)
          v += 2
        }
      }
    }

    pos.needsUpdate = true
    linePos.needsUpdate = true

    const rot = Math.sin(t * 0.01) * 0.2
    if (pointsRef.current) pointsRef.current.rotation.y = rot
    if (glowRef.current) glowRef.current.rotation.y = rot
    if (linesRef.current) linesRef.current.rotation.y = rot
  })

  return (
    <>
      <points ref={pointsRef} geometry={geometry} material={pointMaterial} />
      <points ref={glowRef} geometry={geometry} material={glowMaterial} />
      <lineSegments ref={linesRef} geometry={lineGeometry} material={lineMaterial} />
    </>
  )
}

export default function Wave() {
  return (
    <div
      className="wave gradient-day"
      style={{ width: "100%", height: "100vh" }}
    >
      <DynamicCanvas
        camera={{ position: [18, 12, 28], fov: 30 }}
        gl={{ antialias: true }}
      >
        <color attach="background" args={["#ffffff"]} />
        <SynthWaveField />
      </DynamicCanvas>
    </div>
  )
}
