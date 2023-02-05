# Buchta
## Full Stack Framework Powered By Bun

<img src="./buchta.png" alt="Buchta Logo" width="256"/>

## Get Started

```
bun run buchta init # create project template
bun run buchta serve # start built-in server
```

## Working with testing server
to have better docs readability
```
git clone https://github.com/Fire-The-Fox/buchta.git
cd buchta
bun install
bun add marked svelte
bun run src/example.ts
# open browser and type localhost:3000/
```

### Changelog
* Preact with SSR

Buchta now has `Preact` plugin with SSR support!

SSR Support is still experimental.

* 2-Way middleware

you can apply middlware in 2 ways<br>
1. add it to *.server.ts<br>
2. create middleware.ts file<br>

function names - `before` and `after`

* BuchtaSubrouter

Simplify adding routes using subrouter

* Code Refactor

Source code should be easier to read even without comments

* Directories

`static`, directory that holds all static content, such as images, videos, etc <br>
`middleware`, directory that holds all middleware for routes

* Live reload is here!

Just update one of files in `public` directory and your page should be reloaded automatically

* Svelte plugins gets SSR

SSR Support is still experimental.

* Buchta CLI now gets `build`

Are you done with your app? Export it and use it in for example in gh pages! <br>
Be aware that this is experimental feature and not everything may work and be exported!

* Meet `Buchticka` a stripped down version of `Buchta`, used in exported apps

* `src` directory cleanup

* Svelte pages now get `buchtaRoute` function

Function returns object containing `params` and `query`

* Minifier using `Uglify.js`

* Svelte and Preact `await import` and `require` fixed

* Say hello to `svect` => `Svelte` + `Preact`

* Added few extra utils

* Added error page

* Comminuty update, preparing for larger community and completing community standards