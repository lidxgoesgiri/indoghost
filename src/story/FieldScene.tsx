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

// One pass paints every location. Each plate carries its own weather and its
// own unease (warp + mood), and each of the three cuts opens differently:
// the lantern aperture, the dark rising off the tiles, the parting door.
// Both plates stay in the same camera space, so scrolling backwards rewinds.
const fragment = `
  uniform sampler2D plateA, plateB;
  uniform vec2 cropA, cropB, anchorA, anchorB, lanternA, lanternB, pointer;
  uniform float blend, clockTime, aspect, sceneA, sceneB, cut, vanish;
  varying vec2 vUv;
  float hash(vec2 v) { return fract(sin(dot(v, vec2(127.1,311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p); f=f*f*(3.-2.*f);
    return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),
               mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);
  }
  float fbm(vec2 p) { return noise(p)*.57+noise(p*2.03+7.1)*.29+noise(p*4.1+3.7)*.14; }
  float blob(vec2 d) { return exp(-dot(d,d)); }
  float speck(vec2 p) {
    vec3 v=fract(vec3(p.xyx)*.1031); v+=dot(v,v.yzx+33.33);
    return fract((v.x+v.y)*v.z);
  }

  // Small image-space drift: things that should never hold perfectly still.
  vec2 warp(float s, vec2 uv, float t) {
    if (s < .5) {
      float hang=smoothstep(.5,.95,uv.y);
      return vec2(.0028*sin(t*.7+uv.y*13.+uv.x*5.)+.0013*sin(t*1.3+uv.x*31.),0.)*hang;
    }
    if (s < 1.5) {
      float body=blob((uv-vec2(.704,.46))*vec2(22.,8.));
      float twitch=smoothstep(.9,1.,sin(t*.83))*sin(t*37.);
      float heat=blob((uv-vec2(.823,.78))*vec2(14.,7.));
      return vec2(.005*twitch*body+.0018*sin(t*5.+uv.y*60.)*heat,0.);
    }
    if (s < 2.5) {
      float flame=blob((uv-vec2(.866,.6))*vec2(26.,9.));
      return vec2(.003*sin(t*6.3+uv.y*40.),.002*sin(t*4.1))*flame;
    }
    float figure=blob((uv-vec2(.724,.49))*vec2(20.,5.2));
    float curtain=blob((uv-vec2(.452,.57))*vec2(22.,6.));
    return vec2(.0045*sin(t*.8+uv.y*8.)*figure+.004*sin(t*.55+uv.y*11.)*curtain,.0025*sin(t*.47)*figure);
  }

  vec3 plate(sampler2D image, float s, vec2 uv, float t) {
    vec2 p=uv+warp(s,uv,t);
    vec3 c=texture2D(image,p).rgb;
    if (s > 2.5 && vanish > .004) {
      // She is only there while nobody looks straight at her.
      float figure=min(1.,1.9*blob((uv-vec2(.724,.49))*vec2(17.,4.4)));
      vec3 mist=texture2D(image,p+vec2(.058,.01),4.6).rgb;
      mist=mix(mist,vec3(.27,.28,.37)*(.55+dot(mist,vec3(.6))),.3);
      c=mix(c,mist,figure*vanish);
    }
    return c;
  }

  float rain(vec2 uv, float t, float scale, float speed) {
    vec2 g=vec2((uv.x+uv.y*.09)*aspect*scale,uv.y*5.2+t*speed);
    float column=floor(g.x), offset=hash(vec2(column,7.));
    float y=g.y*(.8+.4*offset)+offset*31.;
    float drop=step(.84,hash(vec2(column,floor(y))));
    float fy=fract(y), fx=abs(fract(g.x)-.25-.5*offset)*2.;
    return drop*smoothstep(.3,0.,fx)*smoothstep(0.,.5,fy)*smoothstep(1.,.8,fy);
  }

  // Light, weather and dread for one location. 'lamp' is the painted lantern,
  // 'torch' the one the visitor carries with the pointer.
  vec3 mood(float s, vec2 uv, vec3 c, float t, float lamp, float torch) {
    float lum=dot(c,vec3(.3,.59,.11));
    if (s < .5) {
      // Gate: rain on the banyan, and a lantern that almost goes out.
      float gutter=smoothstep(.955,1.,sin(t*.46));
      float flame=(.9+.07*sin(t*1.9)+.03*sin(t*3.1))*(1.-.86*gutter);
      c*=1.-.24*gutter;
      c+=vec3(.25,.115,.03)*lamp*flame;
      float pool=blob((uv-vec2(.66,.12))*vec2(4.2,7.));
      c+=vec3(.36,.15,.035)*pool*lum*flame*(.55+.45*noise(vec2(uv.x*46.,t*1.7)));
      float moon=blob((uv-vec2(.317,.866))*vec2(4.6,2.2));
      c+=vec3(.045,.085,.095)*moon*(.45+.55*sin(t*.23))*(1.+.8*gutter);
      float wet=rain(vUv,t,93.,5.6)*.05+rain(vUv+.31,t,51.,4.3)*.04;
      c+=vec3(.52,.66,.68)*wet*(.4+lum);
      c+=vec3(.036,.025,.011)*torch;
    } else if (s < 1.5) {
      // Coin alley: red mist with a pulse of its own.
      float beat=pow(.5+.5*sin(t*5.2),10.)+.55*pow(.5+.5*sin(t*5.2-.9),10.);
      float mist=fbm(vec2(uv.x*5.-t*.05,uv.y*3.+t*.022));
      float band=smoothstep(.04,.38,uv.y)*smoothstep(.9,.42,uv.y)*smoothstep(.3,.72,uv.x);
      c+=vec3(.36,.036,.02)*mist*band*(.5+.34*beat);
      c*=vec3(1.+.05*beat,1.-.035*beat,1.-.035*beat);
      float flick=.76+.18*noise(vec2(t*5.3,3.))+.06*sin(t*13.);
      c+=vec3(.32,.06,.025)*lamp*flick;
      c+=vec3(.04,.016,.008)*torch;
    } else if (s < 2.5) {
      // Veranda: the floor only reads where the hand lantern falls.
      float flame=.9+.07*sin(t*2.3)+.05*noise(vec2(t*4.,9.));
      c*=.37+1.2*torch*flame;
      c+=vec3(.36,.18,.05)*torch*flame*lum*1.3;
      c+=vec3(.2,.1,.03)*lamp*flame;
    } else {
      // Pavilion: cold moon, a pale presence that breathes.
      float aura=blob((uv-vec2(.724,.5))*vec2(11.,3.4))*(1.-vanish);
      float breath=.5+.5*sin(t*.62);
      c=mix(c,vec3(lum)*vec3(.86,.92,1.08),.2+.14*vanish);
      c*=1.-.16*vanish;
      c+=vec3(.075,.09,.135)*aura*(.3+.7*breath);
      c+=vec3(.05,.05,.09)*lamp*(.8+.2*sin(t*.9));
      c+=vec3(.02,.022,.03)*torch;
    }
    return c;
  }

  void main() {
    float t=clockTime;
    float wave=sin(blend*3.14159);
    float ragged=noise(vUv*7.)*.09+noise(vUv*21.)*.026;
    float iris;
    vec3 seam=vec3(0.);
    vec2 origin=vUv;
    float jamb=1.;
    if (cut < .5) {
      // The lantern opens a ragged aperture onto the alley.
      float field=length((vUv-vec2(.69,.46))*vec2(min(aspect,1.85),.85))+ragged;
      float front=mix(-.23,2.18,blend);
      iris=1.-smoothstep(front-.085,front+.085,field);
      seam=vec3(.17,.05,.014)*(1.-smoothstep(0.,.11,abs(field-front)))*wave;
    } else if (cut < 1.5) {
      // The mist sinks and the dark climbs off the tiles.
      float field=vUv.y*.78+fbm(vUv*vec2(3.*aspect,3.2)+vec2(0.,t*.03))*.56;
      float front=mix(-.1,1.44,blend);
      iris=1.-smoothstep(front-.075,front+.075,field);
      seam=vec3(.045,.1,.08)*(1.-smoothstep(0.,.13,abs(field-front)))*wave;
    } else {
      // Two door leaves slide apart on the pavilion.
      float hinge=.69;
      float gap=blend*1.08*hinge-.012;
      float side=abs(vUv.x-hinge);
      iris=1.-smoothstep(gap-.003,gap+.003,side);
      origin.x-=sign(vUv.x-hinge)*max(gap,0.);
      float leaf=max(side-gap,0.), sill=max(gap-side,0.);
      seam=vec3(.2,.22,.3)*exp(-leaf*42.)*(1.-iris)*wave;
      jamb=mix(1.,smoothstep(0.,.11,sill),.62*wave);
    }
    // The outgoing plate leans in as it leaves; the incoming one settles back.
    vec2 uvA=(origin-anchorA)*cropA*(1.-.045*blend)+anchorA;
    vec2 uvB=(vUv-anchorB)*cropB*(.95+.05*blend)+anchorB;
    vec2 aim=pointer+vec2(.035*sin(t*.31),.028*sin(t*.47));
    float torch=exp(-length((vUv-aim)*vec2(min(aspect,1.8),1.))*4.6);
    vec3 scene=vec3(0.);
    if (iris < .999) {
      float lamp=exp(-length((uvA-lanternA)*vec2(1.8,1.))*15.);
      scene+=mood(sceneA,uvA,plate(plateA,sceneA,uvA,t),t,lamp,torch)*(1.-iris);
    }
    if (iris > .001) {
      float lamp=exp(-length((uvB-lanternB)*vec2(1.8,1.))*15.);
      scene+=mood(sceneB,uvB,plate(plateB,sceneB,uvB,t),t,lamp,torch)*iris*jamb;
    }
    scene+=seam;
    // Lens: the frame closes in during a cut, then film grain.
    vec2 q=(vUv-.5)*vec2(1.05,1.25);
    scene*=mix(.6,1.,smoothstep(.92,.26,length(q)))-.1*wave;
    scene+=(speck(gl_FragCoord.xy+mod(floor(t*14.),64.)*vec2(37.,17.))-.5)*.03;
    gl_FragColor=vec4(max(scene,0.),1.);
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
  uniform vec3 rim, core;
  varying float pulse;
  void main() {
    float r=length(gl_PointCoord-.5)*2.;
    if(r>=1.) discard;
    gl_FragColor=vec4(mix(rim,core,1.-r),pulse*(1.-r*r));
    #include <colorspace_fragment>
  }
`;

