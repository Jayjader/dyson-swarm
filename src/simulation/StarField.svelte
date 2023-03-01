<script lang="ts">
  import * as THREE from "three";
  import { Float32BufferAttribute, MathUtils } from "three";
  import { T } from "@threlte/core";
  const vertices = [];
  for (let i = 0; i < 30_000; ++i) {
    // 3 values (x,y,z) for 10k points => 30k iterations
    vertices.push(MathUtils.randFloatSpread(2_000_000));
    // vertices.push(THREE.MathUtils.randFloatSpread(2_000))
    // vertices.push(THREE.MathUtils.randFloatSpread(2_000))
  }
  const starPoints = new Float32BufferAttribute(vertices, 3);
  const starFieldGeometry = new THREE.BufferGeometry();
  starFieldGeometry.setAttribute("position", starPoints);
</script>

<T.Points geometry={starFieldGeometry}>
  <T.PointsMaterial color="#888888" />
</T.Points>
