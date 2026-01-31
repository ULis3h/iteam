import { useEffect, useRef } from 'react'
import * as THREE from 'three'

// ==================== Poisson Disk Sampling ====================
function poissonDiskSampling(width: number, height: number, radius: number, k = 30): THREE.Vector2[] {
    const cellSize = radius / Math.sqrt(2)
    const gridWidth = Math.ceil(width / cellSize)
    const gridHeight = Math.ceil(height / cellSize)
    const grid: (THREE.Vector2 | null)[][] = Array(gridWidth).fill(null).map(() => Array(gridHeight).fill(null))
    const active: THREE.Vector2[] = []
    const points: THREE.Vector2[] = []

    // Start with a random point at center
    const firstPoint = new THREE.Vector2(width / 2, height / 2)
    const gridX = Math.floor(firstPoint.x / cellSize)
    const gridY = Math.floor(firstPoint.y / cellSize)
    grid[gridX][gridY] = firstPoint
    active.push(firstPoint)
    points.push(firstPoint)

    while (active.length > 0) {
        const randomIndex = Math.floor(Math.random() * active.length)
        const point = active[randomIndex]
        let found = false

        for (let i = 0; i < k; i++) {
            const angle = Math.random() * Math.PI * 2
            const r = radius + Math.random() * radius
            const newPoint = new THREE.Vector2(
                point.x + Math.cos(angle) * r,
                point.y + Math.sin(angle) * r
            )

            // Check bounds
            if (newPoint.x < 0 || newPoint.x >= width || newPoint.y < 0 || newPoint.y >= height) {
                continue
            }

            // Check grid
            const gx = Math.floor(newPoint.x / cellSize)
            const gy = Math.floor(newPoint.y / cellSize)

            let valid = true
            for (let dx = -2; dx <= 2; dx++) {
                for (let dy = -2; dy <= 2; dy++) {
                    const nx = gx + dx
                    const ny = gy + dy
                    if (nx >= 0 && nx < gridWidth && ny >= 0 && ny < gridHeight && grid[nx][ny]) {
                        const neighbor = grid[nx][ny]!
                        if (newPoint.distanceTo(neighbor) < radius) {
                            valid = false
                            break
                        }
                    }
                }
                if (!valid) break
            }

            if (valid) {
                grid[gx][gy] = newPoint
                active.push(newPoint)
                points.push(newPoint)
                found = true
                break
            }
        }

        if (!found) {
            active.splice(randomIndex, 1)
        }
    }

    return points
}

// ==================== GLSL Shaders ====================

// Simulation Shader: Physics computation
const simulationVertexShader = `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`

const simulationFragmentShader = `
    precision highp float;

    uniform sampler2D uParticleData;
    uniform sampler2D uReferences;
    uniform vec2 uRingPos;
    uniform float uRingRadius;
    uniform int uIsHovering;
    uniform float uTime;
    uniform vec2 uResolution;
    uniform float uDeltaTime;

    varying vec2 vUv;

    // Hash function for randomization
    float hash(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 34.23);
        return fract(p.x * p.y);
    }

    void main() {
        vec4 data = texture2D(uParticleData, vUv);
        vec4 refData = texture2D(uReferences, vUv);

        vec2 position = data.xy;
        vec2 velocity = data.zw;
        vec2 reference = refData.xy;

        // Mouse interaction - Dead zone
        vec2 toMouse = uRingPos - position;
        float distToMouse = length(toMouse);
        vec2 repel = vec2(0.0);

        if (uIsHovering == 1) {
            // Dead zone: 0-60px strong repel
            if (distToMouse < uRingRadius && distToMouse > 0.1) {
                float force = (uRingRadius - distToMouse) / uRingRadius * 10.0;
                repel = -normalize(toMouse) * force;
            }
            // Push zone: 60-200px gentle push
            else if (distToMouse < uRingRadius * 3.5 && distToMouse > 0.1) {
                float force = (uRingRadius * 3.5 - distToMouse) / (uRingRadius * 2.5) * 3.0;
                repel = -normalize(toMouse) * force;
            }
        }

        // Google's physics approach
        vec2 targetPos = reference;
        vec2 direction = normalize(targetPos - position);
        direction *= 0.01;

        float dist = length(targetPos - position);
        float distRadius = 0.15;
        float distStrength = smoothstep(distRadius, 0.0, dist);

        // Direct position update (like Google)
        vec2 finalPos = position;
        if(dist > 0.005){
            finalPos += direction * distStrength;
        }

        // Add repel force
        finalPos += repel;

        // Calculate diff and apply (Google uses diff *= 0.2)
        vec2 diff = finalPos - position;
        diff *= 0.2;

        // Update velocity based on movement
        velocity = diff;

        // Update position
        position += diff;

        // Output: position.xy in xy, velocity.xy in zw
        gl_FragColor = vec4(position, velocity);
    }
`

