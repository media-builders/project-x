"use client"

import dynamic from "next/dynamic"
import { useMemo, useRef } from "react"
import * as THREE from "three"
import { Canvas, useFrame } from "@react-three/fiber"

const DynamicCanvas = dynamic(() => Promise.resolve(Canvas), { ssr: false })

function SynthWaveField() {
  const pointsRef = useRef<THREE.Points>(null!)
  const width = 280
  const depth = 280
  const spacing = 0.1
  const pointSize = 0.035

  // --- Geometry setup
  const geometry = useMemo(() => {
    const positions = new Float32Array(width * depth * 3)
    const colors = new Float32Array(width * depth * 3)
    const fades = new Float32Array(width * depth)

    let i = 0
    for (let x = 0; x < width; x++) {
      for (let z = 0; z < depth; z++) {
        const px = (x - width / 2) * spacing
        const pz = (z - depth / 2) * spacing
        positions[i * 3 + 0] = px
        positions[i * 3 + 1] = 0
        positions[i * 3 + 2] = pz

        // --- radial fade (for edge transparency and falloff)
        const dx = (x - width / 2) / (width / 2)
        const dz = (z - depth / 2) / (depth / 2)
        const dist = Math.sqrt(dx * dx + dz * dz)
        const fade = Math.max(0.0, 1.0 - dist * 1.2) // affects both alpha + amplitude
        fades[i] = fade

        const color = new THREE.Color().setHSL(0.55 + 0.05 * dz, 1.0, 0.55)
        colors[i * 3 + 0] = color.r
        colors[i * 3 + 1] = color.g
        colors[i * 3 + 2] = color.b
        i++
      }
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3))
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3))
    geo.setAttribute("aFade", new THREE.BufferAttribute(fades, 1))
    return geo
  }, [])

  // --- Shader with sparkle and radial alpha fade
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
      uniforms: {
        uSize: { value: pointSize },
        uPixelRatio: {
          value: typeof window !== "undefined"
            ? Math.min(2, window.devicePixelRatio)
            : 1,
        },
        uAberration: { value: 0.02 },
        uTime: { value: 0 },
      },
      vertexShader: `
        attribute float aFade;
        varying vec3 vColor;
        varying float vFade;
        varying float vHeight;
        uniform float uSize;
        uniform float uPixelRatio;

        void main() {
          vColor = color;
          vFade = aFade;      // fade carries radial alpha info
          vHeight = position.y;

          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          float size = uSize * (250.0 / -mvPosition.z);
          gl_PointSize = size * uPixelRatio;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        precision highp float;
        varying vec3 vColor;
        varying float vFade;
        varying float vHeight;
        uniform float uAberration;
        uniform float uTime;

        void main() {
          vec2 p = gl_PointCoord - 0.5;
          float r = length(p);
          float alphaCircle = smoothstep(0.5, 0.3, r);

          // transparency: mix height + radial fade
          float heightAlpha = 1.0 - smoothstep(-0.2, 0.6, vHeight);
          float alpha = alphaCircle * vFade * heightAlpha;
          if (alpha < 0.02) discard;

          float angle = atan(p.y, p.x);
          float t = uTime * 1.5;

          // sparkle effect near peaks
          float sparkle = smoothstep(0.3, 0.9, abs(vHeight))
                        * (0.6 + 0.4 * sin(t * 5.0 + vHeight * 20.0));
          vec3 sparkleColor = vec3(
            0.6 + 0.4 * sin(t * 3.0 + vHeight * 8.0),
            0.6 + 0.4 * sin(t * 2.0 + vHeight * 10.0 + 2.0),
            0.6 + 0.4 * sin(t * 4.0 + vHeight * 12.0 + 4.0)
          );

          vec3 col = vColor * (1.0 + uAberration * sin(angle + 1.0));
          col += sparkle * sparkleColor;
          gl_FragColor = vec4(col, alpha);
        }
      `,
    })
  }, [])

  // --- Animation logic (central peaks, transparent edges)
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    material.uniforms.uTime.value = t
    const positions = geometry.attributes.position as THREE.BufferAttribute
    const fades = geometry.attributes.aFade as THREE.BufferAttribute

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i)
      const z = positions.getZ(i)

      // radial falloff (0 center → 1 edge)
      const dist = Math.sqrt(x * x + z * z) / (width * spacing * 0.5)
      const edgeFalloff = Math.max(0.0, 1.0 - dist * dist * 1.3)

      // wave with center intensity bias
      const y =
        (Math.sin(x * 1.2 + t * 0.25) * 0.6 +
         Math.sin((x * 0.8 + z * 0.9) - t * 0.18) * 0.3 +
         Math.sin(z * 0.6 + t * 0.22) * 0.15) * edgeFalloff

      positions.setY(i, y)
      fades.setX(i, edgeFalloff) // update fade to drive alpha too
    }

    positions.needsUpdate = true
    fades.needsUpdate = true

    if (pointsRef.current) {
      pointsRef.current.rotation.y = Math.sin(t * 0.01) * 0.2
    }
  })

  return (
    <points ref={pointsRef} geometry={geometry}>
      <primitive object={material} attach="material" />
    </points>
  )
}

export default function Wave() {
  return (
    <div
      className="wave gradient-night"
      style={{
        width: "100%",
        height: "100vh",
      }}
    >
      <DynamicCanvas
        camera={{ position: [5, 4, 8], fov: 25 }}
        gl={{ antialias: true }}
      >
        <ambientLight intensity={0.6} />
        <SynthWaveField />
      </DynamicCanvas>
    </div>
  )
}
