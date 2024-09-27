<template>
    <div>
        <div class="box">
            <div class="name font-opensans">Gross Domestic Product (GDP)</div>
            <div class="value font-roboto">21.85B</div>
            <div class="date font-roboto">2024-09-30</div>
        </div>
        <div class="box">
            <div class="name font-opensans">Unemployment Rate</div>
            <div class="value font-roboto">4.3%</div>
            <div class="date font-roboto">2024-09-30</div>
        </div>
        <div class="box">
            <div class="name font-opensans">CPI: All Items in U.S. City Average</div>
            <div class="value font-roboto">275.10 (1982-1984=100)</div>
            <div class="date font-roboto">2024-09-30</div>
        </div>
        <div class="box">
            <div class="name font-opensans">Effective Federal Funds Rate</div>
            <div class="value font-roboto">0.50%</div>
            <div class="date font-roboto">2024-09-30</div>
        </div>
        <div class="box">
            <div class="name font-opensans">Industrial Production Index</div>
            <div class="value font-roboto">112.3 (2017=100)</div>
            <div class="date font-roboto">2024-09-30</div>
        </div>
        <div class="box">
            <div class="name font-opensans">Nonfarm Payrolls</div>
            <div class="value font-roboto">150.5M</div>
            <div class="date font-roboto">2024-09-30</div>
        </div>
        <div class="box">
            <div class="name font-opensans">10-Year Treasury Constant Maturity Rate</div>
            <div class="value font-roboto">1.60%</div>
            <div class="date font-roboto">2024-09-30</div>
        </div>
        <div class="box">
            <div class="name font-opensans">M2 Money Stock</div>
            <div class="value font-roboto">18.5B</div>
            <div class="date font-roboto">2024-09-30</div>
        </div>
        <div class="box">
            <div class="name font-opensans">Retail Sales</div>
            <div class="value font-roboto">590.1M</div>
            <div class="date font-roboto">2024-09-30</div>
        </div>
        <div class="box">
            <div class="name font-opensans">Moody's Baa Corporate Bond Yield Relative to 10-Year
                Treasury Yield</div>
            <div class="value font-roboto">1.10%</div>
            <div class="date font-roboto">2024-09-30</div>
        </div>
        <div class="box">
            <div class="name font-opensans">Housing Starts</div>
            <div class="value font-roboto">1.60 Thousands of Units</div>
            <div class="date font-roboto">2024-09-30</div>
        </div>
        <div class="box">
            <div class="name font-opensans">Average Hourly Earnings of All Employees</div>
            <div class="value font-roboto">30.2 Dollars per Hour</div>
            <div class="date font-roboto">2024-09-30</div>
        </div>
        <div class="box">
            <div class="name font-opensans">Real Gross Domestic Product</div>
            <div class="value font-roboto">21.85B</div>
            <div class="date font-roboto">2024-09-30</div>
        </div>
    </div>
</template>
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
}
</style>