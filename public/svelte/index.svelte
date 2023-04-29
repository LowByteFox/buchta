<script>
    import Main from "./components/Main.svelte";
    import "svelte-material-ui/themes/svelte-dark.css";
    import senko from "/senko.png";
</script>

<div>
    <h1>Svelte + SSR + Buchta testing</h1>
    <Main />
    <span></span>
    <img src={senko} alt="Senko-san"/>
</div>
