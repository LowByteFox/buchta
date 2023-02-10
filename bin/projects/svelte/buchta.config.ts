import { svelte } from "buchta/plugins/svelte.js";

export default {
    port: 3000,

    // @ts-ignore yes there is import.meta.dir
    rootDirectory: import.meta.dir,

    plugins: [svelte(opts)]
}