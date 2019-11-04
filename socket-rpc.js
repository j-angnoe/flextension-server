/**
 * Socket rpc
 * 
 * allows RPC between a client and a server.
 * The RPC calls may be synchronous and asynchronous.
 * 
 * @usage
 * Client usage:
 * ```js
 * var io = require('socket.io-client');
 * var socket = io.connect('...');
 * var rpc = require('flextension-server/socket-rpc').getClient(socket);
 * 
 * var result = await rpc('my-function', arg1, arg2);
 * ```
 * 
 * Server usage:
 * ```js 
 * var io = require('socket.io');
 * io.on('connection', client => {
 *      var rpcServer = require('flextension-server/socket-rpc').getClient(client);
 *      rpcServer.register({
 *          'my-function'(arg1, arg2) {
 *               return new Promise(resolve => {
 *                   resolve(arg1+arg2);
 *               });
 * 
 *               // you may also return results synchronously
 * 
 *               // Please note that rpc return values must be 
 *               // JSON.stringify-able.
 *               return arg1+arg2;
 *           }
 *      });
 * });
 * ```
 * 
 */
function getClient(socket) {
    socket.rpcRequestCounter = socket.rpcRequestCounter || 0;

    var services = {};
    
    getClient.register = function(addServices) {
        Object.assign(services, addServices);
    }
    sendRpcRequest.register = getClient.register; 

    socket.on('rpc-request', async function dispatchRpc(payload) {
        if (!(payload.fn in services)) {
            var e = new Error('RPC Call `' + payload.fn + '` does not exist')
            console.error(e);
            console.log("Available services", Object.keys(services));
            throw e;
        }
        console.log("Dispatching request to " + payload.fn);
        
        var result = await services[payload.fn](...(payload.args||[]));
        socket.emit(payload.replyTo, result);
    });

    function sendRpcRequest(fn, ...args) {
        var rq = 'rpc-reply-' + (Date.now() + '-' + (++socket.rpcRequestCounter));

        return new Promise(resolve => {
            socket.once(rq, resolve);    
            socket.emit('rpc-request', {
                fn, args, replyTo: rq
            });
        })
    };

    return sendRpcRequest;
}

module.exports = getClient;

