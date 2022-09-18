import { createElement, render } from "preact"; // bun add react

function App() {
    return (
        <div>
            <h1>Hello, world</h1>
        </div>
    )
}

// render is only required when you are importing current file in html
render(<App />, document.body);