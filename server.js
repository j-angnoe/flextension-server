/**
 * Flextension server
 * 
 * Starts listening for websocket connections on localhost
 * These connections will be initiated by browser extensions
 * that implement a flextension client.
 * 
 * The user may start a flextension server by installing flextension:
 * 
 * `npm install -g flextension-server`
 * 
 * After this, the user starts the flextension server by running
 * 
 * `flextension` 
 * 
 * Security measures:
 * On first start flextension will generate a random port number and
 * a security token. 
 * 
 * These values will be stored in $HOME/.flextensionrc
 * 
 * A browser extension that wants to interact with a flextension-server
 * running on the local host must ask the user for the port and the 
 * token. 
 * 
 * Please note that a browser extension may be able extend functionality
 * on the flextension server, via the serverSideInstall mechanism. 
 * 
 * It's important that one only grants permissions to trusted extensions.
 * 
 */
var socketIo = require('socket.io');
var io;

var rpcServices = {
    /* example:  
    ping() {
        return 'pong';
    }
    */
}

module.exports = function(settings) {
    var { port } = settings;

    io = socketIo.listen(port);
    io.on('error', err => {
        console.error('socket-io error', err);
    });

    console.log("Flextension server listening on port " + port);
    console.log("Flextension auth token:\n" + settings.token + "\n");

    io.on('connection', client => {

        console.log('client connected');

        client.on('auth', auth => {
            console.log('auth', auth);

            var id = auth.extensionId;
            console.log(`Extension ${id} attempts to connect`);

            if (auth.token === settings.token) {
                console.log(`Extension ${id} supplied a valid token. Access granted.`);
                onAuthenticated(client);
            } else {
                console.log(`Extension ${id} did not supply a valid token. Access denied.`)
            }
        });

        async function onAuthenticated(client) {
            
            var rpc = require('./socket-rpc')(client);
            rpc.register(rpcServices);
    
            client.emit('authenticated');  
            
            console.log("Fetching server side install");

            rpc('serverSideInstall').then(result => {


                console.log("Installing a script ", result);
                var fn = new Function('process','require','rpc', result)
                
                client.backendService = fn.apply(client, [process, require, rpc]) || {};
                client.backendService.process = process;
                client.backendService.require = require;

                (client.backendService.requires || []).map(requirement => {
                    client.backendService[requirement] = require(requirement);
                });

                client.backendService.init && client.backendService.init();
                Object.keys(client.backendService.rpc || {}).map(key => {
                    client.backendService.rpc[key] = client.backendService.rpc[key].bind(client.backendService);
                });
                rpc.register(client.backendService.rpc || {});
          
                client.emit('ready');   
            }).catch(err => {
                console.error(err);
            });


        }
    });

    return io;
}
