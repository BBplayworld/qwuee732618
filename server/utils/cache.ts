import { promises as fs } from 'fs'
import { join } from 'path'

// 환경에 따른 캐시 파일 경로 설정
const isVercel = process.env.VERCEL === '1'
const CACHE_DIR = isVercel ? '/tmp' : join(process.cwd(), '.cache')
const CACHE_FILE = isVercel ? join('/tmp', 'stocks.json') : join(CACHE_DIR, 'stocks.json')
const STATE_FILE = isVercel ? join('/tmp', 'update_state.json') : join(CACHE_DIR, 'update_state.json')

// 캐시 TTL 설정 (밀리초)
const CACHE_TTL = {
  MARKET_OPEN: 5 * 60 * 1000, // 5분
  MARKET_CLOSED: 12 * 60 * 60 * 1000, // 12시간
}

// 캐시 TTL 가져오기
export const getCacheTTL = () => {
  const now = new Date()
  const day = now.getDay()
  const hour = now.getHours()
  const isWeekend = day === 0 || day === 6
  const isMarketHours = !isWeekend && hour >= 9 && hour < 16

  return isMarketHours ? CACHE_TTL.MARKET_OPEN : CACHE_TTL.MARKET_CLOSED
}

// 캐시 디렉토리 생성 (로컬 환경에서만)
const ensureCacheDir = async () => {
  if (isVercel) return // Vercel에서는 /tmp가 이미 존재

  try {
    await fs.access(CACHE_DIR)
  } catch {
    await fs.mkdir(CACHE_DIR, { recursive: true })
  }
}

// 파일 캐시 읽기
export const readFileCache = async () => {
  try {
    await ensureCacheDir()
    const data = await fs.readFile(CACHE_FILE, 'utf-8')
    const cache = JSON.parse(data)

    // 캐시 만료 체크
    if (Date.now() - cache.timestamp > getCacheTTL()) {
      return null
    }

    return cache.data
  } catch {
    return null
  }
}

// 파일 캐시 쓰기
export const writeFileCache = async (data: any) => {
  try {
    await ensureCacheDir()
    const cache = {
      timestamp: Date.now(),
      data,
    }
    await fs.writeFile(CACHE_FILE, JSON.stringify(cache))
  } catch (error) {
    console.error('[ERROR] Failed to write cache:', error)
  }
}

// 업데이트 상태 인터페이스
interface UpdateState {
  hasCompletedInitialUpdate: boolean
  isBackgroundUpdateInProgress: boolean
  lastMarketState: boolean // 마지막 마켓 상태 (열림/닫힘)
  lastUpdateTimestamp: number
  marketStateChangeTimestamp: number
  callCount: number // API 호출 횟수 추적
  lastResetTimestamp: number // 마지막 리셋 시간
}

// 기본 상태
const DEFAULT_STATE: UpdateState = {
  hasCompletedInitialUpdate: false,
  isBackgroundUpdateInProgress: false,
  lastMarketState: true, // 기본값은 마켓 열림
  lastUpdateTimestamp: 0,
  marketStateChangeTimestamp: Date.now(),
  callCount: 0, // 호출 횟수 초기값
  lastResetTimestamp: Date.now(), // 마지막 리셋 시간 초기값
}

// 상태 파일 읽기
export const readUpdateState = async (): Promise<UpdateState> => {
  try {
    await ensureCacheDir()
    const data = await fs.readFile(STATE_FILE, 'utf-8')
    const state = JSON.parse(data) as UpdateState
    return { ...DEFAULT_STATE, ...state }
  } catch {
    return { ...DEFAULT_STATE }
  }
}

// 상태 파일 쓰기
export const writeUpdateState = async (state: Partial<UpdateState>) => {
  try {
    await ensureCacheDir()
    const currentState = await readUpdateState()
    const newState = { ...currentState, ...state, lastUpdateTimestamp: Date.now() }

    await fs.writeFile(STATE_FILE, JSON.stringify(newState, null, 2))
  } catch (error) {
    console.error('[ERROR] Failed to write update state:', error)
    console.error('[ERROR] State file path:', STATE_FILE)
    console.error('[ERROR] Attempted changes:', state)
    throw error // 에러를 다시 던져서 호출자가 알 수 있게 함
  }
}

