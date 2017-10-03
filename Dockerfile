FROM foster/node:8.6.0-fork

WORKDIR /tmp/src/
COPY package.json /tmp/src/
RUN npm install

ENV NODE_TLS_REJECT_UNAUTHORIZED=0
ENV NODE_DEBUG=tls,http2,appjs
CMD [ "node", "--expose-internals", "--inspect-brk=0.0.0.0:9229" ]
