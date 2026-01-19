/** @type {import('next').NextConfig} */
const nextConfig = {
    async headers() {
      return [
        {
          // 모든 API 경로에 대해 CORS 허용 설정
          source: "/api/:path*",
          headers: [
            { key: "Access-Control-Allow-Credentials", value: "true" },
            { key: "Access-Control-Allow-Origin", value: "http://localhost:3000" }, // 프론트엔드 주소 (마지막 슬래시 없음)
            { key: "Access-Control-Allow-Methods", value: "GET,DELETE,PATCH,POST,PUT" },
            { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version" },
          ]
        }
      ]
    }
  };
  
  module.exports = nextConfig;