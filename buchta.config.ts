import { css } from "./plugins/css";
// disabled just in case
import { react } from "./plugins/react";
import { svelte } from "./plugins/svelte";
import { BuchtaConfig } from "./src/buchta";

export default {
    rootDir: import.meta.dir,

    port: 3000,
    ssr: true,
    plugins: [svelte(), css()],
} as BuchtaConfig;
