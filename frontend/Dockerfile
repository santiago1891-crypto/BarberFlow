# BarberFlow — Frontend (desarrollo, con hot-reload)
#
# Para producción usá Dockerfile.prod (build estático servido por nginx) en
# vez de este.
FROM node:20-alpine

WORKDIR /app

# Cachea node_modules mientras no cambie package.json/lock.
COPY package.json package-lock.json* ./
RUN npm install

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
