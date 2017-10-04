'use strict';

const crypto = require('crypto');
const { ClientHttp2Session, ServerHttp2Session, createSecureServer, connectionListener } = require('internal/http2/core');
const { _connectionListener: httpConnectionListener } = require('http');
const tls = require('tls');
const debug = require('util').debuglog('appjs');

// process.argv.push('--self-signed');
const { key, cert } = (() => {
    if ( process.argv.includes('--self-signed') ) {
        const { 'private': key, cert } =  require('selfsigned').generate();
        return { key, cert };
    }
    else {
        const key = fs.readFileSync( process.env.KEY );
        const cert = fs.readFileSync( process.env.CERT );
        return { key, cert };
    }
})();

//// SERVER

const badGatewayRejecter = (stream) => {
    stream.respond({ ':status': 502 });
    stream.end('There is no control stream attached.');
    stream.destroy();
};
 
let control;
// HTTP1 support will be handled by the unknownProtocol event handler
const server = createSecureServer({ key, cert, 'allowHTTP1': false }, (req, res) => {
    if ( control ) {
        const forwardReq = control.request({
            ':method': req.method,
            ':path': req.url,
            ':authority': req.headers.host,
            ':scheme': 'https',
            'content-type': req.headers['content-type']
        });
        forwardReq.on('response', (headers) => {
            const forwardHeaders = {};
            if ( Object.prototype.hasOwnProperty.call(headers, 'content-type') ) {
                forwardHeaders['content-type'] = headers['content-type'];
            }
            res.writeHead(headers[':status'], forwardHeaders);
            req.pipe(forwardReq);
            forwardReq.pipe(res);
        });
    }
    else {
        res.writeHead(502);
        res.end('There is no control stream attached.');
    }
});
server.on('unknownProtocol', (socket) => {
    if ( control ) {
        httpConnectionListener.call(server, socket);
    }
    else {
        control = new ClientHttp2Session({}, socket);        
    }
});
server.listen(8080);