// 마켓 상태 변경 감지 및 상태 리셋
export const checkAndResetForMarketStateChange = async (currentMarketState: boolean) => {
  const state = await readUpdateState()

  // 마켓 상태가 변경되었는지 확인
  if (state.lastMarketState !== currentMarketState) {
    console.log(`[INFO] Market state changed: ${state.lastMarketState ? 'Open' : 'Closed'} -> ${currentMarketState ? 'Open' : 'Closed'}`)

    // 마켓이 열렸다가 닫혔을 때만 상태 리셋 (마켓 종료 시 1회성 업데이트 허용)
    if (state.lastMarketState === true && currentMarketState === false) {
      console.log('[INFO] Market closed - resetting update state for one-time update')
      await writeUpdateState({
        hasCompletedInitialUpdate: false,
        isBackgroundUpdateInProgress: false,
        lastMarketState: currentMarketState,
        marketStateChangeTimestamp: Date.now(),
        callCount: 0, // 마켓 상태 변경 시 호출 횟수 리셋
      })
      return true // 상태가 리셋되었음을 알림
    } else {
      // 단순히 마켓 상태만 업데이트
      await writeUpdateState({
        lastMarketState: currentMarketState,
      })
    }
  }

  return false // 상태 리셋 없음
}

// 업데이트 진행 중 여부 확인 (동시성 제어)
export const tryStartUpdate = async (): Promise<boolean> => {
  const state = await readUpdateState()

  if (state.isBackgroundUpdateInProgress) {
    console.log('[INFO] Update already in progress, skipping')
    return false
  }

  // 업데이트 시작 표시
  await writeUpdateState({
    isBackgroundUpdateInProgress: true,
  })

  return true
}

// 업데이트 완료 표시
export const markUpdateCompleted = async () => {
  try {
    console.log('[INFO] Attempting to mark update as completed...')

    await writeUpdateState({
      hasCompletedInitialUpdate: true,
      isBackgroundUpdateInProgress: false,
      callCount: 0, // 완료 시 호출 횟수 리셋
    })

    // 상태 파일 쓰기 후 검증
    const verifyState = await readUpdateState()
    if (verifyState.hasCompletedInitialUpdate) {
      console.log('[INFO] ✅ Update completed and successfully marked in state file')
    } else {
      console.error('[ERROR] ❌ Failed to mark update as completed - verification failed')
    }
  } catch (error) {
    console.error('[ERROR] Failed to mark update as completed:', error)
    throw error
  }
}

// API 호출 횟수 증가 및 방어 로직 확인
export const incrementCallCountAndCheck = async (isMarketClosed: boolean): Promise<boolean> => {
  if (!isMarketClosed) {
    return false // 마켓이 열려있으면 방어로직 불필요
  }

  const state = await readUpdateState()
  const newCallCount = (state.callCount || 0) + 1

  // 호출 횟수 업데이트
  await writeUpdateState({
    callCount: newCallCount,
  })

  // 200번 이상 호출되었고 아직 완료되지 않은 경우 방어로직 실행
  if (newCallCount >= 200 && !state.hasCompletedInitialUpdate) {
    console.log(`[WARNING] Too many calls (${newCallCount}) without completion. Triggering defensive reset.`)
    await executeDefensiveReset()
    return true // 방어로직 실행됨
  }

  if (newCallCount % 10 === 0) {
    console.log(`[INFO] Market closed API calls: ${newCallCount}`)
  }

  return false // 정상 처리
}

// 방어로직: 캐시 클리어 및 상태 리셋
export const executeDefensiveReset = async () => {
  console.log('[WARNING] Executing defensive reset - clearing caches and resetting state')

  try {
    // 1. 파일 캐시 삭제
    await clearFileCache()

    // 2. 상태 완전 리셋
    await writeUpdateState({
      hasCompletedInitialUpdate: false,
      isBackgroundUpdateInProgress: false,
      callCount: 0,
      lastResetTimestamp: Date.now(),
    })

    console.log('[INFO] Defensive reset completed - ready for fresh update')
  } catch (error) {
    console.error('[ERROR] Failed to execute defensive reset:', error)
  }
}

// 파일 캐시 삭제
export const clearFileCache = async () => {
  try {
    await ensureCacheDir()

    // stocks.json 삭제
    try {
      await fs.unlink(CACHE_FILE)
      console.log('[INFO] Cleared stocks cache file')
    } catch (error) {
      // 파일이 없어도 에러 무시
    }

    // update_state.json은 삭제하지 않고 내용만 리셋 (함수 호출자가 처리)
  } catch (error) {
    console.error('[ERROR] Failed to clear file cache:', error)
  }
}
