const preact = require("preact");
const { observable, runInAction, action } = require("mobx");
const { observer } = require("mobx-preact");
const App = require("./app.jsx");

preact.render(<App />, document.getElementById("App"));
