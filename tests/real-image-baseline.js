"use strict";

const TVD_REAL_IMAGE_BASELINE = Object.freeze({
    version: "2.0.0",
    valueSets: Object.freeze([[2, 5, 8], [1, 3, 5, 7, 9]]),
    fixtures: Object.freeze([
        { file: "portrait-scooter.jpg", expected: {
            file: "portrait-scooter.jpg", width: 1253, height: 1174, sourceHash: "007f4d89",
            maps: [
                { values: "2,5,8", hash: "01589712", histogram: [[31,490445],[106,558255],[194,422322]] },
                { values: "1,3,5,7,9", hash: "71a3c97d", histogram: [[1,169268],[54,443924],[106,336662],[163,353174],[224,167994]] }
            ]
        } },
        { file: "blue-jay.png", expected: {
            file: "blue-jay.png", width: 1024, height: 1024, sourceHash: "1ccdab23",
            maps: [
                { values: "2,5,8", hash: "77bcb9ad", histogram: [[31,55428],[106,541475],[194,451673]] },
                { values: "1,3,5,7,9", hash: "80cdea23", histogram: [[1,22610],[54,52079],[106,357410],[163,491826],[224,124651]] }
            ]
        } },
        { file: "cascade-hiker.png", expected: {
            file: "cascade-hiker.png", width: 712, height: 713, sourceHash: "29c3c2e3",
            maps: [
                { values: "2,5,8", hash: "b7c5adea", histogram: [[31,191277],[106,190529],[194,125850]] },
                { values: "1,3,5,7,9", hash: "abf8a240", histogram: [[1,64588],[54,164674],[106,127962],[163,78187],[224,72245]] }
            ]
        } },
        { file: "teton-crest.png", expected: {
            file: "teton-crest.png", width: 3464, height: 2475, sourceHash: "0bd6434d",
            maps: [
                { values: "2,5,8", hash: "6839b4fa", histogram: [[31,3210857],[106,1134477],[194,4228066]] },
                { values: "1,3,5,7,9", hash: "772f1e9d", histogram: [[1,2221712],[54,1210986],[106,712920],[163,1213856],[224,3213926]] }
            ]
        } },
        { file: "sunset-water.jpg", expected: {
            file: "sunset-water.jpg", width: 3024, height: 2016, sourceHash: "7db379a1",
            maps: [
                { values: "2,5,8", hash: "48084eca", histogram: [[31,37743],[106,1943803],[194,4114838]] },
                { values: "1,3,5,7,9", hash: "286a8bf8", histogram: [[1,5968],[54,216236],[106,814954],[163,3976023],[224,1083203]] }
            ]
        } }
    ])
});

export default TVD_REAL_IMAGE_BASELINE;
