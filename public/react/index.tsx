import { useState } from "react";

const index = () => {
    const [count, setCount] = useState(0);
    return (<div>
        <h1>Hello, World</h1>
        <div>Count is { count }</div>
        <button onClick={() => setCount(count + 1)}>Click me</button>
    </div>)
}

export default index;
