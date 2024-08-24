<template>
    <div class="container-wrapper">
        <div class="container">
            <Treemap />
            <EconomicIndicators />
        </div>
    </div>
</template>

<style>
body {
    margin: 0;
    font-family: Arial, sans-serif;
    background-color: #111;
    color: #fff;
}

.container-wrapper {
    display: flex;
    justify-content: center;
    align-items: center;
}

.container {
    display: flex;
    justify-content: space-between;
    padding: 20px;
    box-sizing: border-box;
    width: auto;
    max-width: 100%;
    /* 작은 화면에서 화면 크기에 맞게 축소 */
}

/* 개별 컴포넌트 */
.container>* {
    flex: 1;
    box-sizing: border-box;
    margin: 0 10px;
    /* 각 컴포넌트 사이의 여백 */
}

/* 작은 화면 (모바일)에서의 스타일링 */
@media (max-width: 600px) {
    .container {
        flex-direction: column;
        align-items: center;
    }

    .container>* {
        margin: 10px 0;
        width: 100%;
        /* 작은 화면에서 전체 너비 사용 */
    }
}

/* 중간 크기 화면 (태블릿)에서의 스타일링 */
@media (min-width: 601px) and (max-width: 1024px) {
    .container {
        flex-direction: column;
        align-items: center;
    }

    .container>* {
        margin: 15px 0;
        width: 100%;
        /* 태블릿 화면에서 전체 너비 사용 */
    }
}
</style>