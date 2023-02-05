import { useEffect, useState } from "preact/hooks";
import { count } from "./store.js";

export function Comp() {
    const [countValue, setCount] = useState();

    useEffect(() => {
        count.subscribe(value => {
            setCount(value);
        });
    }, []);

    return (
        <div>
            <h1>I am Preact!</h1>
            <h2 onClick={() => count.update(n => n - 1)}>Value is { countValue } + I am decrementing</h2>
        </div>
    )
}