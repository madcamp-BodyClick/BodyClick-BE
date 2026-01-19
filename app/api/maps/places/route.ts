import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET(request: Request) {
  try {
    // 1. 인증 확인 (Header: Authorization)
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Query Parameter 파싱
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");
    const keyword = searchParams.get("keyword");
    const radius = searchParams.get("radius");

    if (!lat || !lng || !keyword) {
      return NextResponse.json({ error: "Missing required parameters (lat, lng, keyword)" }, { status: 400 });
    }

    // 3. 카카오 로컬 API 호출 (키워드 검색)
    // 문서: https://developers.kakao.com/docs/latest/ko/local/dev-guide#search-keyword
    const kakaoUrl = `https://dapi.kakao.com/v2/local/search/keyword.json?y=${lat}&x=${lng}&radius=${radius || 5000}&query=${encodeURIComponent(keyword)}&sort=distance&size=5`;

    const response = await fetch(kakaoUrl, {
      method: "GET",
      headers: {
        Authorization: `KakaoAK ${process.env.KAKAO_MAP_REST_API_KEY}`, // REST API 키 사용
      },
    });

    if (!response.ok) {
      console.error("Kakao API Error:", await response.text());
      return NextResponse.json({ error: "Failed to fetch data from Kakao" }, { status: 502 });
    }

    const data = await response.json();

    // 4. 데이터 매핑 (Kakao 응답 -> 우리 API 명세)
    const formattedData = data.documents.map((place: any) => ({
      place_id: place.id,                    // 카카오 장소 ID
      name: place.place_name,                // 장소명
      address: place.address_name,           // 지번 주소
      road_address: place.road_address_name, // 도로명 주소
      location: {
        lat: parseFloat(place.y),
        lng: parseFloat(place.x),
      },
      // 👇 카카오 API 미제공 필드 (명세서 규격을 위해 기본값 처리)
      rating: 0, 
      user_ratings_total: 0,
      is_open_now: null,
      phone_number: place.phone || null,     // 전화번호
      place_url: place.place_url             // (추가) 카카오맵 상세 페이지 링크
    }));

    return NextResponse.json({
      success: true,
      count: formattedData.length,
      data: formattedData,
    });

  } catch (error) {
    console.error("GET /maps/places Error:", error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}