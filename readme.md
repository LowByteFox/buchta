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

### Changes
* Svelte

if you want customized html page for svetle base, create directory templates and add `svelte.html`
Content of `svelte.html` should look like this
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Buchta Svelte Template</title>
</head>
<body>
    
</body>
<!-- code -->
</html>
```
The `<!-- code -->` must be there!

* Plugins

Plugin directory was changed, now only "buchta/plugins/..."

* Config

Change `rootDirectory` value to just `import.meta.dir`, remove `+ "/public"`
it should look like this
`rootDirectory: import.meta.dir`

* Bugs?

Pretty sure some yes, but idk which