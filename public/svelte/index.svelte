<script lang="ts">
    import Main from "./components/Main.svelte";
    import Button from "@smui/button";
</script>

<svelte:head>
<link rel="stylesheet" href="/ui.css">
</svelte:head>

<div>
    <h1>Svelte + SSR</h1>
    <Main />
    <!-- svelte-ignore missing-declaration -->
    <h1>Buchta version: 0.6</h1>
<Button on:click={() => console.log("he")} variant="raised">
  <p>Raised</p>
</Button>
</div>
