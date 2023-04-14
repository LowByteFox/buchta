import { svelte } from "./plugins/svelte.js";

export default {
    port: 3000,

    root: import.meta.dir,

    plugins: [svelte("svelte")]
}
