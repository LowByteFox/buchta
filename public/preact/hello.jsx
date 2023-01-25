import { useState } from "preact/hooks";

export const Hello = () => {
    const [count, setCount] = useState(0);

    return (
        <>
            <h1>Hello, World!</h1>
            <h2>Button was clicked { count } { count == 1 ? "time" : "times" }</h2>
            <button onClick={() => setCount(count + 1) }>Click me!</button>
        </>
    )
}