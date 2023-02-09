<script>
    import { h, render } from "preact";
    import { onMount } from "svelte";
    import { count } from "./store.js";

    let countValue = 0;

    onMount(async () => {
        const { Comp } = await import("./Preact.jsx");
        render(h(Comp), document.getElementById("preact"));

        count.subscribe(value => {
    		countValue = value;
	    });
    })
</script>

<main>
    <h1>I am svelte!</h1>
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore missing-declaration -->
    <h2 on:click={() => count.update(n => n + 1)}>Value is { countValue } + I am incrementing</h2>
    <div id="preact"></div>
</main>