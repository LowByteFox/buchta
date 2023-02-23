<script>
    let count = 0;
    const inc = () => {
        count++;
    }

    const dec = () => {
        count--;
    }

    console.log(buchtaRoute());
</script>

<h1>Count is { count }</h1>

<div>
    <button on:click={inc} class="btn" title="increment">+</button>
    <button on:click={dec} class="btn idk" title="decrement">-</button>
</div>