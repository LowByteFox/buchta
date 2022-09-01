import { createElement } from "react"; // bun add react
import { render } from "react-dom"; // bun add react-dom
import { HelloWorld } from "./HelloWorld.jsx"; // file extension is required, Buchta is still a little stupid

function App() {
    return (
        <div>
            <HelloWorld />
        </div>
    )
}

// render is only required when you are importing current file in html
render(<App />, document.body);