FROM envoyproxy/envoy-dev

COPY . /app
WORKDIR /app
EXPOSE 80

RUN ["chmod", "+x", "/app/start-proxy.sh"]
ENTRYPOINT ["/app/start-proxy.sh"]