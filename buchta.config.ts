import { svelte } from "./plugins/svelte";
import { BuchtaConfig } from "./src/buchta";

export default {
    rootDir: import.meta.dir,

    port: 3000,
    ssr: false,
    plugins: [svelte()],
} as BuchtaConfig;
