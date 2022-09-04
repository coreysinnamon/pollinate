import { PIXI } from "./index"


console.log("Loaded: makeStage");

/* makeStage.ts
 * Sets up the stage and other basic stuff.
 */

//Initialize the stage
const app = new PIXI.Application({
    width: window.innerWidth, height: window.innerHeight-100, backgroundColor: 0x115599, resolution: window.devicePixelRatio || 1
  });
document.body.appendChild(app.view);

// Set style properties, making the canvas fill the entire page exactly
app.view.style.position = "absolute";
app.view.style.top = "0";
app.view.style.bottom = "0";
app.view.style.left = "0";
app.view.style.right = "0";



const debugDiv = document.createElement('div');
debugDiv.style.position = "fixed";
debugDiv.style.top = (window.innerHeight-130).toString() + "px";
debugDiv.style.width = "100%";
const debugBoxes = {
  hexCoords : document.createElement('input'),
  positionInfo : document.createElement('input'),
  shuffleCoords : document.createElement('input'),
  shufflePositions : document.createElement('input'),
  ropeStart: document.createElement('input'),
  ropeSize: document.createElement('input'),
}
debugDiv.innerHTML = 'Debugging Output<br>';
debugDiv.appendChild(debugBoxes.hexCoords);
debugDiv.appendChild(debugBoxes.positionInfo);
debugDiv.appendChild(document.createElement("br"));
debugDiv.appendChild(debugBoxes.shuffleCoords);
debugDiv.appendChild(debugBoxes.shufflePositions);
debugDiv.appendChild(document.createElement("br"));
debugDiv.appendChild(debugBoxes.ropeStart);
debugDiv.appendChild(debugBoxes.ropeSize);

debugBoxes.shuffleCoords.style.width = "50%";
debugBoxes.shufflePositions.style.width = "50%";
debugBoxes.ropeStart.style.width = "50%";
debugBoxes.ropeSize.style.width = "50%";

document.body.appendChild(debugDiv);



const debugContainer = new PIXI.Container();
app.stage.addChild(debugContainer);

//app.ticker.add((delta) => {});

const DEBUG = true;

export { app, DEBUG, debugBoxes, debugContainer }