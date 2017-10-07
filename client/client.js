'use strict';

const tls = require('tls');
const { Http2Session, constants } = require('internal/http2/core');
const debug = require('util').debuglog('clientjs');


//// CLIENT

const tlsOutgoingConnection = tls.connect({ 'host': 'example.com', 'port': 443, 'ALPNProtocols': ['2ptth'] });
tlsOutgoingConnection.on('secureConnect', () => {
    debug('connect');
    const serverSession = new Http2Session(constants.NGHTTP2_SESSION_SERVER, {}, tlsOutgoingConnection);
    serverSession.on('stream', (stream, headers) => {
        if ( headers[':method'] === 'POST' ) {
            debug('a post. but is there an echo in here?');
            stream.respond({ ':status': 200 });
            stream.pipe(stream);
        }
        else {
            debug('handled request', headers);
            stream.respond({ ':status': 200, });
            stream.end('Transmission is possible!');
        }
    });
});
