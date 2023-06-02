import { css } from "./plugins/css";
import customBundle from "./plugins/customBundle";
import { vue } from "./plugins/vue";
// disabled just in case
import { react } from "./plugins/react";
import { svelte } from "./plugins/svelte";
import { BuchtaConfig } from "./src/buchta";

require("./buchta-vue.config.ts");

export default {
    rootDir: import.meta.dir,

    port: 3000,
    ssr: true,
    plugins: [customBundle(), svelte(), css(), vue(), react({ tsx: true })],
} as BuchtaConfig;
