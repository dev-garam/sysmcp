#!/bin/bash

echo "🚀 SysMCP 서버 시작 중..."

# 빌드가 필요한지 확인
if [ ! -d "dist" ] || [ "src/index.ts" -nt "dist/index.js" ]; then
    echo "📦 TypeScript 빌드 중..."
    npm run build
fi

echo "✅ SysMCP 서버가 시작되었습니다."
echo "📱 이제 Claude Desktop에서 다음과 같이 사용하세요:"
echo "   - '시스템 상태 확인해줘'"
echo "   - 'CPU 사용률 보여줘'"
echo "   - '메모리 부족한지 확인해줘'"
echo "   - '성능 병목 지점 분석해줘'"
echo ""
echo "🔄 서버 중지: Ctrl+C"
echo ""

# 서버 시작 (실제로는 Claude Desktop에서 자동으로 실행됨)
node dist/index.js 