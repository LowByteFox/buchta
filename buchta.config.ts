import { css } from "./plugins/css";
// disabled just in case
import { react } from "./plugins/react";
import { svelte } from "./plugins/svelte";
import { BuchtaConfig } from "./src/buchta";

const vue = require("./plugins/vue/").default;

require("./buchta-vue.config.ts");

export default {
    rootDir: import.meta.dir,

    port: 3000,
    ssr: true,
    plugins: [svelte(), css(), vue(), react({ tsx: true })],
} as BuchtaConfig;
