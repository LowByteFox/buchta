<script>
    import Main from "./components/Main.svelte";
    console.log(buchtaRoute());
</script>

<div>
    <h1>Svelte + SSR</h1>
    <Main />
    <!-- svelte-ignore missing-declaration -->
    <h1>Buchta version: {buchtaVersion}</h1>
</div>