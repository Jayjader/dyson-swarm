<script lang="ts">
  import type { BuildOrder } from "../../types";
  import { ICON } from "../../icons";

  export let buildOrder: undefined | BuildOrder;
</script>

<figure class="flex flex-row flex-wrap items-center justify-between gap-1">
  <img
    src={buildOrder === undefined ? "./empty.png" : ICON[buildOrder.building]}
    alt={buildOrder?.building ?? "Empty slot"}
    title={buildOrder?.building ?? "None"}
    class="mr-auto rounded border-2 border-slate-900"
  />
  <figcaption class="ml-auto p-1">{buildOrder?.building ?? "None"}</figcaption>
</figure>
