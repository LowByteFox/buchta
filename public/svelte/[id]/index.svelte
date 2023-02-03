<script>
    const route = buchtaRoute();
    console.log(Object.fromEntries(route.query.entries()));
</script>

<h1>
    I am at /svelte/{route.params.get("id")}/
</h1>