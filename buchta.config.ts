import { markdown } from "./plugins/markdown";
import { svelte } from "./plugins/svelte";
import { preact } from "./plugins/preact";
import { livereload } from "./plugins/livereload";

export default {
    port: 3000,
    // @ts-ignore yes there is import.meta.dir
    rootDirectory: import.meta.dir,

    plugins: [markdown(), svelte({ ssr: true }), preact({
        ssr: true,
        tsx: true,
    }), livereload()]
}