# Admin API Documentation

## 개요

어드민 전용 API 엔드포인트입니다. 모든 작업은 `ADMIN_SECRET_KEY` 환경변수를 통한 인증이 필요합니다.

## 환경 설정

### 1. 환경 변수 설정

`.env` 파일에 어드민 시크릿 키를 추가하세요:

```bash
# 강력한 랜덤 키 생성 권장 (최소 32자 이상)
ADMIN_SECRET_KEY=your-super-secret-admin-key-here-min-32-chars

# Finnhub API 토큰들 (테스트용)
FINN_1_KEY=your-finnhub-token-1
FINN_2_KEY=your-finnhub-token-2
FINN_3_KEY=your-finnhub-token-3
FINN_4_KEY=your-finnhub-token-4
```

### 2. 키 생성 예시 (Node.js)

```javascript
// 안전한 랜덤 키 생성
const crypto = require('crypto')
const adminKey = crypto.randomBytes(32).toString('hex')
console.log('ADMIN_SECRET_KEY=' + adminKey)
```

## API 엔드포인트

### 어드민 API

**URL:** `/api/admin/clear-cache`
**Method:** GET
**Authentication:** Query parameter `key`

#### 파라미터

| 파라미터 | 타입   | 필수 | 기본값  | 설명                                             |
| -------- | ------ | ---- | ------- | ------------------------------------------------ |
| `key`    | string | ✅   | -       | 어드민 시크릿 키                                 |
| `type`   | string | ❌   | `cache` | 액션 타입 (`cache`, `full`, `defensive`, `read`) |

#### 액션 타입

1. **`cache`** (기본값)
   - 파일 캐시만 삭제
   - 가장 안전한 옵션
2. **`full`**
   - 파일 캐시 + 업데이트 상태 리셋
   - 백그라운드 업데이트 재시작
3. **`defensive`**
   - 방어 로직 실행 (전체 리셋)
   - 가장 강력한 리셋 옵션
4. **`read`** ✨ **새로 추가**
   - 현재 캐시 데이터 조회
   - 캐시 상태 및 내용 확인

#### 사용 예시

```bash
# 캐시 데이터 조회
curl "https://your-domain.com/api/admin/clear-cache?key=YOUR_ADMIN_KEY&type=read"

# 기본 캐시 삭제
curl "https://your-domain.com/api/admin/clear-cache?key=YOUR_ADMIN_KEY"

# 전체 리셋
curl "https://your-domain.com/api/admin/clear-cache?key=YOUR_ADMIN_KEY&type=full"

# 방어 리셋
curl "https://your-domain.com/api/admin/clear-cache?key=YOUR_ADMIN_KEY&type=defensive"
```

#### 응답 예시

**캐시 조회 성공 시:**

```json
{
  "success": true,
  "message": "Cache data retrieved successfully",
  "timestamp": 1704067200000,
  "data": {
    "stocks": [
      {
        "name": "AAPL",
        "marketCap": 2800000,
        "c": 175.04,
        "dp": 0.51,
        "sector": "Technology",
        "timestamp": 1704067180000
      }
    ],
    "economic": [
      {
        "name": "GDP",
        "date": "2024-01-01",
        "value": "2.5%"
      }
    ],
    "updateState": {
      "hasCompletedInitialUpdate": true,
      "isBackgroundUpdateInProgress": false,
      "callCount": 0
    },
    "cacheInfo": {
      "stocksCacheExists": true,
      "economicCacheExists": true,
      "stocksCacheSize": 49,
      "economicCacheSize": 8
    }
  }
}
```

**캐시 삭제 성공 시:**

```json
{
  "success": true,
  "message": "Cache cleared successfully (cache mode)",
  "timestamp": 1704067200000,
  "clearedItems": ["stocks_cache", "economic_cache"]
}
```

**실패 시:**

```json
{
  "statusCode": 403,
  "statusMessage": "Invalid admin key"
}
```

### 2. Finnhub API 성능 테스트 🆕

**URL:** `/api/admin/test-finnhub`
**Method:** GET
**Authentication:** Query parameter `key`

#### 파라미터

| 파라미터 | 타입   | 필수 | 기본값   | 설명                                          |
| -------- | ------ | ---- | -------- | --------------------------------------------- |
| `key`    | string | ✅   | -        | 어드민 시크릿 키                              |
| `symbol` | string | ❌   | `AAPL`   | 테스트할 주식 심볼                            |
| `type`   | string | ❌   | `single` | 테스트 타입 (`single`, `multi`, `sequential`) |
| `count`  | number | ❌   | `5`      | `sequential` 타입에서 호출 횟수               |

#### 테스트 타입

1. **`single`** - 단일 API 호출 테스트

   - 기본 연결성과 응답 시간 테스트
   - 랜덤 토큰 하나를 사용

2. **`multi`** - 모든 토큰 동시 테스트

   - 모든 API 토큰을 동시에 테스트
   - 토큰별 Rate Limiting 확인

