async function runTests() {
    var glob = require('glob');
    var tests = glob.sync(__dirname + '/*.js').filter(n => {
        return n.match(/[0-9].+\.js$/);
    });

    var { spawn } = require('child_process');

    for (let t of tests) {
        console.log("Running test " + t);
    
        await new Promise(resolve => {

            var proc = spawn('node', [t], {
                stdio: 'inherit'
            });
            proc.on('exit', code => {
                if (code !== 0) {
                    process.exit(1);
                } else {
                    console.log("\n\nTest " + t + " success!");
                    resolve();
                }
            })
        });
    }
}


runTests();



