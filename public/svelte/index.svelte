<script>
	import { marked } from 'marked';
	let text = `Some words are *italic*, some are **bold**`;
</script>

<textarea bind:value={text}></textarea>

{@html marked(text)}

<style>

    * { 
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen-Sans, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif;
        color: #333;
    }

	textarea { 
        width: 100%; height: 200px;
        font-family: inherit;
        font-size: inherit;
        -webkit-padding: 0.4em 0;
        padding: 0.4em;
        margin: 0 0 0.5em 0;
        box-sizing: border-box;
        border: 1px solid #ccc;
        border-radius: 2px;
    }
</style>