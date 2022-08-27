import sveltePreprocess from "svelte-preprocess";

export default {
  preprocess: sveltePreprocess({
    lang: {
      script: "typescript",
    },
    postcss: true,
  }),
};
