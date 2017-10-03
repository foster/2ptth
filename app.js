'use strict';

const crypto = require('crypto');
const { ClientHttp2Session, ServerHttp2Session, createSecureServer, connectionListener } = require('internal/http2/core');
const { _connectionListener: httpConnectionListener } = require('http');
const tls = require('tls');
const debug = require('util').debuglog('appjs');

process.argv.push('--self-signed');
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
        const forwardReq = control.request({ ':method': req.method, ':path': req.url, ':authority': req.headers.host, ':scheme': 'https' });
        forwardReq.on('response', (headers) => {
            debugger;
            res.writeHead(headers[':status']);
            forwardReq.pipe(res);
        })
    }
    else {
        res.writeHead(502);
        res.end('There is no control stream attached.');
    }
    // forward the request to ptthClient
    // const req = ptthClientSession.request(headers);
    // stream.pipe(req);
    // req.on('response', (headers) => {
    //     stream.respond(headers);
    //     req.pipe(stream);
    // });
});
server.on('unknownProtocol', (socket) => {
    if ( control ) {
        httpConnectionListener.call(server, socket);
    }
    else {
        control = new ClientHttp2Session({}, socket);        
    }
});
// server.on('unknownProtocol', ptthListener);
// server.on('stream', badGatewayRejecter);


// const listenFor2PtthConnections = (tlsIncomingConnection) => {
//     if (tlsIncomingConnection.alpnProtocol === '2ptth') {
//         const ptthClientSession = new ClientHttp2Session({}, tlsIncomingConnection);

//         // remove this listener (do not allow any more 2ptth connections)
//         server.removeListener('secureConnection', listenFor2PtthConnection);

//         // bind a working http2 listener
//         const newHandler = (tlsIncomingConnection) => listenForHttp2Connections(ptthClientSession, tlsIncomingConnection);
//         server.on('secureConnection', newHandler);
//     }
// };
// server.on('secureConnection', listenForControlConnection);
//     debug('server connection received');
//     const clientSession = new ClientHttp2Session({}, tlsIncomingConnection);

//     setTimeout(() => {
//         debug('calling clientSession.request()');
//         const req = clientSession.request({ ':authority': 'localhost', ':path': '/foo', ':scheme': 'https' }, { endStream: true });
//         req.on('response', (headers) => {
//             debug('status', headers[':status']);
//             debug('date', headers['date']);
//         });

//         let data = '';
//         req.setEncoding('utf8');
//         req.on('data', (d) => data += d);
//         req.on('end', () => {
//             debug(`request ended after sending "${data}"`);
//             clientSession.destroy();
//         });
//     }, 20000);
// });
server.listen(8080);

//// CLIENT

const tlsOutgoingConnection = tls.connect({ 'host': 'localhost', 'port': 8080 });
tlsOutgoingConnection.on('secureConnect', () => {
    const serverSession = new ServerHttp2Session({}, tlsOutgoingConnection);
    serverSession.on('stream', (stream, headers) => {
        debug('handled request', headers);
        stream.respond({ ':status': 200, });
        stream.end('Transmission is possible!');
    });
});
