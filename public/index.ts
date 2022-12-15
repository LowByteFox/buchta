const exampleSocket = new WebSocket("ws://localhost:3000/");

exampleSocket.onopen = (e) => {
    exampleSocket.send("Hello, world");
}