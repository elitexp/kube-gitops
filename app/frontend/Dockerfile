# Stage 1: Build Angular App (Use Node 16!)
FROM node:16-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build --prod

# Stage 2: NGINX to serve Angular
FROM nginx:alpine

COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=build /app/dist/ /usr/share/nginx/html/

EXPOSE 4200
CMD ["nginx", "-g", "daemon off;"]
