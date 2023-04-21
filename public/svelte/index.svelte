<script lang="ts">
    import { onMount } from "svelte/internal";
    import Main from "./components/Main.svelte";

    onMount(async () => {
        // @ts-expect-error it is there but ts moment
        console.log(await eden.index.get())
    })
</script>

<div>
    <h1>Svelte + SSR</h1>
    <Main />
    <!-- svelte-ignore missing-declaration -->
    <h1>Buchta version: 0.6</h1>
</div>
