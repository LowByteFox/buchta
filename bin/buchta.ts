#!/usr/bin/env bun
process.argv = process.argv.slice(2);

if (process.argv.length == 0) {
    console.log('Usage: buchta [command]');
    console.log('Commands:');
    console.log('  init\t\tCreates basic project structure');
    console.log('  serve\t\tStarts a local server');
    process.exit(0);
}

const command = process.argv[0];

if (command == "--help" || command == "-h") {
    console.log('Usage: buchta [command]');
    console.log('Commands:');
    console.log('  init\t\tCreates basic project structure');
    console.log('  serve\t\tStarts a local server');
    process.exit(0);
}

if (command == "init") {
    require('./init');
    console.log('Created basic project structure\nstart server using \'bun run buchta serve\'');
}

if (command == "serve") {
    require('./serve');
}