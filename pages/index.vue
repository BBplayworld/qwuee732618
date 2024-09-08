import companyNews from '~/server/api/company-news';
<template>
    <SpeedInsights />
    <Ad />
    <div class="container-wrapper">
        <div class="container">
            <Treemap />
            <EconomicIndicators />
            <CompanyNews />
        </div>
    </div>
</template>

<style>
body {
    margin: 0;
    font-family: Arial, sans-serif;
    background-color: #111;
    color: #fff;
    overscroll-behavior: contain;
    overflow-x: hidden;
}

h1,
h2 {
    margin: 5px 20px 20px 10px;
}

.container-wrapper {
    display: flex;
    justify-content: center;
}

.container {
    max-width: 1600px;
    display: flex;
    justify-content: flex-start;
    flex-wrap: wrap;
    padding: 10px;
    margin: 5px 10px 50px 10px;
    box-sizing: border-box;
    /* 작은 화면에서 화면 크기에 맞게 축소 */
}

/* 개별 컴포넌트 */
.container>* {
    flex: 1;
    box-sizing: border-box;
}

/* Scrollbar div that overlaps content */
.scrollbar {
    position: absolute;
    top: 104px;
    right: 10px;
    width: 6px;
    height: 250px;
    /* Same height as .content */
    z-index: 10;
    /* Higher z-index to be on top */
    pointer-events: none;
    /* Prevent interaction with this div */
    background: #ddd;
    border-radius: 15px;
}

/* font */
.font-opensans {
    font-family: 'Roboto', sans-serif;
}

.font-roboto {
    font-family: 'Open Sans', sans-serif;
}

/* 중간 크기 화면 (태블릿)에서의 스타일링 */
@media all and (max-width:1279px) {

    body,
    html {
        touch-action: pan-y;
        /* 확대 및 축소 제스처 비활성화 */
        -ms-touch-action: pan-y;
        -webkit-user-select: none;
        -ms-user-select: none;
        user-select: none;
    }

    .container-wrapper {
        min-width: 0;
    }

    .container {
        flex-wrap: wrap;
        align-content: stretch;
        padding: 5px 10px 0 10px;
        margin: 0;
    }

    .scrollbar {
        height: 130px;
    }
}

@media all and (max-width: 767px) {

    body,
    html {
        touch-action: pan-y;
        /* 확대 및 축소 제스처 비활성화 */
        -ms-touch-action: pan-y;
        -webkit-user-select: none;
        -ms-user-select: none;
        user-select: none;
    }

    .scrollbar {
        height: 160px;
    }
}
</style>
<script setup lang="ts">
import { SpeedInsights } from '@vercel/speed-insights/vue';
</script>