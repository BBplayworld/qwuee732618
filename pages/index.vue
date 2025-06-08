<template>
    <SpeedInsights />
    <div class="container-wrapper">
        <div class="container">
            <Treemap />
        </div>
    </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { SpeedInsights } from '@vercel/speed-insights/vue'

onMounted(() => {
    document.addEventListener('touchend', (e: Event) => {
        const target = e.target as HTMLElement
        // 클릭한 대상이 링크가 아닐 경우에만 preventDefault() 호출
        if (target.tagName !== 'A') {
            e.preventDefault()
        }
    })
})
</script>

<style>
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

html,
body {
    overflow-x: hidden;
}

body {
    margin: 0;
    font-family: 'Noto Sans KR', 'Malgun Gothic', 'Apple SD Gothic Neo', 'Nanum Gothic', sans-serif;
    background-color: #111;
    color: #fff;
    overscroll-behavior: contain;
}

body,
html,
.container,
.content {
    touch-action: pan-y !important;
    /* 확대 및 축소 제스처 비활성화 */
    -ms-touch-action: pan-y !important;
    -webkit-user-select: none !important;
    -ms-user-select: none !important;
    user-select: none !important;
}

h1,
h2 {
    margin: 5px 20px 20px 0px;
}

.container-wrapper {
    display: flex;
    justify-content: center;
}

.container {
    display: flex;
    justify-content: flex-start;
    flex-wrap: wrap;
    padding: 10px;
    margin: 5px 10px 50px 10px;
    box-sizing: border-box;
    /* 작은 화면에서 화면 크기에 맞게 축소 */
}

.container>* {
    flex: 1;
    box-sizing: border-box;
}

/* font */
.font-opensans {
    font-family: 'Roboto', sans-serif;
}

.font-roboto {
    font-family: 'Open Sans', sans-serif;
}

@media all and (max-width: 767px) {
    .container {
        padding: 3px;
        margin: 0;
    }
}
</style>