3. **`sequential`** - 연속 호출 테스트
   - 지속적인 성능과 Rate Limiting 테스트
   - 토큰을 순환하며 사용

#### 사용 예시

```bash
# 단일 API 호출 테스트 (가장 기본)
curl "https://your-domain.com/api/admin/test-finnhub?key=YOUR_ADMIN_KEY&symbol=AAPL&type=single"

# 모든 토큰 동시 테스트
curl "https://your-domain.com/api/admin/test-finnhub?key=YOUR_ADMIN_KEY&symbol=NVDA&type=multi"

# 연속 10회 호출 테스트
curl "https://your-domain.com/api/admin/test-finnhub?key=YOUR_ADMIN_KEY&symbol=MSFT&type=sequential&count=10"
```

#### 응답 예시

**단일 테스트 성공 시:**

```json
{
  "test": {
    "type": "single",
    "symbol": "AAPL",
    "timestamp": "2024-01-15T10:30:00.000Z",
    "totalRequestTime": 1250,
    "environment": {
      "region": "iad1",
      "runtime": "edge",
      "nodeVersion": "v18.17.0"
    }
  },
  "result": {
    "success": true,
    "symbol": "AAPL",
    "data": { "c": 175.04, "dp": 0.51, "h": 176.1, "l": 174.2, "o": 175.8, "pc": 174.53, "t": 1704470400 },
    "timing": {
      "fetchTime": 1180,  // 🔥 가장 중요한 지표
      "parseTime": 15,
      "totalTime": 1195
    },
    "response": {
      "status": 200,
      "statusText": "OK",
      "headers": { "content-type": "application/json", ... }
    },
    "request": {
      "url": "https://finnhub.io/api/v1/quote?symbol=AAPL",
      "token": "abcd1234...xyz9"
    }
  }
}
```

**연속 테스트 성공 시:**

```json
{
  "test": { ... },
  "result": {
    "symbol": "AAPL",
    "totalCalls": 5,
    "totalTime": 6250,
    "averageTime": 1250,  // 🔥 평균 응답 시간
    "results": [
      {
        "callIndex": 1,
        "callTime": 1200,
        "success": true,
        "timing": { "fetchTime": 1180, "parseTime": 15, "totalTime": 1195 }
      },
      // ... 더 많은 결과
    ]
  }
}
```

#### 성능 지표 해석

- **`fetchTime`**: 순수 네트워크 요청 시간 ⭐ **가장 중요**

  - `< 500ms`: 매우 빠름
  - `500-2000ms`: 정상
  - `2000-5000ms`: 느림
  - `> 5000ms`: 매우 느림 (문제 있음)

- **`parseTime`**: JSON 파싱 시간

  - 일반적으로 `< 50ms`

- **`totalTime`**: 전체 작업 시간
- **`averageTime`**: 연속 테스트에서 평균 시간

#### 🔬 세부 네트워크 타이밍 분석 🆕

**새로운 기능**: 각 요청의 네트워크 단계별 세부 시간 측정

```json
{
  "timing": {
    "setupTime": 5,
    "fetchTime": 1180,
    "parseTime": 15,
    "totalTime": 1200,

    "network": {
      "dnsLookup": 45, // DNS 탐색 시간
      "tcpConnect": 120, // TCP 연결 설정
      "tlsHandshake": 85, // TLS/SSL 핸드셰이크
      "requestSent": 5, // 요청 전송 시간
      "waitingTime": 890, // 서버 응답 대기 (TTFB)
      "downloadTime": 35, // 데이터 다운로드
      "redirectTime": 0, // 리다이렉트 시간
      "totalNetworkTime": 1180
    },

    "breakdown": {
      "DNS 탐색": 45,
      "TCP 연결": 120,
      "TLS 핸드셰이크": 85,
      "요청 전송": 5,
      "서버 응답 대기": 890, // 🔥 가장 중요한 지표
      "데이터 다운로드": 35,
      "JSON 파싱": 15
    }
  }
}
```

#### 🎯 병목 구간 진단 가이드

1. **DNS 탐색 (`dnsLookup`) > 100ms**

   - DNS 서버 응답 느림
   - CDN/DNS 최적화 필요

2. **TCP 연결 (`tcpConnect`) > 200ms**

   - 물리적 거리가 멀거나 네트워크 품질 문제
   - 지역별 서버 배치 고려

3. **TLS 핸드셰이크 (`tlsHandshake`) > 150ms**

   - SSL 인증서 처리 지연
   - TLS 버전 최적화 필요

4. **서버 응답 대기 (`waitingTime`) > 5000ms** ⚠️

   - **Finnhub 서버 처리 지연** (가장 가능성 높음)
   - API Rate Limiting 발생
   - 서버 과부하 상태

5. **데이터 다운로드 (`downloadTime`) > 100ms**
   - 응답 데이터 크기 문제
   - 네트워크 대역폭 부족

