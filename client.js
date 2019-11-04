/**
 * This script is consumed by browser extensions that
 * want to interact with a flextension server running on 
 * the local machine.
 * 
 * @usage
 * 
 * ```js
 * var settings = { port: 12345, token: 'asdflasdjfawkfjs' };
 * 
 * var rpcServices = {
 *      ping() {
 *          // When this is called it runs inside the 
 *          // extension background script.
 *          return 'pong';
 *      }
 * };
 * 
 * var socket = require('flextension-server/client')({
 *      port: settings.port,
 *      token: settings.token
 * }, rpcServices);
 * 
 * socket.registerBackend({
 *      // server side dependencies that must be included.
 *      requires: ['leftpad'],
 *      async init() {
 *          // This runs inside the flextension nodejs process.
 *          console.log("This is run inside the flextension process")
 * 
 *          // It may call the background script via the
 *          // globally available rpc function. 
 * 
 *          await rpc('ping'); // === pong (from extension background script)
 * 
 *          // Access our dependencies by prepending this.
 *          this.leftpad(); 
 * 
 *          // you may also call sibling functions, like someFunction.
 *          this.someFunction()
 * 
 *          // you can call rpc functions like so:
 *          this.rpc.executeSomethingOnTheServer();
 *      },
 *      someFunction() {
 * 
 *      },
 * 
 *      rpc: {
 *          executeSomethingOnTheServer(arg1, arg2) {
 *              // This rpc function executes inside the flextension nodejs process
 *              // as well.
 *              console.log("Received arguments ", arg1, arg2)
 *              return arg1+arg2;
 * 
 *              // You can call someFunction
 *              this.someFunction()
 * 
 *              // And you can call rpc functions like so:
 *              this.rpc.anotherRpcFunction()
 *  
 *              // Please note that rpc return values must be JSON.stringify-able.
 *              return arg1+arg2;
 *          }
 * 
 *      }
 * });
 * 
 * var result = await socket.rpc('executeSomethingOnTheServer', arg1, arg2);
 * ```
 * 
 */
var io = require('socket.io-client');

module.exports = function({ port, token }, services) {
    var socket = io.connect(`http://localhost:${port}`);

    socket.rpc = n => {
        throw new Error('Backend not available');
    };

    var backendConnected = false;
    var backendCode = '';

    socket.on('connect', () => {
        console.log("Backend connection established");
        backendConnected = true;

        try { 
            var runtimeId = browser.runtime.id;
        } catch (err) {
            var runtimeId = '(unavailable)';
        }

        socket.emit('auth', {
            extensionId: runtimeId,
            token: token
        });

        socket.on('authenticated', () => {
            console.log("Authenticated");

            socket.rpc = require('./socket-rpc')(socket);
            socket.rpc.register(services);
            socket.rpc.register({ 
                serverSideInstall: () => {
                    console.log("Install backend code", backendCode);
                    return backendCode
                }
            });
        });
        
    });

    socket.on('disconnect', () => {
        backendConnected = false;
        socket.rpc = n => {
            throw new Error('Backend not available');
        };
    });

    var serializeExecutableObject = object => {
        return Object.entries(object).map(([key, value]) => {
            var valueString = '';
            if (typeof value === 'function') {
                var fn = `${value.toString()}`;
                
                if (!fn.match(/(async\s)*[a-z_]+\s*\(/i)) {
                    fn = `${key}: ${fn}`;
                }
                return fn;
            } else {
                return `${key}: ${JSON.stringify(value)}`;
            }
        }).join(",\n");
    }
    socket.registerBackend = object => {
        object.rpc = object.rpc || {};
        object.init = object.init || function() {};

        var { rpc, ...object } = object;
        var objectBody = serializeExecutableObject(object) + ",\nrpc:{\n" + serializeExecutableObject(rpc) + "\n}";

        backendCode = ['return {', objectBody, '}'].join("\n");
    };
    return socket;
}