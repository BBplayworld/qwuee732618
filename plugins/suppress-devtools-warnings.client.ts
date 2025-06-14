export default defineNuxtPlugin(() => {
  // 클라이언트 사이드에서만 실행
  if (process.client) {
    // Vue Router 경고 억제
    const originalWarn = console.warn
    console.warn = (...args: any[]) => {
      const message = args[0]

      // Chrome DevTools 관련 경고 필터링
      if (typeof message === 'string' && (message.includes('.well-known/appspecific/com.chrome.devtools.json') || message.includes('No match found for location with path'))) {
        return // 경고 무시
      }

      // 기타 경고는 정상 출력
      originalWarn.apply(console, args)
    }
  }
})
