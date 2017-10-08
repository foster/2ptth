# 2ptth - Using http2 backwards

This is an experimental client/server pair where the initiator of the TLS connection becomes an HTTP/2 server.

A backwards connection may be useful when the resource owner is behind a firewall or NAT, but its peer is addressable.

This particular implementation contains a listener -- in [server/app.js] -- intended to run on a VPS on the internet and an initiator -- in [client/client.js] -- intended to run anywhere, including on a personal machine.

The listener uses [ALPN](https://en.wikipedia.org/wiki/Application-Layer_Protocol_Negotiation) to expect a single 2ptth connection as well as any number of HTTPS connections. Once the 2ptth connection is established, HTTPS requests made to the listener will be translated to HTTP/2 requests and forwarded on the 2ptth connection.

## Disclaimer

This project is for educational purposes only. It opens a tunnel for the whole internet to reach your computer. That is inherently dangerous. *DO NOT USE THIS SOFTWARE UNLESS YOU KNOW EXACTLY WHAT YOU ARE DOING*.

## Why HTTP/2

HTTP/2 supports a huge number of simultaneous requests (streams) on a single TCP connection. Multiplexing is built into the protocol. HTTP/2 neatly solves the scenario of an HTTPS endpoint forwarding all of its requests to a single back-end connection.

## Building

docker build -t "2ptth-server" -f server/Dockerfile .
docker build -t "2ptth-client" -f client/Dockerfile .

## Running the server

Note: The server depends on a custom build of <span>Node</span>.js -- a [fork of 8.6.0](https://github.com/foster/node/commit/dbbb0efbca21778607308274ac766c875fe37937) that exposes some internal classes from the 'http2' module. The [Dockerfile](server/Dockerfile) will create an image with the right build of node.

Make sure to set an environment variable for `CERT` and `KEY` that provide a path to load the TLS certificate and key. For example, mounting a volume called "letsencrypt" and setting `CERT` and `KEY` to point to the mounted volume:

    docker run --rm -v letsencrypt:/etc/letsencrypt:ro \
      -e "CERT=/etc/letsencrypt/live/example.com/fullchain.pem" \
      -e "KEY=/etc/letsencrypt/live/example.com/privkey.pem" \
      -p=443:443 -it 2ptth-server


Alternatively, force the server to self sign a certificate:

	docker run --rm -p 443:443 -it 2ptth-server \
        node --expose-internals app.js --self-signed


## Running the client

Note: The client depends on internals to the <span>Node</span>.js core 'http2' module. These internals exist in node 8.6.0, but there is no guarantee that they will exist in future versions. Use node 8.6.0 if possible.

    node --expose-internals client.js 

Or if the server certificate is self-signed:

    NODE_TLS_REJECT_UNAUTHORIZED=0 node --expose-internals client.js
    

## License

Creative Commons Zero. See [LICENSE.txt](LICENSE.txt)
