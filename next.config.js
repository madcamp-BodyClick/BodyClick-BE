/** @type {import('next').NextConfig} */
const nextConfig = {
    async headers() {
      return [
        {
          // 모든 API 경로에 대해 CORS 허용 설정
          source: "/api/:path*",
          headers: [
            { key: "Access-Control-Allow-Credentials", value: "true" },
            { key: "Access-Control-Allow-Origin", value: "http://localhost:3000" }, // 프론트엔드 주소
            { key: "Access-Control-Allow-Methods", value: "GET,DELETE,PATCH,POST,PUT,OPTIONS" },
            { 
              key: "Access-Control-Allow-Headers", 
              // Authorization 헤더를 추가해야 401/CORS 에러를 확실히 막을 수 있습니다.
              value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization" 
            },
          ]
        }
      ]
    }
  };
  
  module.exports = nextConfig;