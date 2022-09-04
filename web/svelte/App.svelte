<script>
	import { time } from './store.js';

	const formatter = new Intl.DateTimeFormat('en', {
		hour12: true,
		hour: 'numeric',
		minute: '2-digit',
		second: '2-digit'
	});

    $: {
        document.title = formatter.format($time);
    }
</script>

<h1>The time is {formatter.format($time)}</h1>