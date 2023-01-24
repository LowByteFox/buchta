export default {
  "base": {
    dirs: ["/public"],
    "/README.md": (name: string) => {
      return `
# ${name}

Setup project:
\`\`\`
bun install
\`\`\`

Run project:
\`\`\`
bunx buchta serve
\`\`\`

This project was created using \`bunx buchta create "${name}"\`. [Buchta](https://github.com/Fire-The-Fox/buchta) is a dynamic web framework for Bun
            `
    },
    "/tsconfig.json": (..._: any) => {
      return `
{
  "compilerOptions": {
    "lib": [
      "ESNext"
    ],
    "module": "esnext",
    "target": "esnext",
    "moduleResolution": "nodenext",
    "strict": true,
    "downlevelIteration": true,
    "skipLibCheck": true,
    "jsx": "preserve",
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true,
    "allowJs": true,
    "types": [
      "bun-types" // add Bun global
    ]
  }
}
            `
    }
  },
  "default": {
    dirs: ["/public/api"],
    "/package.json": (name: string) => {
      return `
{
  "name": "${name}",
  "type": "module",
  "devDependencies": {
    "bun-types": "latest",
    "buchta": "latest"
  }
}
            `
    },
    "/public/index.html": (..._: any) => {
      return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Buchta</title>
</head>
<body>
    <h1>Hello World!</h1>
</body>
</html>
`
    },
    "/public/api/get.server.ts": (..._: any) => {
      return `
import { Request, Response } from "buchta";

export default function (req: Request, res: Response) {
    res.send("Hello World!");
}
`
    },
    "/public/api/post.server.ts": (..._: any) => {
      return `
import { Request, Response } from "buchta";

export default function (req: Request, res: Response) {
    const query = {};
    for (const key of req.query.keys()) {
        query[key] = req.query.get(key);
    }
    res.sendJson(query);
}
`
    },
    "/buchta.config.ts": (..._: any) => {
      return `
export default {
    port: 3000,

    // @ts-ignore yes there is import.meta.dir
    rootDirectory: import.meta.dir,
    
    routes: {
        // if your route is /index.html the route will change to / and the file will be index.html
        fileName: "index"
    },

    plugins: []
}
            `
    }
  },
  "svelte": {
    "/package.json": (name: string) => {
      return `
{
  "name": "${name}",
  "type": "module",
  "devDependencies": {
    "bun-types": "latest",
    "buchta": "latest"
  },
  "dependencies": {
    "svelte": "latest"
  }
}
            `
    },
    "/public/index.svelte": (..._: any) => {
      return `
<h1>
    Hello, World
</h1>
`
    },
    "/buchta.config.ts": (..._: any) => {
      return `
import { svelte } from "buchta/plugins/svelte.js";

export default {
    port: 3000,

    // @ts-ignore yes there is import.meta.dir
    rootDirectory: import.meta.dir,
    
    routes: {
        // if your route is /index.html the route will change to / and the file will be index.html
        fileName: "index"
    },

    plugins: [svelte()]
}
            `
    }
  }
}