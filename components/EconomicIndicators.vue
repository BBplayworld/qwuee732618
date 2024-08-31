<template>
    <div class="container">
        <h1 :class="{ 'color-animation': animateH1 }">Economic <br />Indicators</h1>
        <div class="content">
            <div v-if="result">
                <div v-for="item in result" :key="item.name" class="box">
                    <div class="name font-opensans">{{ item.name }}</div>
                    <div class="value font-roboto">{{ item.value }}</div>
                    <div class="date font-roboto">{{ item.date }}</div>
                </div>
            </div>
            <div v-else>
                <p>Loading...</p>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useFetch } from '#app'

const result = ref(null)
const animateH1 = ref(false)

const fetch = async () => {
    animateH1.value = true
    const { data } = await useFetch('/api/economicIndicators', {
        retry: false
    })

    if (!data.value) {
        return setTimeout(fetch, 1000)
    }

    result.value = data.value

    // Stop the animation after it's done
    setTimeout(() => {
        animateH1.value = false
    }, 3000)  // Duration of the animation in ms       
}

onMounted(async () => {
    fetch() // 페이지가 로드될 때 최초 데이터 가져오기

    // 1분마다 데이터 갱신
    const interval = setInterval(() => {
        fetch()
    }, 80000) // 1분 20초

    // 컴포넌트가 언마운트될 때 interval 정리
    onUnmounted(() => {
        clearInterval(interval)
    })
})
</script>

<style scoped>
@keyframes textColorChange {
    0% {
        color: white;
    }

    50% {
        color: #d73232;
    }

    100% {
        color: white;
    }
}

.color-animation {
    animation: textColorChange 4s ease-in-out;
}

.container {
    max-width: 400px;
    display: block;
    justify-content: left;
}

.content {
    overflow-y: scroll;
    height: 690px;

    -webkit-overflow-scrolling: touch;

    /* WebKit 기반 브라우저 (Chrome, Safari, Whale)에서 스크롤바 스타일링 */
    &::-webkit-scrollbar {
        width: 5px;
    }

    &::-webkit-scrollbar-thumb {
        background-color: #111;
        border-radius: 6px;
        border: 3px solid #ddd;
    }

    &::-webkit-scrollbar-track {
        background-color: #111;
        border-radius: 6px;
    }
}

/* Box */
.box {
    background-color: #1a1a1a;
    border-radius: 7px;
    padding: 15px;
    color: white;
    /* 너비를 고정하여 일정한 크기의 박스 유지 */
    text-align: center;
    margin-bottom: 10px;
}

.box .name {
    font-size: 18px;
    font-weight: bold;
    padding: 10px 0;
    border-radius: 8px 8px 0 0;
}

.box .value {
    font-size: 18.5px;
    color: #d73232;
    /* 중간 강조 색상 */
    margin: 8px 0;
    font-weight: bold;
}

.box .date {
    font-size: 14px;
    background-color: #e0e0e0;
    color: black;
    padding: 10px 0;
    border-radius: 0 0 8px 8px;
    font-weight: bold;
}

/* 중간 크기 화면 (태블릿)에서의 스타일링 */
@media all and (max-width:1279px) {
    .container {
        max-width: 100%;
        margin: 0 10px 20px 0;
    }

    .content {
        max-height: 350px;
    }
}

/* 아이패드에서 스크롤 문제 해결을 위한 추가 스타일 */
@supports (-webkit-touch-callout: none) {
    .content {
        overflow-y: scroll !important;
        /* 스크롤이 항상 표시되도록 보장 */
        -webkit-overflow-scrolling: touch;
    }
}

/* 아이패드에서 스크롤 문제 해결을 위한 추가 스타일 */
@supports (-webkit-touch-callout: none) {
    .content {
        overflow-y: scroll !important;
        /* 스크롤이 항상 표시되도록 보장 */
        -webkit-overflow-scrolling: touch;
    }
}
</style>