 <head>
  <link rel="stylesheet" href="docs.css">
  <meta name="viewport" content="width=device-width, initial-scale=1.0"> 
</head>

# Simple Buchta V4 docs

## Get started

```
bun run buchta init # create basic project structure
```

```
bun run buchta serve # start buchta server
```

### Project structure

```
|- buchta.config.ts # a configuration file
|
\- public # root file system of website
   |
   |- index.html # /
   \- api # /api/
      |  # routes under are still /api/ but with different request methods
      |
      |- get.server.ts # default function will execute on the server on GET request
      \- post.server.ts # default function will execute on the server on POST request
```

### Creating own server
```
import { Buchta } from "buchta";

const app = new Buchta();

app.get("/", (req, res) => {
    res.send("Hello, World");
})

// params
// port -> port which will be used
// func -> function that will be executed after the server has started
app.run();
```

### buchta.config.ts
This file is a configuration file for Buchta. You can use built-in plugins or just play around with the config

> Config breakdown

```
// importing typescript and markdown plugins
import { typescript } from "buchta/plugins/typescript";
import { markdown } from "buchta/plugins/markdown";

export default {
    // options
}
```
#### Options 

> port
> > type: Int <br>
> > port number on which will server run <br>
> > default: 3000
>
> rootDirectory
> > type: String <br>
> > Path where root directory of website is located <br>
> > default: import.meta.dir + "/public"
>
> routes
> > type: Object <br>
> > Settings specific to routes <br>
> > default: { fileName: "index" } <br>
> > fileName -> if your route is /index.html the route will change to /
>
> plugins
> > type: Array<br>
> > Plugins what will be used by Buchta <br>
> > default: [] <br>


### Server run function

Syntax <br>

`method`.server.`js`/`ts`

Buchta HTTP method support:
- get
- post
- put
- delete

Inside file
```
// Function that will be executed by the server on each request on specified HTTP method
export default function (req: BuchtaRequest, res: BuchtaResponse) {
    res.send(`I am ${req.query.get("name")}\n`);
}

// optional, this object will be sent to every function that was assigned by a plugin
export const data = {

}
```

### Writing a plugin

#### Plugin template 
```
// imports

// NAME is plugin name
export function NAME() {
    // stuff for your plugin you don't want to expose
    return function () {
        // `this` variable is Buchta object
    }
}
```
#### API
`this.assignExtHandler` -> function to add file extension handler
```
this.assignExtHandler("ext", async (route: string, file: string) => {
    // route -> specific route
    // file -> path to the file
    // handle file here and setup route for it
});
```

`this.assignAfterRouting` -> function to add and which will be executed while route is being registered
```
this.assignAfterRouting((options: any) => {
    // options -> object passed from server run function `data`
    // code
})
```

#### Adding plugin to buchta
`buchta.config.ts`
```
// xyz is name of file containing your plugin function
import NAME from "./xyz";
...
plugins: [..., NAME()]
...
```

#### Adding plugins using code
```
// xyz is name of file containing your plugin function
import NAME from "./xyz";

...
buchta.mixInto(NAME())
...
```

#### Built in plugins
- buchta/plugins/swagger
- buchta/plugins/typescript
- buchta/plugins/markdown

function names are the same as files (swagger, typescript, ...)