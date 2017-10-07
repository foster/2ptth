'use strict';

const crypto = require('crypto');
const fs = require('fs');
const { ClientHttp2Session, ServerHttp2Session, createSecureServer, connectionListener } = require('internal/http2/core');
const { _connectionListener: httpConnectionListener } = require('http');
const tls = require('tls');
const debug = require('util').debuglog('appjs');
const EventEmitter = require('events');

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
const server = tls.createServer( { key, cert, 'ALPNProtocols': ['2ptth'] });

const badGatewayResponder = new EventEmitter();
badGatewayResponder.on('request', (req, res) => {
    debug('bad gateway');
    res.writeHead(502);
    res.end('There is no upstream available');
    res.destroy();
});

const awaitingUpstreamHandler = (tlsIncomingConnection) => {
    debug('a conneciom');
    if (tlsIncomingConnection.alpnProtocol === '2ptth') {
        debug('2ptth');
        const outgoingClient = new ClientHttp2Session({}, tlsIncomingConnection);
        const newSecureConnectionHandler = (tlsIncomingConnection) => liveUpstreamHandler(outgoingClient, tlsIncomingConnection);
        server.removeListener('secureConnection', awaitingUpstreamHandler);
        server.on('secureConnection', newSecureConnectionHandler);
        tlsIncomingConnection.on('close', () => {
            debug('2ptth destroy');
            server.removeListener('secureConnection', newSecureConnectionHandler);
            server.on('secureConnection', awaitingUpstreamHandler);
        });
    }
    else {
        httpConnectionListener.call(badGatewayResponder, tlsIncomingConnection);
    }
};

const liveUpstreamHandler = (upstreamClient, tlsIncomingConnection) => {
    debug('a connection I was ready for');
    if (tlsIncomingConnection.alpnProtocol === '2ptth') {
        debug('warning: 2ptth connection attempted, but we already have an upstream');
        tlsIncomingConnection.destroy();
        return;
    }
    else {
        const tmp = new EventEmitter();
        httpConnectionListener.call(tmp, tlsIncomingConnection);
        tmp.on('request', (req, res) => {
            debug('a forwardable request');
            const forwardReq = upstreamClient.request({
                ':method': req.method,
                ':path': req.url,
                ':authority': req.headers.host,
                ':scheme': 'https',
                'content-type': req.headers['content-type']
            });
            req.pipe(forwardReq);
            forwardReq.on('response', (headers) => {
                const forwardHeaders = {};
                if ( Object.prototype.hasOwnProperty.call(headers, 'content-type') ) {
                    forwardHeaders['content-type'] = headers['content-type'];
                }
                res.writeHead(headers[':status'], forwardHeaders);
                forwardReq.pipe(res);
            });

            forwardReq.on('close', () => debug('forward stream closed'));
        });
    }
}

server.on('secureConnection', awaitingUpstreamHandler);
server.listen(443);
debug('listening 443');