// Where the kuntilanak stands on her plate, and what drifts in each location's air.
const ghost = { plate: 3, x: 0.724, y: 0.49 };
const palette = [
  ['#bf591c', '#ffdb91'],
  ['#b3200f', '#ff8a5c'],
  ['#8f6a2c', '#f2deb0'],
  ['#5b6e96', '#dfe9ff'],
].map(([rim, core]) => [new THREE.Color(rim), new THREE.Color(core)] as const);

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
      sceneA: { value: 0 },
      sceneB: { value: 1 },
      cut: { value: 0 },
      vanish: { value: 0 },
    }),
    [plates],
  );
  const haze = useMemo(() => ({ clockTime: { value: 0 } }), []);
  const dust = useMemo(
    () => ({
      clockTime: { value: 0 },
      pixelRatio: { value: 1 },
      cursor: { value: new THREE.Vector2() },
      rim: { value: new THREE.Color() },
      core: { value: new THREE.Color() },
    }),
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
  const painted = useRef(0);
  const absence = useRef(0);
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
    paint.sceneA.value = paint.cut.value = a;
    paint.sceneB.value = b;
    // The figure in the pavilion thins out when the pointer lantern finds her,
    // and now and then on her own. She returns more slowly than she leaves.
    const dt = Math.min(0.1, Math.max(0, elapsed.current - painted.current));
    painted.current = elapsed.current;
    let gone = THREE.MathUtils.smoothstep(Math.sin(elapsed.current * 0.37), 0.93, 1);
    if (position > 2.4) {
      const shown = plates[ghost.plate];
      const span = Math.min(1, aspect / (shown.image.width / shown.image.height));
      const anchor = chapters[ghost.plate].frame[0];
      const x = (ghost.x - anchor) / span + anchor - (motion.pointerX + 1) * 0.5;
      const y = ghost.y - (motion.pointerY + 1) * 0.5;
      gone = Math.max(gone, 1 - THREE.MathUtils.smoothstep(Math.hypot(x * Math.min(aspect, 1.8), y), 0.1, 0.24));
    }
    absence.current += (gone - absence.current) * (1 - Math.exp(-dt * (gone > absence.current ? 2.6 : 0.7)));
    paint.vanish.value = absence.current;
    const air = Math.min(palette.length - 2, Math.floor(position));
    particles.rim.value.lerpColors(palette[air][0], palette[air + 1][0], position - air);
    particles.core.value.lerpColors(palette[air][1], palette[air + 1][1], position - air);
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
