# Buchta ( back on track )
## Dynamic Web Framework

<img src="./buchta.png" alt="Buchta Logo" width="256"/>

### Buchta is now back on track, this week will be lit!

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
# open browser and type localhost:4000/
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