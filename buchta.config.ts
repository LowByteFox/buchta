import { css } from "./plugins/css";
// disabled just in case
import { react } from "./plugins/react";
import { svelte } from "./plugins/svelte";
import { App } from "./plugins/vue";
import { vuePatch } from "./plugins/vue/patch";
import { BuchtaConfig } from "./src/buchta";
import PrimeVue from 'primevue/config';
import ToastService from 'primevue/toastservice'

vuePatch();

const vue = require("./plugins/vue/").default;

App.use(PrimeVue, { ripple: true });
App.use(ToastService);

App.clientUse("PrimeVue", "{ ripple: true }", "import PrimeVue from 'primevue/config';");
App.clientUse("ToastService", "undefined", "import ToastService from 'primevue/toastservice';");

export default {
    rootDir: import.meta.dir,

    port: 3000,
    ssr: true,
    plugins: [svelte(), css(), vue(), react({ tsx: true })],
} as BuchtaConfig;
