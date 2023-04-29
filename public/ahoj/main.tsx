import { useState } from "react";

export function Main() {
    const [count, setCount] = useState(0);

    return (
    <>
        <h1>Count is { count }</h1>
        <button onClick={() => setCount(count + 1)}>Click me</button>
    </>
    )
}
