// app/layout.tsx
export const metadata = {
  title: 'BodyClick',
  description: '3D 기반 의료 정보 제공 서비스',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body>
        {/* 모든 페이지의 내용(children)이 이 자리에 들어갑니다 */}
        {children}
      </body>
    </html>
  )
}