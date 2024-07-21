import * as PIXI from 'pixi.js'

console.log("Loaded: makeStage");

/* makeStage.ts
 * Sets up the stage and other basic stuff.
 */


/* Some utility functions for making a table. */
class EasyTable{
  table: HTMLElement;
  constructor(){
    this.table = document.createElement('table');
  }
  startNewRow(){
    this.table.appendChild(document.createElement('tr'));
    return this;
  }
  addCell(content: HTMLElement){
    const td = document.createElement('td');
    td.appendChild(content);
    content.style.width = '100%';
    this.table.lastChild.appendChild(td);
    return this;
  }
}



//Initialize the stage
const app = new PIXI.Application<HTMLCanvasElement>({
    width: window.innerWidth, height: window.innerHeight-100, backgroundColor: 0x115599 
  });
  //, resolution: window.devicePixelRatio || 1 // CAUSES PROBLEMS
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
  ropeSize: document.createElement('input')
}
for (const [key, value] of Object.entries(debugBoxes)) {
  value.placeholder = key;
}


debugDiv.innerHTML = 'Debugging Output<br>';
const table = new EasyTable();
table.table.style.width = '100%';
table.startNewRow().addCell(debugBoxes.hexCoords).addCell(debugBoxes.positionInfo);
table.startNewRow().addCell(debugBoxes.shuffleCoords).addCell(debugBoxes.shufflePositions);
table.startNewRow().addCell(debugBoxes.ropeStart).addCell(debugBoxes.ropeSize);
debugDiv.appendChild(table.table);
document.body.appendChild(debugDiv);

const debugContainer = new PIXI.Container();
app.stage.addChild(debugContainer);

//app.ticker.add((delta) => {});

const DEBUG = true;

export { app, DEBUG, debugBoxes, debugContainer }