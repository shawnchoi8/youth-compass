# 빌드 단계
FROM node:18-alpine AS build

WORKDIR /app

# copy and install dependency file
COPY package*.json ./
RUN npm ci

# 소스 코드 복사
# 소스 코드 복사
COPY . .

# 빌드 시 환경 변수 ARG로 받기
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_SUPABASE_PROJECT_ID
ARG VITE_API_URL

# 환경 변수로 설정 (Vite가 빌드 시 사용)
ENV VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
ENV VITE_SUPABASE_PUBLISHABLE_KEY=${VITE_SUPABASE_PUBLISHABLE_KEY}
ENV VITE_SUPABASE_PROJECT_ID=${VITE_SUPABASE_PROJECT_ID}
ENV VITE_API_URL=${VITE_API_URL}

# 빌드 실행
RUN npm run build

# 실행 단계 - Nginx로 서빙
FROM nginx:alpine

# 빌드된 파일 복사
COPY --from=build /app/dist /usr/share/nginx/html

# Nginx 설정 파일 복사
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 포트 노출
EXPOSE 80

# Nginx 실행
CMD ["nginx", "-g", "daemon off;"]