import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { Suspense, useEffect, useMemo, useRef } from 'react';
import type { RefObject } from 'react';
import * as THREE from 'three';
import { asset } from '../assets';
import { chapters } from './chapters';
import type { StoryFrame } from './chapters';

interface Props {
  frame: RefObject<StoryFrame>;
  onReady: () => void;
  onFailure: () => void;
}

const vertex = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// The lantern opens a ragged aperture onto the next location. Both plates
// stay in the same camera space, including when the player scrolls backwards.
const fragment = `
  uniform sampler2D plateA, plateB;
  uniform vec2 cropA, cropB, anchorA, anchorB, lanternA, lanternB, pointer;
  uniform float blend, clockTime, aspect;
  varying vec2 vUv;
  float hash(vec2 v) { return fract(sin(dot(v, vec2(127.1,311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p); f=f*f*(3.-2.*f);
    return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),
               mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);
  }
  void main() {
    vec2 uvA=(vUv-anchorA)*cropA+anchorA, uvB=(vUv-anchorB)*cropB+anchorB;
    vec3 a=texture2D(plateA,uvA).rgb, b=texture2D(plateB,uvB).rgb;
    float field=length((vUv-vec2(.69,.46))*vec2(min(aspect,1.85),.85));
    float grain=noise(vUv*7.)*.09+noise(vUv*21.)*.026;
    float front=mix(-.23,2.18,blend);
    float iris=1.-smoothstep(front-.085,front+.085,field+grain);
    float warmEdge=(1.-smoothstep(.0,.095,abs(field+grain-front)))*sin(blend*3.14159);
    vec3 scene=mix(a,b,iris);
    float flutter=.91+.065*sin(clockTime*1.9)+.025*sin(clockTime*3.1);
    float lampA=exp(-length((uvA-lanternA)*vec2(1.8,1.))*15.);
    float lampB=exp(-length((uvB-lanternB)*vec2(1.8,1.))*15.);
    float lamp=mix(lampA,lampB,iris)*flutter;
    float pointerLight=exp(-length((vUv-pointer)*vec2(min(aspect,1.8),1.))*6.);
    scene+=vec3(.22,.105,.027)*lamp+vec3(.036,.025,.011)*pointerLight+vec3(.10,.040,.012)*warmEdge;
    gl_FragColor=vec4(scene,1.);
    #include <colorspace_fragment>
  }
`;

const fog = `
  uniform float clockTime;
  varying vec2 vUv;
  void main() {
    float h=vUv.y+.029*sin(vUv.x*10.+clockTime*.13)+.021*sin(vUv.x*17.-clockTime*.16);
    float veil=exp(-pow((h-.29)*9.,2.))*(.5+.5*sin(vUv.x*7.-clockTime*.09));
    gl_FragColor=vec4(.43,.51,.46,veil*.065);
    #include <colorspace_fragment>
  }
`;
const moteVertex = `
  attribute float seed;
  uniform float clockTime, pixelRatio;
  uniform vec2 cursor;
  varying float pulse;
  void main() {
    vec3 p=position;
    p.x+=.12*sin(clockTime*.21+seed*43.);
    p.y+=.09*sin(clockTime*.33+seed*31.);
    vec2 difference=p.xy-cursor;
    float wake=exp(-dot(difference,difference)*2.);
    p.xy+=difference*wake*.46;
    vec4 eye=modelViewMatrix*vec4(p,1.);
    gl_Position=projectionMatrix*eye;
    gl_PointSize=clamp((8.+9.*seed)*pixelRatio/(-eye.z),1.,8.);
    pulse=.30+.62*pow(.5+.5*sin(seed*67.+clockTime*(.8+seed*.5)),2.);
  }
`;
const moteFragment = `
  varying float pulse;
  void main() {
    float r=length(gl_PointCoord-.5)*2.;
    if(r>=1.) discard;
    gl_FragColor=vec4(mix(vec3(.75,.35,.11),vec3(1.,.86,.57),1.-r),pulse*(1.-r*r));
    #include <colorspace_fragment>
  }
`;

