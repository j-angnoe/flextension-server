var settings = {
    port: 55001,
    token: 'TESTTOKENTESTTOKEN'
};

function deferred(timeout) {
    if (timeout !== false) {
        timeout = timeout || 3000;
    }
    var _resolve, _reject;
    var promise = new Promise((resolve, reject) => {
        _resolve = resolve;
        _reject = reject;
    })
    promise.resolve = _resolve;
    promise._reject = _reject;

    if (timeout !== -1) {
        setTimeout(_reject, timeout);
    }

    return promise;
}
function assertEquals(value, expected) {
    value = JSON.stringify(value);
    expected = JSON.stringify(expected);

    if (value !== expected) {
        throw new Error(`Assertion failed: ${value} !== ${expected}`);
    }
}
async function runTest() {
    var flextensionServer = require('../server');

    var server = flextensionServer(settings);    

    var clientConnected = deferred();
    var initWasCalled = deferred();
    var pingWasCalled = deferred();
    var clientBackendRpcCalled = deferred();
    var clientReadyCalled = deferred();

    server.on('connection', () => {
        clientConnected.resolve();
    })

    var clientServices = {
        ping() {
            pingWasCalled.resolve();

            // test a simple result value
            return 'client pong';
        },
        testArgs(simpleArg, complexArg) {
            assertEquals(simpleArg, 'simple value');
            assertEquals(complexArg, {complex:'value'});
        }
    };

    var client = require('../client')(settings, clientServices);

    client.registerBackend({
        async init() {
            var result = await rpc('ping');
            // Test args
            rpc('testArgs', 'simple value', {complex:'value'});
        },

        rpc: {
            serverCall() {
                // test complex result value
                return 'server rpc result';
            },

            serverArgumentsTest(arg1, arg2) {
                return {
                    arg1, 
                    arg2
                }
            }
        }
    });

    client.on('ready', async () => {
        initWasCalled.resolve();
        clientReadyCalled.resolve();

        var result = await client.rpc('serverCall');
        assertEquals(result, 'server rpc result');
        clientBackendRpcCalled.resolve();

        var result2 = await client.rpc('serverArgumentsTest', 'arg1 value','arg2 value');
        assertEquals(result2, {arg1: 'arg1 value', arg2: 'arg2 value'});
        
    })

    var promises = {
        clientConnected,
        pingWasCalled,
        initWasCalled,
        clientBackendRpcCalled,
        clientReadyCalled,
    }
    Object.keys(promises).map(key => {
        promises[key].catch(err => {
            console.error('Promise ' + key + ' failed: ', err);
        }).then(n => {
            console.log("Promise " + key + " resolved!");
        })
    });

    await Promise.all(Object.values(promises)).catch(err => {
        console.error("Test failed.");
        process.exit(1);
    });

    process.exit(0);
}

runTest();
