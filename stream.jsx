const { observable, runInAction, action } = require("mobx");
const { observer } = require("mobx-preact");
const { useEffect, useState, useId } = require("preact/hooks");
const streamStore = require("./StreamStore.js");
const config = require("./ConfigStore.js");
const transformImage = require("./transformImage.js");

module.exports = observer(function({ data }){
    const renderId = useId();
    const videoId = useId();

    useEffect(action(function(){
        //get webcam element
        const video = document.getElementById(videoId);
        video.width = Math.round(config.vw * config.streamWidth);
        video.height = config.vh;

        //create a webcam video canvas for image processing and a render canvas for the transformed image
        const videoCanvas = new OffscreenCanvas(Math.round(config.vw * config.streamWidth), config.vh);
        const videoCtx = videoCanvas.getContext("2d");
        const renderCanvas = new OffscreenCanvas(Math.round(config.vw * config.streamWidth), config.vh);
        const renderCtx = renderCanvas.getContext("2d");
            
        //Konva elements
        const stage = new Konva.Stage({
            container: renderId,
            width: videoCanvas.width,
            height: videoCanvas.height
        });

        const selector = new Konva.Rect({
            x: videoCanvas.width / 4,
            y: videoCanvas.height / 4,
            width: videoCanvas.width / 2,
            height: videoCanvas.height / 2,
            strokeWidth : 0,
            rotateEnabled : false,
            strokeScaleEnabled : false,
            dragBoundFunc: function({ x, y }){ //we don't want people moving box off stage
                const stageSize = stage.size();
                const rectSize = selectorTransformer.size();
            
                if (x < 0) {
                    x = 0;
                }

                if (x > stageSize.width - rectSize.width){
                    x = stageSize.width - rectSize.width;
                }
                
                if (y < 0) {
                    y = 0;
                }

                if (y > stageSize.height - rectSize.height) {
                    y = stageSize.height - rectSize.height;
                }
            
                return { x, y };
            }
        });

        const selectorTransformer = new Konva.Transformer({
            nodes : [selector],
            shouldOverdrawWholeArea : true,
            rotateEnabled : false,
            boundBoxFunc: function (oldBoundBox, newBoundBox) { //we don't want people resizing box off stage
                const stageSize = stage.size();
                let { x, y, width, height } = newBoundBox;

                if(
                    x < 0 || x + width > stageSize.width || 
                    y < 0 || y + height > stageSize.height
                ){
                    selectorTransformer.stopTransform();
                }

                return newBoundBox;
            }
        });

        //Measurement line bindings
        const measurementLine = streamStore.measurementLine = new Konva.Line({
            points : [videoCanvas.width / 2, videoCanvas.height / 4, videoCanvas.width / 2, videoCanvas.height * 3/4],
            strokeWidth : videoCanvas.width * .004,
            stroke : "red",
            rotateEnabled : false,
            strokeScaleEnabled : false,
        });

        const updateLine = function(){
            const { x, y, width, height } = selector.getClientRect();
            measurementLine.points([x + width / 2, y, x + width / 2, y + height]);
        };
        selector.on("dragmove dragend transform", updateLine);


        //Add everything to a renderer layer
        const renderLayer = new Konva.Layer();
        stage.add(renderLayer);

        const renderImage = new Konva.Image({ 
            x : 0,
            y : 0,
            width : videoCanvas.width,
            height : videoCanvas.height,
            image : renderCanvas
        });

        renderLayer.add(renderImage);
        renderLayer.add(selector);
        renderLayer.add(measurementLine);
        renderLayer.add(selectorTransformer);

        renderLayer.draw();

        //Grab webcam stream and start rendering
        navigator.mediaDevices.getUserMedia({ video: true }).then(function(stream){
            video.srcObject = stream;
            video.play();

            video.addEventListener("loadeddata", function(){
                //Get video dimensions and calculate config values
                config.measureHeight = video.height * (videoCanvas.width / video.width);
                config.heightZoom = video.height / config.measureHeight;
                config.widthZoom = video.width / videoCanvas.width;

                //resize stage to fit video
                stage.height(config.measureHeight);

                const renderFrame = async function(){
                    //let now = Date.now();
                    
                    //draw video to canvas
                    videoCtx.drawImage(await createImageBitmap(video), 0, 0, videoCanvas.width, config.measureHeight); //draw image to fit to width using ratio
                    
                    //transform image
                    const imageData = await transformImage({
                        width : Math.round(config.vw * config.streamWidth),
                        height : config.measureHeight,
                        image : videoCtx.getImageData(0, 0, videoCanvas.width, config.measureHeight).data
                    }); 
                    
                    //draw transformed image to render canvas
                    renderCtx.putImageData(imageData, 0, 0, 0, 0, videoCanvas.width, config.measureHeight);

                    //store image data to trigger measurement
                    streamStore.imageData = imageData;
                    
                    //draw render canvas to stage
                    renderLayer.batchDraw();

                    //console.log("Frame render: " + (Date.now() - now));
                    
                    window.requestAnimationFrame(renderFrame);
                }

                renderFrame();
            });
        });
    }));

    return <>
        <style jsx>
            {`
                .stream {
                    height: 100%;
                }

                #${videoId}{
                    display: none;
                }
            `}
		</style>
        <div className="stream">
            <video id={videoId} autoplay></video>
            <div id={renderId}></div>
        </div>  
    </>
});