const { exec } = require('child_process');

exec('netstat -aon', (err, stdout) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }
    const lines = stdout.split('\n');
    let pid = null;
    for (const line of lines) {
        if (line.includes(':11000') && line.includes('LISTENING')) {
            const parts = line.trim().split(/\s+/);
            pid = parts[parts.length - 1];
            break;
        }
    }
    if (pid) {
        console.log(`Killing process ${pid}...`);
        exec(`taskkill /F /PID ${pid}`, (kErr) => {
            if (kErr) console.error(kErr);
            startServer();
        });
    } else {
        console.log('No process listening on port 11000');
        startServer();
    }
});

function startServer() {
    console.log('Starting server...');
    const { spawn } = require('child_process');
    const out = require('fs').openSync('./server_log.txt', 'a');
    const err = require('fs').openSync('./server_log.txt', 'a');
    
    const child = spawn('node', ['server.js'], {
        detached: true,
        stdio: ['ignore', out, err],
        cwd: 'd:\\0 - Google Antigravity\\11 - NHAN VIEN KINH DOANH - Copy'
    });
    child.unref();
    console.log('Server started successfully in background.');
    process.exit(0);
}
