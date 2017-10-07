FROM node:8.6.0-alpine

WORKDIR /tmp/src/
COPY package.json client.js /tmp/src/
RUN npm install

ENV NODE_DEBUG=tls,http2,clientjs
CMD [ "node", "--expose-internals", "client.js" ]
