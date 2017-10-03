Running

docker build -t node-h2-internals .
docker run -p 9229:9229 -p 8080:8080 -i --rm node-h2-internals < app.js

