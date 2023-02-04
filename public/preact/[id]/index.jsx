const route = buchtaRoute();

const index = () => 
    (
        <div>
            { route.params.get("id") }
        </div>
    )
