# Admin API Documentation

## 개요

어드민 전용 API 엔드포인트입니다. 모든 작업은 `ADMIN_SECRET_KEY` 환경변수를 통한 인증이 필요합니다.

## 환경 설정

### 1. 환경 변수 설정

`.env` 파일에 어드민 시크릿 키를 추가하세요:

```bash
# 강력한 랜덤 키 생성 권장 (최소 32자 이상)
ADMIN_SECRET_KEY=your-super-secret-admin-key-here-min-32-chars
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
