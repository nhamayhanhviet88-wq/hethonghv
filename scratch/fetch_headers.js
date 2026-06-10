const https = require('https');

https.get('https://hethonghv.top/m/kiemtrachatluong', (res) => {
    console.log(res.headers);
    process.exit();
}).on('error', (e) => {
    console.error(e);
    process.exit(1);
});