#### 🔥 20초 지연 원인 분석

**`waitingTime`이 20초+인 경우**:

- ✅ **Finnhub 서버 문제 확실**
- ✅ **네트워크나 DNS는 정상**
- ✅ **애플리케이션 로직 문제 아님**

**`dnsLookup` + `tcpConnect`가 20초+인 경우**:

- ✅ **네트워크 연결 문제**
- ✅ **Vercel Edge Function 리전 문제**
- ✅ **방화벽이나 프록시 문제**

## 성능 문제 해결 가이드

### 🐌 Finnhub API가 20초+ 걸릴 때

1. **기본 테스트 실행**

   ```bash
   curl "https://your-domain.com/api/admin/test-finnhub?key=YOUR_ADMIN_KEY&type=single"
   ```

2. **세부 타이밍 분석**

   - `breakdown` 섹션에서 병목 구간 확인
   - `waitingTime > 20000ms` → Finnhub 서버 문제
   - `dnsLookup + tcpConnect > 5000ms` → 네트워크 문제

3. **토큰별 테스트**

   ```bash
   curl "https://your-domain.com/api/admin/test-finnhub?key=YOUR_ADMIN_KEY&type=multi"
   ```

4. **지속적 모니터링**
   ```bash
   curl "https://your-domain.com/api/admin/test-finnhub?key=YOUR_ADMIN_KEY&type=sequential&count=10"
   ```

### 🔧 문제 해결 체크리스트

- [ ] `waitingTime`이 5초 이상인가? → Finnhub 서버 문제
- [ ] `dnsLookup`이 1초 이상인가? → DNS 문제
- [ ] `tcpConnect`이 2초 이상인가? → 네트워크 연결 문제
- [ ] `tlsHandshake`이 1초 이상인가? → SSL 문제
- [ ] 모든 토큰에서 동일한 지연인가? → 공통 인프라 문제
- [ ] 특정 토큰만 느린가? → 해당 토큰의 Rate Limit 문제
- [ ] 연속 호출에서 점점 느려지는가? → Rate Limiting 발생
- [ ] Edge Function 리전 확인 → `environment.region`

## 보안 주의사항

### ⚠️ 중요 보안 수칙

1. **시크릿 키 관리**

   - 절대 코드에 하드코딩하지 마세요
   - 환경 변수로만 관리하세요
   - 정기적으로 키를 변경하세요

2. **네트워크 보안**

   - HTTPS 환경에서만 사용하세요
   - 로그에 키가 노출되지 않도록 주의하세요

3. **접근 제한**

   - 신뢰할 수 있는 IP에서만 접근하세요
   - 필요시 방화벽 규칙을 설정하세요

4. **로깅**
   - 모든 어드민 액션은 로그로 기록됩니다
   - 무단 접근 시도도 로그로 기록됩니다

## 문제 해결

### 자주 발생하는 오류

1. **`Admin secret key not configured`**

   - `.env` 파일에 `ADMIN_SECRET_KEY` 추가 필요

2. **`Invalid admin key`**

   - 제공된 키가 설정된 키와 일치하지 않음
   - 키에 특수문자가 있는 경우 URL 인코딩 필요

3. **`Cache clear failed`**
   - 파일 시스템 권한 문제
   - 캐시 파일이 사용 중인 경우

### 디버깅

서버 로그에서 다음 패턴을 확인하세요:

- `[ADMIN]` - 어드민 작업 로그
- `[SECURITY]` - 보안 관련 로그
- `[ERROR]` - 오류 로그

## 사용 시나리오

### 1. 캐시 상태 확인

```bash
# 현재 캐시 데이터 및 상태 확인
curl "https://your-domain.com/api/admin/clear-cache?key=YOUR_ADMIN_KEY&type=read"
```

### 2. 정기 캐시 정리

```bash
# 주간 정기 정리 (기본 캐시만)
curl "https://your-domain.com/api/admin/clear-cache?key=YOUR_ADMIN_KEY"
```

### 3. 시스템 업데이트 후

```bash
# 전체 리셋으로 새로운 데이터 강제 업데이트
curl "https://your-domain.com/api/admin/clear-cache?key=YOUR_ADMIN_KEY&type=full"
```

### 4. 응급 상황

```bash
# 시스템 이상시 방어 리셋 실행
curl "https://your-domain.com/api/admin/clear-cache?key=YOUR_ADMIN_KEY&type=defensive"
```

## 모니터링

### 성공 지표

- `success: true` 응답
- `clearedItems` 배열에 삭제된 항목 확인
- 서버 로그에 `[ADMIN] Cache clear completed successfully` 메시지

### 주의사항

- 캐시 삭제 후 첫 번째 요청은 응답 시간이 길어질 수 있습니다
- 백그라운드 업데이트가 재시작되므로 CPU 사용량이 일시적으로 증가할 수 있습니다
