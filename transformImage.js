
//SOURCE: https://github.com/miguelmota/sobel/blob/master/sobel.js
//Had to significantly optimize their method

const worker = new Worker(URL.createObjectURL(new Blob([
    `
    const kernelX = [
        [-1,0,1],
        [-2,0,2],
        [-1,0,1]
    ];

    const kernelY = [
        [-1,-2,-1],
        [0,0,0],
        [1,2,1]
    ];

    const kernalX1 = kernelX[0][0];
    const kernalX2 = kernelX[0][1];
    const kernalX3 = kernelX[0][2];
    const kernalX4 = kernelX[1][0];
    const kernalX5 = kernelX[1][1];
    const kernalX6 = kernelX[1][2];
    const kernalX7 = kernelX[2][0];
    const kernalX8 = kernelX[2][1];
    const kernalX9 = kernelX[2][2];

    const kernalY1 = kernelY[0][0];
    const kernalY2 = kernelY[0][1];
    const kernalY3 = kernelY[0][2];
    const kernalY4 = kernelY[1][0];
    const kernalY5 = kernelY[1][1];
    const kernalY6 = kernelY[1][2];
    const kernalY7 = kernelY[2][0];
    const kernalY8 = kernelY[2][1];
    const kernalY9 = kernelY[2][2];
    
    self.onmessage = ${function({ data }){
        const { image : imageData, width : imageWidth, height : imageHeight } = data;
        const imageDataLength = imageData.length;

        const redChannel = new Uint8ClampedArray(imageDataLength);
        const sobel = new Uint8ClampedArray(imageDataLength);

        for(let i = 0; i < imageDataLength; i += 4) {
            redChannel[i] = imageData[i];
            redChannel[i + 1] = imageData[i];
            redChannel[i + 2] = imageData[i];
            redChannel[i + 3] = 255;
        }
        
        //const now = Date.now();
        let index = 0;

        for (let y = 0; y < imageHeight; y++) {
            const yLeft = imageWidth * (y-1);
            const yCenter = imageWidth * y;
            const yRight = imageWidth * (y+1);

            for (let x = 0; x < imageWidth; x++) {
                const xLeft = (x-1);
                const xRight = (x+1);

                const c1 = redChannel[(yLeft + xLeft) * 4];
                const c2 = redChannel[(yLeft + x) * 4];
                const c3 = redChannel[(yLeft + xRight) * 4];
                const c4 = redChannel[(yCenter + xLeft) * 4];
                const c5 = redChannel[(yCenter + x) * 4];
                const c6 = redChannel[(yCenter + xRight) * 4];
                const c7 = redChannel[(yRight + xLeft) * 4];
                const c8 = redChannel[(yRight + x) * 4];
                const c9 = redChannel[(yRight + xRight) * 4];

                const pixelX = (
                    (kernalX4 * c4) + //-2
                    (kernalX1 * (c1 + c7)) + //-1
                    (kernalX2 * (c2 + c5 + c8)) + //0
                    (kernalX3 * (c3 + c9)) + //1
                    (kernalX6 * c6) //2
                );

                const pixelY = (
                    (kernalY2 * c2) + //-2
                    (kernalY1 * (c1 + c3)) + //-1
                    (kernalY4 * (c4 + c5 + c6)) + //0
                    (kernalY7 * (c7 + c9)) + //1
                    (kernalY8 * c8) //2
                );

                const magnitude = Math.sqrt((pixelX * pixelX) + (pixelY * pixelY))>>>0;
                sobel[index] = magnitude;
                sobel[index + 1] = magnitude;
                sobel[index + 2] = magnitude;
                sobel[index + 3] = 255;
                index +=4;
            }
        }

        //console.log("Transform: " + (Date.now() - now));
        postMessage(sobel, [sobel.buffer]);
    }}`
], { type : "text/javascript" })));

module.exports = async function({ image : imageData, width : imageWidth, height : imageHeight }){
    return new Promise(function(resolve){
        worker.onmessage = function(e) {
            resolve(new ImageData(e.data, imageWidth, imageHeight));
        };
    
        worker.postMessage({ image : imageData, width : imageWidth, height : imageHeight }, [imageData.buffer]);
    });
}