// Rendering Shader: Particle visualization
const particleVertexShader = `
    precision highp float;

    uniform sampler2D uParticleData;
    uniform float uPixelRatio;
    uniform vec2 uResolution;

    attribute vec2 particleUV;

    varying vec2 vVelocity;
    varying float vSpeed;

    void main() {
        vec4 data = texture2D(uParticleData, particleUV);

        vec2 screenPos = data.xy;
        vec2 velocity = data.zw;

        vVelocity = velocity;
        vSpeed = length(velocity);

        // Convert from pixel coordinates to clip space [-1, 1]
        vec2 clipPos = (screenPos / uResolution) * 2.0 - 1.0;
        clipPos.y *= -1.0; // Flip Y

        gl_Position = vec4(clipPos, 0.0, 1.0);

        // Particle size (Google formula: vScale * 7 * pixelRatio * 0.5 * particleScale + minScale)
        float particleScale = 1.0;
        float minScale = 0.25;
        float vScale = clamp(vSpeed * 0.3, 0.0, 1.0); // Normalize to 0-1
        gl_PointSize = ((vScale * 7.0) * (uPixelRatio * 0.5) * particleScale) + (minScale * uPixelRatio);
    }
`

const particleFragmentShader = `
    precision highp float;

    uniform vec3 uColor1;
    uniform vec3 uColor2;
    uniform vec3 uColor3;
    uniform vec2 uRingPos;
    uniform vec2 uResolution;

    varying vec2 vVelocity;
    varying float vSpeed;

    void main() {
        // Create circular particle (Google uses smoothstep(.5, .45, length(uv)))
        vec2 uv = gl_PointCoord.xy;
        uv -= vec2(0.5);
        uv.y *= -1.0;

        // Circular disc with smooth edges
        float disc = smoothstep(0.5, 0.45, length(uv));

        // Color mixing (Google formula with h=0.8)
        float h = 0.8;
        float progress = clamp(vSpeed * 0.25, 0.0, 1.0); // Normalize velocity to 0-1
        vec3 col = mix(
            mix(uColor1, uColor2, progress/h),
            mix(uColor2, uColor3, (progress - h)/(1.0 - h)),
            step(h, progress)
        );

        // Alpha based on disc (always visible, even when static)
        float vScale = 0.5 + clamp(vSpeed * 0.5, 0.0, 0.5); // 0.5-1.0 range
        float alpha = disc * smoothstep(0.1, 0.2, vScale) * 0.85;

        if(alpha < 0.01) {
            discard;
        }

        gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));
    }
`

