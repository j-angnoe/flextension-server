# Flextension server

NodeJS capabilities for authorized browser extensions.

The flextension server is a process that the user starts on 
their local machine. Some (authorized) browser extension may 
connect to the flextenion server and perform operations, like reading
and writing files and executing shell commands.

Some useful examples of browser extensions that require these super-powers:

- A Localhost Developer Compagnon:
Tired of being unable to connect to your project because you've forgotten to start it first. No more. Next time you visit a project on localhost you may be prompted to provide a directory and a start command. No more switching between browser and terminal. (Assuming you have the flextenion server running ;-))

- Bookmark to your pc instead of the cloud:
There are a lot of research and bookmarking cloud services, but, what
if you want to store these on your computer... 

Security concerns and measures:
- The browser restricts a lot of functionality, and rightfully so. 
Running a service that executes commands on behalf of extensions can 
potentially be dangerous. That's why:
    - We do not run this service on a hardcoded port. 
    - An extension that want to interact with flextension server must
      provide a (randomly generated) token. 

    This way, the user is forced to manually provide the extension with
    the needed port/token combination.

    Browser extensions that want to make use of the flextension server
    must implement a settings page to save the port/token combination.

- We might introduce whitelisting functionality for backend scripts
and executed commands. 


## Example:

1. Install the flextension server via npm:
```
npm install -g flextension-server;
```

2. Start the flextension server:
```
flextension
```

Please note the port and token that was generated.

Now create a firefox extension:

```json << extension/manifest.json >> 
{
    "name": "My Flextension",
    "version": "0.0.1",
    "manifest_version": 2,
    "permissions" : [
        "http://localhost/*"
    ],
    "version" : "2",
    "background" : {
        "scripts" : ["/build/background.js"]
    }
}
```

```js << extension/src/background.js >>

var port = '55032'; // enter port number here.
var token = '55efce79f2e8de590ca5292ad9270923a30209bced619692bc311822bdda9976c77a70624b1835e745477542d86798a8'; // enter token here

console.log("Background script running");

async function main() {
    var socket = require('flextension-server/client')({
        port,
        token
    });

    socket.registerBackend({
        rpc: {
            printEnvironment() {
               return this.process.env.HOME + ' ' + this.process.pid;
            }
        }
    })

    socket.on('ready', async () => {
        console.log("Doen het");
        var env = await socket.rpc('printEnvironment');

        console.log("Environment", env);

    })
}

main();
```

```json << extension/package.json >>
{
    "name" : "my-extension",
    "browserslist" : [
        "last 1 Chrome version"
    ]
}
```

Build it:
```sh << build >>
cd extension;  parcel build src/*.js -d build
```

Run it with Firefox' web-ext
```sh << run >>
cd extension; web-ext run
```

Open extension developer console (Ctrl+Shift+J) and 
Toggle `Show Content messages`, and reload the extension, you should see `Environment /home/xxx/` and a pid number.

You can run the example scripts provided here
using the [walkthrough compiler](https://github.com/j-angnoe/code-walkthrough-compiler)

```sh
# Install walkthrough compiler:
npm install -g walkthrough-compiler

# Extract the code from the README.md
wlkc README.md -o tmp -x build 

# Run it:
wlkc README>md -o tmp -x run
```



