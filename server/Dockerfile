FROM foster/node:8.6.0-fork

WORKDIR /tmp/src/
COPY package.json server/app.js /tmp/src/
RUN npm install

ENV NODE_DEBUG=tls,http2,appjs
EXPOSE 443
CMD [ "node", "--expose-internals", "app.js" ]
