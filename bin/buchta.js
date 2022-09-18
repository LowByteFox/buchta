#!/usr/bin/env node
"use strict";
const ARGS = process.argv.slice(2, process.argv.length);
let freeze = false;

const PKGDB = {
  react: {
    "react": "https://cdn.skypack.dev/react",
    "react-dom": "https://cdn.skypack.dev/react-dom"
  },
  svelte: {
    "svelte": "https://cdn.skypack.dev/svelte@latest/",
    "svelte/action": "https://cdn.skypack.dev/svelte@latest/action/",
    "svelte/animate": "https://cdn.skypack.dev/svelte@latest/animate/",
    "svelte/easing": "https://cdn.skypack.dev/svelte@latest/easing/",
    "svelte/internal": "https://cdn.skypack.dev/svelte@latest/internal/",
    "svelte/motion": "https://cdn.skypack.dev/svelte@latest/motion/",
    "svelte/store": "https://cdn.skypack.dev/svelte@latest/store/",
    "svelte/transition": "https://cdn.skypack.dev/svelte@latest/transition/"
  }
}

const { spawnSync, execSync } = require('child_process');
const { writeFileSync, mkdirSync, mkdir, copyFileSync } = require('fs');
const { exit } = require('process');
const prompts = require('prompts');

const init = () => {
  freeze = true;
  (async () => {
    const response = await prompts({
      type: 'text',
      name: 'webRoot',
      message: 'Type name of folder where your website will be stored',
      initial: "public"
    });

    (async (webRoot) => {
      if (webRoot == undefined) {
        exit(1);
      }
      const response = await prompts({
        type: 'multiselect',
        name: 'type',
        message: 'Select type of javascript framework do you want to use',
        choices: [
          { title: 'Vanilla', description: "Nothing special, just HTML, CSS and JS", value: 'vanilla' },
          { title: 'Svelte', description: "Web application powered by Svelte framework", value: 'svelte' },
          { title: 'React', description: "Web application powered by React framework", value: 'react' },
          { title: 'Vue', description: "Web application powered by Vue framework", value: 'vue'}
        ]
      });

      (async (root, webframeworks) => {
        const response = await prompts({
          type: 'toggle',
          name: 'markdown',
          message: 'Do you want to also install markdown support?',
          initial: false,
          active: 'no',
          inactive: 'yes'
        });
        const here = process.cwd();

        let config = `
{
  "webRootPath"   : "${here}/${root}",
  "cacheRootPath" : "${here}/.cache",
  "imports": {
`

        for (const element of webframeworks) {
          if(PKGDB[element] != undefined) {
            for (const ele of Object.entries(PKGDB[element])) {
              config += `    "${ele[0]}": "${ele[1]}",
`
            }
          }
        }

        if (webframeworks.length == 0) {
          config += `    "".`
        }
        config = config.slice(0, config.length-2);
        config += `
  }
}`
        writeFileSync("./buchta.config.json", config, {encoding: "utf-8"});
        try {
          mkdirSync(`${here}/${root}`);
        } catch {}
        if (webframeworks.length > 1) {
          for (const element of webframeworks) {
            switch (element) {
              case "vanilla": 
                try {
                mkdirSync(`${here}/${root}/vanilla`);
                } catch {}
                writeFileSync(`${here}/${root}/vanilla/App.html`, `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
</head>
<body>
    <h1>Hello, Buchta</h1>    
</body>
</html>
`);
                break;
              case "svelte": 
                try{
                mkdirSync(`${here}/${root}/svelte`);
                } catch {}
                writeFileSync(`${here}/${root}/svelte/App.svelte`, `
<h1>Hello, Buchta</h1>
`);
                spawnSync("bun", ["install", "svelte"], {
                  stdio: "inherit"
                });
                break;
              case "vue": 
                try {
                mkdirSync(`${here}/${root}/vue`);
                } catch {}
                writeFileSync(`${here}/${root}/vue/App.vue`, `
<template>
  <h1>Hello, Buchta</h1>
</template>
`);
                spawnSync("bun", ["install", "vue"], {
                  stdio: "inherit"
                });
                break;
              case "react": 
                try {
                mkdirSync(`${here}/${root}/react/`);
                } catch {}
                writeFileSync(`${here}/${root}/react/App.jsx`, `
import { createElement } from "react";
import { render } from "react-dom";

function App() {
    return (
        <div>
            <h1>Hello, Buchta</h1>
        </div>
    )
}

// render is only required when you are importing current file in html
render(<App />, document.body);
`);
                spawnSync("bun", ["install", "react", "react-dom"], {
                  stdio: "inherit"
                });
                break;
              }
            }
          } else if (webframeworks.length == 1) {
            switch (webframeworks[0]) {
              case "vanilla": 
                try {
                mkdirSync(`${here}/${root}/vanilla`);
                } catch {}
                writeFileSync(`${here}/${root}/vanilla/App.html`, `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
</head>
<body>
    <h1>Hello, Buchta</h1>    
</body>
</html>
`);
                break;
              case "svelte": 
                try{
                mkdirSync(`${here}/${root}/svelte`);
                } catch {}
                writeFileSync(`${here}/${root}/svelte/App.svelte`, `
<h1>Hello, Buchta</h1>
`);
                spawnSync("bun", ["install", "svelte"], {
                  stdio: "inherit"
                });
                break;
              case "vue": 
                try {
                mkdirSync(`${here}/${root}/vue`);
                } catch {}
                writeFileSync(`${here}/${root}/vue/App.vue`, `
<template>
  <h1>Hello, Buchta</h1>
</template>
`);
                spawnSync("bun", ["install", "vue"], {
                  stdio: "inherit"
                });
                break;
              case "react": 
                try {
                mkdirSync(`${here}/${root}/react/`);
                } catch {}
                writeFileSync(`${here}/${root}/react/App.jsx`, `
import { createElement } from "react";
import { render } from "react-dom";

function App() {
    return (
        <div>
            <h1>Hello, Buchta</h1>
        </div>
    )
}

// render is only required when you are importing current file in html
render(<App />, document.body);
`);
                spawnSync("bun", ["install", "react", "react-dom"], {
                  stdio: "inherit"
                });
                break;
              }
          }
          if (!response.markdown) {
            spawnSync("bun", ["install", "marked", "@types/marked"], {
              stdio: "inherit"
            });
          }
          let path = __filename.split("/");
          path.pop();
          path = path.join("/");
          copyFileSync(`${path}/../src/favicon.ico`, `${here}/${root}/favicon.ico`);
          freeze = false;
      })(webRoot, response.type);
    })(response.webRoot);
  })();
}

const serve = () => {

  let path = __filename.split("/");
  path.pop();
  path = path.join("/");
  
  spawnSync("bun", ["run", `${path}/../src/minimal.ts`, ">", "/dev/stdout"], {
    stdio: "inherit"
  });
}

const writeHelp = () => {
  console.log(
    `
    buchta 0.3.0

    init - creates basic project file structure
    serve - starts buchta server
    `);
}

if (ARGS.length == 0) {
  writeHelp();
}

if (ARGS.includes("init")) {
  init();
} else {
  if (ARGS.includes("serve")) {
    serve();
  }
}