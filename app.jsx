const { observable, runInAction, action } = require("mobx");
const { observer } = require("mobx-preact");
const Stream = require("./stream.jsx");
const Measurement = require("./measurement.jsx");
const config = require("./ConfigStore.js");
const { useEffect } = require("react");

//Set the config values for the app viewport width and height
runInAction(function(){
    config.backgroundColor = "#b5c8d7";
    config.vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
    config.vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
    config.streamWidth = 0.8;
})

module.exports = observer(function({ data }){
    useEffect(action(function(){
        document.body.style.margin = "0px";
        document.body.style.backgroundColor = config.backgroundColor;
    }));
    
    return <>
        <style jsx>
            {`
                .console {
                    display: flex;
                    flex-direction: row;
                    width: 100vw;
                    height: 100vh;
                }
            `}
		</style>
        <div className="console">
            <Stream />
            <Measurement />
        </div>  
    </>
});