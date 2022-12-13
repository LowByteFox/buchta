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
