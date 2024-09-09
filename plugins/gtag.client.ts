export default defineNuxtPlugin((nuxtApp) => {
    // Gtag ID를 상수로 정의
    const GTAG_ID = 'G-CHKS355R0L'; // Gtag ID를 여기서 관리

    // Gtag가 로드되지 않을 조건 설정
    const isDev = process.env.NODE_ENV === 'development';
    const isPreview = process.env.APP_ENV === 'preview';

    // development 환경이거나 preview 환경인 경우 Gtag 로드 안 함
    if (isDev || isPreview) {
        console.log('Gtag is disabled in development or preview environment');
        return; // Gtag 로드를 제외
    }

    // Gtag 스크립트 로드
    (function () {
        const gtagScript = document.createElement('script');
        gtagScript.src = `https://www.googletagmanager.com/gtag/js?id=${GTAG_ID}`; // 상수로 Gtag ID 사용
        gtagScript.async = true;
        document.head.appendChild(gtagScript);

        // Gtag 초기 설정
        (window as any).dataLayer = (window as any).dataLayer || [];
        function gtag(...args: any[]) {
            (window as any).dataLayer.push(args);
        }

        gtag('js', new Date());
        gtag('config', GTAG_ID, {
            anonymize_ip: true, // GDPR을 위한 IP 익명화
            send_page_view: process.env.NODE_ENV === 'production', // production에서만 page_view 전송
        });

        // 페이지 이동 시 Gtag 경로 업데이트
        nuxtApp.$router.afterEach((to) => {
            gtag('config', GTAG_ID, {
                page_path: to.fullPath,
            });
        });
    })();
});
