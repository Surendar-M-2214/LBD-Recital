const http = require('http');
const https = require('https');
const url = require('url');

const PORT = 3001;

http.createServer((req, res) => {
    // Add CORS headers so the browser allows this proxy
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    const reqUrl = url.parse(req.url, true);
    let targetUrl = reqUrl.query.url;
    if (!targetUrl) {
        res.writeHead(400);
        res.end('Missing url parameter');
        return;
    }

    const options = url.parse(targetUrl);
    options.method = req.method;
    
    // Copy headers but strip Origin and Referer which trigger Zoho's block
    const headers = Object.assign({}, req.headers);
    delete headers['host'];
    delete headers['origin'];
    delete headers['referer'];
    
    options.headers = headers;

    let bodyData = [];
    req.on('data', chunk => bodyData.push(chunk));
    req.on('end', () => {
        const proxyReq = https.request(options, (proxyRes) => {
            // Forward the headers and status
            res.writeHead(proxyRes.statusCode, proxyRes.headers);
            proxyRes.pipe(res);
        });

        proxyReq.on('error', (err) => {
            res.writeHead(500);
            res.end(err.message);
        });

        if (bodyData.length > 0) {
            proxyReq.write(Buffer.concat(bodyData));
        }
        proxyReq.end();
    });

}).listen(PORT, () => {
    console.log(`Local CORS Proxy running on http://localhost:${PORT}`);
});
