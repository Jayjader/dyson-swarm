<script lang="ts">
  import { Canvas, InteractiveObject, OrbitControls, T } from "@threlte/core";
  import { spring } from "svelte/motion";
  import { DoubleSide } from "three";
  import CameraSwitcher from "./CameraSwitcher.svelte";
  import StarField from "./StarField.svelte";

  const planetScale = spring(1);
  const GLOBAL_SCALE_FACTOR = 10 ** 6;
  // const STAR_RADIUS = (695_508 * 10 ** 3) / GLOBAL_SCALE_FACTOR; // m
  const STAR_RADIUS = 30;
  // const MERCURY_RADIUS = (2_439.7 * 10 ** 3) / GLOBAL_SCALE_FACTOR; // m
  const MERCURY_RADIUS = 1;
  // const MERCURY_ORBIT_RADIUS = (58 * 10 ** 6 * 10 ** 3) / GLOBAL_SCALE_FACTOR; // m
  const MERCURY_ORBIT_RADIUS = 55;
  let MERCURY_THETA = 0;
  // let lastTimeStamp = performance.now();

  const processMercuryOrbit = (timeStamp: DOMHighResTimeStamp) => (
    (MERCURY_THETA = (1 / (3600 * 2)) * Math.PI * timeStamp),
    requestAnimationFrame(processMercuryOrbit)
  );
  requestAnimationFrame(processMercuryOrbit);
  $: MERCURY_X = Math.cos(MERCURY_THETA) * MERCURY_ORBIT_RADIUS;
  // $: MERCURY_X = 0;
  $: MERCURY_Z = Math.sin(MERCURY_THETA) * MERCURY_ORBIT_RADIUS;
  $: MERCURY_ROTATION_Y = MERCURY_THETA * 3;
  let target = "star",
    starCamera,
    planetCamera;
  let starColor = "#eeeeee";
  // $: console.log({
  //   STAR_RADIUS,
  //   MERCURY_RADIUS,
  //   MERCURY_ORBIT_RADIUS,
  //   MERCURY_THETA,
  //   MERCURY_X,
  //   MERCURY_Z,
  //   target,
  //   starCamera,
  //   planetCamera,
  // });
</script>

<div>
  <Canvas>
    <CameraSwitcher
      currentCamera={target === "star" ? starCamera : planetCamera}
    />
    <T.PerspectiveCamera
      makeDefault
      bind:ref={starCamera}
      position={[0, 200, 405]}
      fov={24}
      far={1e27}
    >
      <!--      position={[MERCURY_X * 1.5, MERCURY_Y * 1.5, MERCURY_RADIUS * 1.5]}-->
      <OrbitControls enableZoom={true} />
    </T.PerspectiveCamera>

    <!--    <T.DirectionalLight castShadow position={[3, 10, 10]} />-->
    <!--    <T.DirectionalLight position={[-3, 10, -10]} intensity={0.2} />-->
    <!--    <T.AmbientLight intensity={0.8} />-->

    <T.Group>
      <T.Mesh position={[0, 0, 0]} let:ref>
        <InteractiveObject
          object={ref}
          interactive
          on:click={() => (target = "star")}
          on:pointerenter={() =>
            (starColor = target === "star" ? "#eeeeee" : "#cccccc")}
          on:pointerleave={() => (starColor = "#eeeeee")}
        />
        <T.SphereGeometry args={[STAR_RADIUS]} />
        <T.MeshStandardMaterial
          transparent
          opacity={0.1}
          color={starColor}
          side={DoubleSide}
        />
        <T.PointLight castShadows position={[0, 0, 0]} />
      </T.Mesh>
    </T.Group>
    <T.Group>
      <T.PerspectiveCamera
        position={[MERCURY_X * 1.1, MERCURY_RADIUS, MERCURY_Z * 1.1]}
        fov={24}
        bind:ref={planetCamera}
        far={1e27}
      >
        <OrbitControls
          enableZoom={true}
          target={{ x: MERCURY_X, z: MERCURY_Z }}
        />
      </T.PerspectiveCamera>
      <T.Mesh
        castShadow
        scale={$planetScale}
        position={[MERCURY_X, 0, MERCURY_Z]}
        rotation.y={MERCURY_ROTATION_Y}
        let:ref
      >
        <InteractiveObject
          object={ref}
          interactive
          on:click={() => ((target = "planet"), ($planetScale = 1))}
          on:pointerenter={() => ($planetScale = target === "star" ? 5 : 1)}
          on:pointerleave={() => ($planetScale = 1)}
        />
        <T.SphereGeometry args={[MERCURY_RADIUS]} />
        <T.MeshStandardMaterial color="#333333" />
      </T.Mesh>
    </T.Group>

    <StarField />
  </Canvas>
</div>

<style>
  div {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 0;
  }
</style>
