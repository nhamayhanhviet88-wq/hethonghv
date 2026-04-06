const jwt = require('jsonwebtoken');
const http = require('http');
const token = jwt.sign({id:1,username:'admin',role:'giam_doc'}, 'dongphuchv_secret_key_2024_change_this', {expiresIn:'2h'});

const opts = {
    hostname: 'localhost', port: 11000,
    path: '/api/telesale/data/38606',
    headers: { Cookie: 'token=' + token }
};

http.get(opts, r => {
    let d = '';
    r.on('data', c => d += c);
    r.on('end', () => {
        console.log('Status:', r.statusCode);
        console.log('Response:', d.slice(0, 500));
        process.exit(0);
    });
});
