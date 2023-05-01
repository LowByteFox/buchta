import { css } from "./plugins/css";
// disabled just in case
import { react } from "./plugins/react";
import { svelte } from "./plugins/svelte";
import { vuePatch } from "./plugins/vue/patch";
import { BuchtaConfig } from "./src/buchta";

vuePatch();

const vue = require("./plugins/vue/").default;

export default {
    rootDir: import.meta.dir,

    port: 3000,
    ssr: true,
    plugins: [svelte(), css(), vue()],
} as BuchtaConfig;
