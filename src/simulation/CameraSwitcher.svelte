<script lang="ts">
  import { useThrelte, useThrelteRoot } from "@threlte/core";
  import type { Camera } from "three";

  const { setCamera } = useThrelteRoot();
  export let currentCamera: Camera;
  $: setCamera(currentCamera);
</script>
