'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import 'swagger-ui-react/swagger-ui.css';

// SwaggerUI는 클라이언트 사이드 전용이므로 dynamic import
const SwaggerUI = dynamic(() => import('swagger-ui-react'), { ssr: false });

export default function ApiDocs() {
  const [spec, setSpec] = useState(null);

  useEffect(() => {
    // 위에서 만든 JSON API 호출
    fetch('/api/swagger')
      .then((res) => res.json())
      .then((data) => setSpec(data));
  }, []);

  if (!spec) return <div className="p-5">Loading API Docs...</div>;

  return <SwaggerUI spec={spec} />;
}