function VillageSet({ frame, onReady, onFailure }: Props) {
  const { gl, size, camera, advance } = useThree();
  const plates = useLoader(
    THREE.TextureLoader,
    chapters.map((chapter) => asset(chapter.image)),
  );
  const foliage = useLoader(THREE.TextureLoader, asset('rimbun.webp'));
  const plate = useRef<THREE.Mesh>(null);
  const veil = useRef<THREE.Mesh>(null);
  const plateShader = useRef<THREE.ShaderMaterial>(null);
  const fogShader = useRef<THREE.ShaderMaterial>(null);
  const moteShader = useRef<THREE.ShaderMaterial>(null);
  const canopy = useRef<THREE.Mesh>(null);
  const leaves = useRef<THREE.MeshBasicMaterial>(null);
  const uniforms = useMemo(
    () => ({
      plateA: { value: plates[0] },
      plateB: { value: plates[1] },
      cropA: { value: new THREE.Vector2() },
      cropB: { value: new THREE.Vector2() },
      anchorA: { value: new THREE.Vector2() },
      anchorB: { value: new THREE.Vector2() },
      lanternA: { value: new THREE.Vector2() },
      lanternB: { value: new THREE.Vector2() },
      blend: { value: 0 },
      clockTime: { value: 0 },
      aspect: { value: 1 },
      pointer: { value: new THREE.Vector2(0.7, 0.5) },
    }),
    [plates],
  );
  const haze = useMemo(() => ({ clockTime: { value: 0 } }), []);
  const dust = useMemo(
    () => ({ clockTime: { value: 0 }, pixelRatio: { value: 1 }, cursor: { value: new THREE.Vector2() } }),
    [],
  );
  const [positions, seeds] = useMemo(() => {
    const count = size.width < 680 ? 42 : 88;
    const xyz = new Float32Array(count * 3),
      values = new Float32Array(count);
    let seed = 1974;
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    for (let i = 0; i < count; i++) {
      xyz[i * 3] = (random() - 0.5) * 11.2;
      xyz[i * 3 + 1] = (random() - 0.5) * 4.7;
      xyz[i * 3 + 2] = random() * 2.7 + 0.2;
      values[i] = random();
    }
    return [xyz, values];
  }, [size.width < 680]);
  const elapsed = useRef(0);
  const ready = useRef(false);

  useEffect(() => {
    for (const texture of [...plates, foliage]) {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.needsUpdate = true;
    }
    const canvas = gl.domElement;
    const lose = (event: Event) => {
      event.preventDefault();
      onFailure();
    };
    canvas.addEventListener('webglcontextlost', lose);
    const draw = (seconds: number) => {
      elapsed.current = seconds;
      advance(seconds, false);
    };
    const state = frame.current;
    state.draw = draw;
    draw(elapsed.current);
    return () => {
      canvas.removeEventListener('webglcontextlost', lose);
      if (state.draw === draw) delete state.draw;
    };
  }, [advance, frame, gl, onFailure, plates, foliage]);

  useFrame(() => {
    if (!plateShader.current || !fogShader.current || !moteShader.current) return;
    // R3F keeps the material's uniform objects stable and merges JSX props
    // into them. Mutate the mounted materials to update scalar and texture values.
    const paint = plateShader.current.uniforms as typeof uniforms;
    const mist = fogShader.current.uniforms as typeof haze;
    const particles = moteShader.current.uniforms as typeof dust;
    const motion = frame.current;
    const position = Math.min(chapters.length - 1, Math.max(0, motion.position));
    const a = Math.min(Math.floor(position), chapters.length - 2),
      b = a + 1;
    const local = position - a;
    const aspect = size.width / Math.max(1, size.height);
    const lens = camera as THREE.PerspectiveCamera;
    const wave = Math.sin(Math.PI * position);
    lens.position.set(
      0.17 * Math.sin(position * 1.6) + motion.pointerX * 0.065,
      0.05 * wave + motion.pointerY * 0.045,
      6.1 - (0.46 * position) / 3 - 0.14 * wave * wave,
    );
    lens.lookAt(0.08 * Math.sin(position * 1.1), 0.026 * Math.sin(position * 2), 0);
    const planeHeight = 2 * Math.tan(THREE.MathUtils.degToRad(lens.fov / 2)) * 6.1 * 1.075;
    plate.current?.scale.set(planeHeight * aspect, planeHeight, 1);
    veil.current?.scale.set(planeHeight * aspect, planeHeight, 1);
    if (canopy.current && leaves.current) {
      const layerHeight = 2 * Math.tan(THREE.MathUtils.degToRad(lens.fov / 2)) * (6.1 - 1.72);
      const layerWidth = layerHeight * aspect;
      const width = Math.min(layerWidth * (aspect < 1 ? 0.54 : 0.4), layerHeight * 0.95);
      const height = (width * foliage.image.height) / foliage.image.width;
      canopy.current.scale.set(width, height, 1);
      canopy.current.position.set(
        layerWidth / 2 - width * 0.47 + 0.04 * Math.sin(position * 2.4),
        layerHeight / 2 - height * 0.47 + 0.018 * Math.sin(elapsed.current * 0.3),
        1.72,
      );
      leaves.current.opacity = 0.83 * (1 - THREE.MathUtils.smoothstep(position, 1.22, 1.79));
      canopy.current.visible = leaves.current.opacity > 0.005;
    }
    const crop = (key: 'A' | 'B', index: number) => {
      const texture = plates[index],
        chapter = chapters[index];
      const ratio = texture.image.width / texture.image.height;
      paint[`plate${key}`].value = texture;
      paint[`crop${key}`].value.set(Math.min(1, aspect / ratio), Math.min(1, ratio / aspect));
      paint[`anchor${key}`].value.set(chapter.frame[0], chapter.frame[1]);
      paint[`lantern${key}`].value.set(chapter.lantern[0], chapter.lantern[1]);
    };
    crop('A', a);
    crop('B', b);
    paint.aspect.value = aspect;
    paint.blend.value = THREE.MathUtils.smoothstep(local, 0.18, 0.8);
    paint.clockTime.value = mist.clockTime.value = particles.clockTime.value = elapsed.current;
    paint.pointer.value.set((motion.pointerX + 1) * 0.5, (motion.pointerY + 1) * 0.5);
    particles.cursor.value.set(
      motion.pointerX * planeHeight * aspect * 0.5,
      motion.pointerY * planeHeight * 0.5,
    );
    particles.pixelRatio.value = gl.getPixelRatio();
    if (!ready.current) {
      ready.current = true;
      onReady();
    }
  });
  return (
    <>
      <mesh ref={plate}>
        <planeGeometry />
        <shaderMaterial
          ref={plateShader}
          uniforms={uniforms}
          vertexShader={vertex}
          fragmentShader={fragment}
          toneMapped={false}
        />
      </mesh>
      <mesh ref={veil} position-z={1.15} renderOrder={1}>
        <planeGeometry />
        <shaderMaterial
          ref={fogShader}
          uniforms={haze}
          vertexShader={vertex}
          fragmentShader={fog}
          transparent
          depthWrite={false}
        />
      </mesh>
      <mesh ref={canopy} renderOrder={2}>
        <planeGeometry />
        <meshBasicMaterial
          ref={leaves}
          map={foliage}
          color="#a4bcb0"
          transparent
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <points frustumCulled={false} renderOrder={3}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          <bufferAttribute attach="attributes-seed" args={[seeds, 1]} />
        </bufferGeometry>
        <shaderMaterial
          ref={moteShader}
          uniforms={dust}
          vertexShader={moteVertex}
          fragmentShader={moteFragment}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </>
  );
}

export default function FieldScene(props: Props) {
  return (
    <Canvas
      flat
      frameloop="never"
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 6.1], fov: 42, near: 0.1, far: 30 }}
      gl={{ antialias: false, alpha: false, powerPreference: 'low-power' }}
    >
      <Suspense fallback={null}>
        <VillageSet {...props} />
      </Suspense>
    </Canvas>
  );
}
