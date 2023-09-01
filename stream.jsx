const { observable, runInAction, action } = require("mobx");
const { observer } = require("mobx-preact");
const { useEffect, useState, useId } = require("preact/hooks");
const streamStore = require("./StreamStore.js");
const config = require("./ConfigStore.js");
const transformImage = require("./transformImage.js");
const { render } = require("preact");

module.exports = observer(function({ data }){
    const renderId = useId();
    const videoId = useId();

    useEffect(function(){
        //Grab webcam stream and start rendering
        navigator.mediaDevices.getUserMedia({ video: true }).then(action(function(stream){
            const streamSettings = stream.getTracks()[0].getSettings();

            //get webcam element
            const video = document.getElementById(videoId);
            video.width = streamSettings.width;
            video.height = streamSettings.height;

            //create a webcam video canvas for image processing
            const videoCanvas = new OffscreenCanvas(video.width, video.height);
            const videoCtx = videoCanvas.getContext("2d");
            
            //Get video dimensions and calculate config values
            const renderWidth = config.renderWidth = Math.round(config.vw * config.streamWidth);
            config.renderHeight = Math.round(renderWidth / (config.vw / config.vh));

            //create a transform video canvas for upscaling video stream
            const transformCanvas = new OffscreenCanvas(video.width, video.height);
            const transformCtx = transformCanvas.getContext("2d");

            //create a render canvas for the transformed image
            const renderCanvas = new OffscreenCanvas(config.renderWidth, config.renderHeight);
            const renderCtx = renderCanvas.getContext("2d");
                
            //Konva elements
            const stage = new Konva.Stage({
                container: renderId,
                width: renderCanvas.width,
                height: renderCanvas.height
            });

            const selector = new Konva.Rect({
                x: renderCanvas.width / 4,
                y: renderCanvas.height / 4,
                width: renderCanvas.width / 2,
                height: renderCanvas.height / 2,
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
                points : [renderCanvas.width / 2, renderCanvas.height / 4, renderCanvas.width / 2, renderCanvas.height * 3/4],
                strokeWidth : renderCanvas.width * .004,
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
            renderLayer.add(new Konva.Image({ 
                x : 0,
                y : 0,
                width : renderCanvas.width,
                height : renderCanvas.height,
                image : renderCanvas
            }));
            renderLayer.add(selector);
            renderLayer.add(measurementLine);
            renderLayer.add(selectorTransformer);
            renderLayer.draw();

    
            //start video stream playbacck
            video.srcObject = stream;
            video.play();
            video.addEventListener("loadeddata", function(){
                const renderFrame = async function(){
                    //let now = Date.now();
                    
                    //draw video to canvas
                    videoCtx.drawImage(await createImageBitmap(video), 0, 0, video.width, video.height); //draw image to fit to width using ratio
                    
                    //transform image
                    const imageData = await transformImage({
                        width : video.width,
                        height : video.height,
                        image : videoCtx.getImageData(0, 0, video.width, video.height).data
                    }); 
                    
                    transformCtx.putImageData(imageData, 0, 0);
                    
                    //draw transformed image to render canvas
                    renderCtx.drawImage(transformCanvas, 0, 0, config.renderWidth, config.renderHeight);
                    
                    //draw render canvas to stage
                    renderLayer.batchDraw();

                    runInAction(function(){
                        //store image data to trigger measurement
                        streamStore.imageData = renderCtx.getImageData(0, 0, config.renderWidth, config.renderHeight);
                    })

                    //console.log("Frame render: " + (Date.now() - now));
                    
                    window.requestAnimationFrame(renderFrame);
                }

                renderFrame();
            });
        }));
    });

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