FROM foster/node:8.6.0-fork

WORKDIR /tmp/src/
COPY package.json app.js /tmp/src/
RUN npm install

ENV NODE_TLS_REJECT_UNAUTHORIZED=0
ENV NODE_DEBUG=tls,http2,appjs
CMD [ "node", "--expose-internals", "app.js" ]
