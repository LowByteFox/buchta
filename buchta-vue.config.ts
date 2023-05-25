import { App } from "./plugins/vue";
import PrimeVue from 'primevue/config';
import ToastService from 'primevue/toastservice';

App.use(PrimeVue, { ripple: true });
App.use(ToastService);

App.clientUse("PrimeVue", "{ ripple: true }", "import PrimeVue from 'primevue/config';");
App.clientUse("ToastService", "undefined", "import ToastService from 'primevue/toastservice';");
