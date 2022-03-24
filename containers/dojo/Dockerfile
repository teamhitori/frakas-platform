FROM node:latest

ENV APP_ROOT=/var/www 

EXPOSE 80
EXPOSE 8080

COPY . $APP_ROOT
WORKDIR $APP_ROOT

RUN mkdir -p /var/www/build
RUN npm install
RUN npm run build

ENTRYPOINT ["npm", "run", "debug"]
