# ./front/Dockerfile
FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf

# Exponemos el puerto 80
EXPOSE 80

COPY . /usr/share/nginx/html

# Arrancamos nginx en primer plano
CMD ["nginx", "-g", "daemon off;"]
