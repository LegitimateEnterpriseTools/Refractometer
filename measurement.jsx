const { observable, runInAction, autorun, action } = require("mobx");
const { observer } = require("mobx-preact");
const Konva = require("konva");
const { ResponsiveBarCanvas  } = require("@nivo/bar");
const { TextField } = require("@material-ui/core");


const streamStore = require("./StreamStore.js");
const config = require("./ConfigStore.js");

const measurement = observable({
    data : [], //vector data
    value : 0, //current measurement value
    min : 0, //minimum measurement value
    max : 10 //maximum measurement value
});

const measure = function(){
    if(!streamStore.imageData || !streamStore.measurementLine.points().length){
        return
    }

    const [x1, y1, x2, y2] = streamStore.measurementLine.points().map(Math.round);

    const vector = [];

    let index = 0;
    let maxIndex = 0;
    let currentMax = 0;
    let imageWidth = streamStore.imageData.width;
    let imageData = streamStore.imageData;

    for(let y = y1; y <= y2; y++){
        const value = ([-4, -3, -2, -1, 0, 1, 2, 3, 4].reduce(function(acc, val){
            return acc + imageData.data[(y * imageWidth + x1 + val) * 4];
        }, 0) / 9) || 1;

        vector.push({
            x : index++,
            value,
            right : (255 - value),
            width : 1
        });

        if(vector[vector.length - 1].value > currentMax){
            currentMax = vector[vector.length - 1].value;
            maxIndex = index - 1;
        }
    }

    let search = vector.slice(0, maxIndex + 1).reverse();
    let measured = vector[search.length - 1 - search.findIndex(function({ value }, index){
        return search[index + 1]?.value < currentMax / 2;
    })]
    
    measured.threshhold = true;

    //set measurement value to trigger render
    runInAction(function(){ //Basic idea is to get the percentage of the measured value relative to the pixel vector measurement line and multiply it by the user measurement range
        measurement.value = (1 - (measured.x / (y2 - y1))) * (measurement.max - measurement.min);
        measurement.data = vector;
    });
};

autorun(measure); //measure on every image update

//since the chart is rendered on every image update, we need this to be a standalone rendered component
const Chart = observer(function({ data }){
    if(!data.length){
        return <></>
    }
    return <ResponsiveBarCanvas
        data={data}
        keys={[
            "value",
            "right"
        ]}
        indexBy="x"
        padding={0}
        innerPadding={0}
        minValue="0"
        maxValue="255"
        groupMode="stacked"
        layout="horizontal"
        reverse={false}
        valueScale={{ type: 'linear' }}
        indexScale={{ type: 'band', round: false }}
        colorBy="id"
        borderWidth={0}
        borderRadius={0}
        axisRight={null}
        enableGridX={false}
        enableGridY={false}
        enableLabel={false}
        isInteractive={false}
        colors={function(e){
            if(e.data.threshhold){
                return "red";
            }

            if(e.id === "value"){
                return "black";
            }

            return "rgba(0, 0, 0, 0)";
        }}
    />
});

module.exports = observer(function({ data }){
    return <>
        <style jsx>
            {`
                .measurement {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    height: ${config.measureHeight}px;
                    background-color: #b5c8d7;
                    position: relative;
                    margin-left: -1px;
                }

                .measurement-max {
                    padding: 1vh 1vh 0;
                }

                .measurement-min {
                    border-top: 1px solid rgba(0, 0, 0, 0.42);
                    padding: 0 1vh;
                }

                .chart {
                    border-left: transparent 4px solid;
                    transform: rotate(180deg) scaleX(-1);
                    flex: 1;
                }

                .overlay {
                    pointer-events: none;
                    position: absolute;
                    height: 100%;
                    width: 100%;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                }

                .measurement-value {
                    pointer-events: auto;
                    font-size: 4vh;
                    color: white;
                    font-weight: bold;
                    padding: 2vw;
                    background-color: rgba(0, 0, 0, 0.5);
                    font-family: Verdana;
                    text-shadow: 2px 2px 20px black;
                }
            `}
		</style>
        <div className="measurement">
            <div className="measurement-max">
                <TextField 
                    id="filled-basic" 
                    label="Maximum measurement value"
                    value={measurement.max}
                    onChange={action(function(e){
                        measurement.max = e.target.value || 10;
                    })}
                    InputLabelProps={{
                        style: { 
                            fontSize: "2vh"
                        }
                    }}
                    inputProps={{
                        style: { 
                            fontSize: "3vh" 
                        }
                    }}
                    fullWidth
                />
            </div>
            <div className="chart">
                <Chart data={measurement.data}/>
            </div>
            <div className="measurement-min">
                <TextField 
                    id="filled-basic" 
                    label="Minimum measurement value"
                    value={measurement.min}
                    onChange={action(function(e){
                        measurement.min = e.target.value || 0;
                    })}
                    InputLabelProps={{
                        style: { 
                            fontSize: "2vh"
                        }
                    }}
                    inputProps={{
                        style: { 
                            fontSize: "3vh" 
                        }
                    }}
                    fullWidth
                />
            </div>
            <div className="overlay">
                <div className="measurement-value">
                    {measurement.value.toFixed(2)}
                </div>
            </div>
        </div>  
    </>
});