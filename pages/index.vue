import companyNews from '~/server/api/company-news';
<template>
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
}

h1,
h2 {
    margin: 5px 20px 20px 20px;
}

.container-wrapper {
    display: flex;
    justify-content: center;
}

.container {
    display: flex;
    justify-content: space-between;
    flex-wrap: wrap;
    padding: 10px;
    margin: 5px 10px 5px 10px;
    box-sizing: border-box;
    width: auto;
    max-width: 100%;
    /* 작은 화면에서 화면 크기에 맞게 축소 */
}

/* 개별 컴포넌트 */
.container>* {
    flex: 1;
    box-sizing: border-box;
    max-height: 820px;
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
    .container-wrapper {
        min-width: 0;
    }

    .container {
        flex-wrap: wrap;
        align-content: stretch;
        padding: 5px 10px 0 10px;
        margin: 0;
    }
}
</style>