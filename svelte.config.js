import sveltePreprocess from "svelte-preprocess";

export default {
  preprocess: sveltePreprocess({
    defaults: {
      script: "typescript",
    },
  }),
};
