<template>
    <div class="container">
        <h1 :class="{ 'color-animation': animateH1 }">Economic <br />Indicators</h1>
        <div class="content" @scroll="handleScroll">
            <div v-if="items">
                <div v-for="item in items" :key="item.name" class="box">
                    <div class="name font-opensans">{{ item.name }}</div>
                    <div class="value font-roboto">{{ item.value }}</div>
                    <div class="date font-roboto">{{ item.date }}</div>
                </div>
            </div>
            <div v-else>
                <InitEconomicIndicators />
            </div>
        </div>
        <div class="scrollbar" v-show="showScrollbar"></div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useFetch } from '#app'

const items = ref(null)
const animateH1 = ref(false)
const showScrollbar = ref(true)

const handleScroll = () => {
    showScrollbar.value = false
}

const fetch = async () => {
    animateH1.value = true
    const { data } = await useFetch('/api/economic-indicators', {
        retry: false
    })

    if (!data.value) {
        return setTimeout(fetch, 1000)
    }

    items.value = data.value

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
    }, 600000) // 10분

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
    max-width: 330px;
    display: block;
    justify-content: left;
    position: relative;
    border-right: 2px solid #666;
}

.content {
    overflow-y: auto;
    height: 690px;
    margin: 0 20px 0 0;
    line-height: 22px;

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

.scrollbar {
    right: 30px;
}

/* 중간 크기 화면 (태블릿)에서의 스타일링 */
@media all and (max-width:1279px) {
    .content {
        max-height: 800px;
    }
}

/* 일반적인 모바일 기기 (아이폰, 갤럭시 등) 타겟팅 */
@media all and (max-width: 767px) {
    .container {
        max-width: 100%;
        margin: 10px 5px 25px 5px;
        border-right: 0;
    }

    .content {
        max-height: 700px;
        margin: 20px 5px 0 0;
    }

    .scrollbar {
        top: 100px;
        right: 7px;
    }
}
</style>