// ==================== Main Component ====================
export default function ParticleBackground() {
    const containerRef = useRef<HTMLDivElement>(null)
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
    const sceneRef = useRef<THREE.Scene | null>(null)
    const cameraRef = useRef<THREE.OrthographicCamera | null>(null)
    const particleSystemRef = useRef<THREE.Points | null>(null)
    const simulationMaterialRef = useRef<THREE.ShaderMaterial | null>(null)
    const renderTargetsRef = useRef<{
        data: [THREE.WebGLRenderTarget, THREE.WebGLRenderTarget],
        current: number
    } | null>(null)
    const mouseRef = useRef({ x: -1000, y: -1000, isHovering: false })
    const clockRef = useRef(new THREE.Clock())

    useEffect(() => {
        if (!containerRef.current) return

        const width = window.innerWidth
        const height = window.innerHeight
        const dpr = window.devicePixelRatio || 1

        // ==================== Setup Renderer ====================
        const renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            premultipliedAlpha: false
        })
        renderer.setSize(width, height)
        renderer.setPixelRatio(dpr)
        containerRef.current.appendChild(renderer.domElement)
        rendererRef.current = renderer

        // ==================== Setup Scene ====================
        const scene = new THREE.Scene()
        sceneRef.current = scene

        const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
        cameraRef.current = camera

        // ==================== Particle Initialization ====================
        const particleRadius = 25 // Minimum distance between particles (Google uses ~6-7 in normalized space)
        const positions = poissonDiskSampling(width, height, particleRadius)
        const particleCount = positions.length
        const textureSize = Math.ceil(Math.sqrt(particleCount))

        console.log(`Initialized ${particleCount} particles in ${textureSize}x${textureSize} texture`)

        // Create data textures
        const particleData = new Float32Array(textureSize * textureSize * 4)
        const referenceData = new Float32Array(textureSize * textureSize * 4)
        const particleUVs = new Float32Array(particleCount * 2)

        positions.forEach((pos, i) => {
            const idx = i * 4
            const uvIdx = i * 2

            // Particle data: position (xy) + velocity (zw)
            particleData[idx] = pos.x
            particleData[idx + 1] = pos.y
            particleData[idx + 2] = (Math.random() - 0.5) * 0.5 // vx
            particleData[idx + 3] = (Math.random() - 0.5) * 0.5 // vy

            // Reference position (home position)
            referenceData[idx] = pos.x
            referenceData[idx + 1] = pos.y
            referenceData[idx + 2] = 0
            referenceData[idx + 3] = 1

            // Particle UV coordinates for texture lookup
            const u = (i % textureSize) / textureSize
            const v = Math.floor(i / textureSize) / textureSize
            particleUVs[uvIdx] = u
            particleUVs[uvIdx + 1] = v
        })

        const particleDataTexture = new THREE.DataTexture(
            particleData,
            textureSize,
            textureSize,
            THREE.RGBAFormat,
            THREE.FloatType
        )
        particleDataTexture.needsUpdate = true

        const referenceTexture = new THREE.DataTexture(
            referenceData,
            textureSize,
            textureSize,
            THREE.RGBAFormat,
            THREE.FloatType
        )
        referenceTexture.needsUpdate = true

        // ==================== GPGPU Simulation Setup ====================
        const renderTargetOptions = {
            minFilter: THREE.NearestFilter,
            magFilter: THREE.NearestFilter,
            format: THREE.RGBAFormat,
            type: THREE.FloatType,
        }

        const dataRT1 = new THREE.WebGLRenderTarget(textureSize, textureSize, renderTargetOptions)
        const dataRT2 = new THREE.WebGLRenderTarget(textureSize, textureSize, renderTargetOptions)

        renderTargetsRef.current = {
            data: [dataRT1, dataRT2],
            current: 0
        }

        // Copy initial data to render targets
        const copyScene = new THREE.Scene()
        const copyCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
        const copyGeometry = new THREE.PlaneGeometry(2, 2)

        const copyMaterial = new THREE.ShaderMaterial({
            uniforms: { tSource: { value: null } },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D tSource;
                varying vec2 vUv;
                void main() {
                    gl_FragColor = texture2D(tSource, vUv);
                }
            `
        })

        const copyMesh = new THREE.Mesh(copyGeometry, copyMaterial)
        copyScene.add(copyMesh)

        copyMaterial.uniforms.tSource.value = particleDataTexture
        renderer.setRenderTarget(dataRT1)
        renderer.render(copyScene, copyCamera)

        renderer.setRenderTarget(null)

        // Simulation material
        const simulationMaterial = new THREE.ShaderMaterial({
            uniforms: {
                uParticleData: { value: dataRT1.texture },
                uReferences: { value: referenceTexture },
                uRingPos: { value: new THREE.Vector2(-1000, -1000) },
                uRingRadius: { value: 60 },
                uIsHovering: { value: 0 },
                uTime: { value: 0 },
                uResolution: { value: new THREE.Vector2(width, height) },
                uDeltaTime: { value: 0 }
            },
            vertexShader: simulationVertexShader,
            fragmentShader: simulationFragmentShader
        })
        simulationMaterialRef.current = simulationMaterial

        const simulationGeometry = new THREE.PlaneGeometry(2, 2)
        const simulationMesh = new THREE.Mesh(simulationGeometry, simulationMaterial)
        const simulationScene = new THREE.Scene()
        simulationScene.add(simulationMesh)

        // ==================== Particle Rendering Setup ====================
        const particleGeometry = new THREE.BufferGeometry()
        particleGeometry.setAttribute('position', new THREE.Float32BufferAttribute(
            new Array(particleCount * 3).fill(0),
            3
        ))
        particleGeometry.setAttribute('particleUV', new THREE.Float32BufferAttribute(particleUVs, 2))

        const particleMaterial = new THREE.ShaderMaterial({
            uniforms: {
                uParticleData: { value: dataRT1.texture },
                uPixelRatio: { value: dpr },
                uResolution: { value: new THREE.Vector2(width, height) },
                uRingPos: { value: new THREE.Vector2(-1000, -1000) },
                uColor1: { value: new THREE.Color('#318bf7') }, // Google Blue
                uColor2: { value: new THREE.Color('#bada4c') }, // Yellow-Green
                uColor3: { value: new THREE.Color('#e35058') }, // Red
            },
            vertexShader: particleVertexShader,
            fragmentShader: particleFragmentShader,
            transparent: true,
            blending: THREE.NormalBlending,
            depthTest: false,
            depthWrite: false
        })

        const particleSystem = new THREE.Points(particleGeometry, particleMaterial)
        scene.add(particleSystem)
        particleSystemRef.current = particleSystem

        // ==================== Mouse Interaction ====================
        const handleMouseMove = (e: MouseEvent) => {
            mouseRef.current = { x: e.clientX, y: e.clientY, isHovering: true }
        }

        const handleMouseLeave = () => {
            mouseRef.current = { x: -1000, y: -1000, isHovering: false }
        }

        window.addEventListener('mousemove', handleMouseMove)
        window.addEventListener('mouseleave', handleMouseLeave)

        // ==================== Animation Loop ====================
        const animate = () => {
            const delta = clockRef.current.getDelta()
            const elapsed = clockRef.current.getElapsedTime()

            if (renderTargetsRef.current && simulationMaterialRef.current) {
                const { data, current } = renderTargetsRef.current
                const next = 1 - current

                // Update simulation uniforms
                simulationMaterialRef.current.uniforms.uParticleData.value = data[current].texture
                simulationMaterialRef.current.uniforms.uRingPos.value.set(
                    mouseRef.current.x,
                    mouseRef.current.y
                )
                simulationMaterialRef.current.uniforms.uIsHovering.value = mouseRef.current.isHovering ? 1 : 0
                simulationMaterialRef.current.uniforms.uTime.value = elapsed
                simulationMaterialRef.current.uniforms.uDeltaTime.value = delta

                // Run simulation (outputs to 'next' buffer)
                renderer.setRenderTarget(data[next])
                renderer.render(simulationScene, copyCamera)

                renderer.setRenderTarget(null)

                // Update particle material to read from new texture
                particleMaterial.uniforms.uParticleData.value = data[next].texture
                particleMaterial.uniforms.uRingPos.value.set(
                    mouseRef.current.x,
                    mouseRef.current.y
                )

                // Swap buffers
                renderTargetsRef.current.current = next
            }

            // Render particles
            renderer.render(scene, camera)

            requestAnimationFrame(animate)
        }

        animate()

        // ==================== Cleanup ====================
        return () => {
            window.removeEventListener('mousemove', handleMouseMove)
            window.removeEventListener('mouseleave', handleMouseLeave)

            if (containerRef.current && renderer.domElement) {
                containerRef.current.removeChild(renderer.domElement)
            }

            renderer.dispose()
            particleGeometry.dispose()
            particleMaterial.dispose()
            simulationMaterial.dispose()
            dataRT1.dispose()
            dataRT2.dispose()
            particleDataTexture.dispose()
            referenceTexture.dispose()
        }
    }, [])

    return (
        <>
            <div
                ref={containerRef}
                className="fixed inset-0 pointer-events-none"
                style={{
                    zIndex: 0,
                    background: 'linear-gradient(135deg, #f8f9fa 0%, #e8eaed 50%, #f8f9fa 100%)',
                }}
            />
            <div
                className="fixed inset-0 pointer-events-none"
                style={{
                    zIndex: 0,
                    background: 'radial-gradient(ellipse at center, transparent 0%, transparent 65%, rgba(66, 133, 244, 0.04) 100%)',
                }}
            />
        </>
    )
}
