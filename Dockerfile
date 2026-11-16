# 1-баскыч: Angular долбоорду чогултуу (Build)
FROM node:20-alpine AS build
WORKDIR /app

# Кэшти үнөмдөө үчүн алгач package*.json файлдарын көчүрөбүз
COPY package*.json ./
RUN npm install

# Долбоордун кодун көчүрүп, чогултабыз
COPY . .
RUN npm run build -- --configuration production

# 2-баскыч: Nginx аркылуу статикалык файлдарды таратуу
FROM nginx:alpine

# Angular 19 чыгарган файлдарды Nginx папкасына көчүрүү
COPY --from=build /app/dist/tashuu/browser /usr/share/nginx/html

# SPA маршруттары (routing) туура иштеши үчүн Nginx конфиги
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
