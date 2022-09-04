import { PIXI } from "./index"
import { app, DEBUG, debugBoxes, debugContainer } from "./makeStage"
import { HexTile, TileType, TileColor, TileState } from "./HexTile"
import { Board } from "./Board"
import { Shuffle } from "./Shuffle"
import { game, Game, GameState } from "./Game"
import { createBoard } from "./testBoard"


console.log("Loaded: GameplayManager");

/* GameplayManager.ts
 * The gameplay manager (GM) looks at user input and triggers game events.
 * Its job is essentially to manage listeners and keep track of shuffles and clusters.
 * (Clusters not yet implemented.)
 * It also does most of the tick delegation.
 */

class GameplayManager {
  static MOUSE_DELAY : number = 1; //sixtieths of a second between actions in MouseMove.

  // The game board
  board : Board;
  // The shuffle currently being built, if any.
  activeShuffle : Shuffle | null;
  // Other shuffles that are completed, but are still shuffling.
  inactiveShuffles : Shuffle[];

  // Debugging info
  db : any;
  
  // Mouse variables
  // mouseData keeps the last recorded position from mouseMove and whether the left mouse is down
  mouseData : {x : number,  y : number, down : boolean };
  timeSinceLastMouseUpdate : number;
  // true if it's okay to update the mouse info
  readyForUpdate : boolean;

  constructor(){
    this.activeShuffle = null;
    this.inactiveShuffles = [];
    this.db = null;

    this.mouseData = { x : 0, y : 0, down : false };
    this.readyForUpdate = true;
    this.timeSinceLastMouseUpdate = 0;
  }

  // startGame //
  // This should be split up between here and Game.ts.
  startGame(){
    this.board = createBoard();
    app.stage.addChild(this.board.container);

    // set up listeners
    //document.onmousemove = this.mouseMove;
    document.onmousedown = mouseDown;
    document.onmouseup = mouseUp;
    document.onmouseout = mouseUp;
    document.onmousemove = mouseMove;

    app.ticker.add(function(delta : number){ game.gm.tick(delta); });
  }

  // tick //
  tick(delta : number){
    // Tick the tiles
    for (let n = 0; n < this.board.activeTiles.length; n++){
      //console.log(n);
      this.board.activeTiles[n].tick(delta);
    }

    // Tick the shuffles.
    if (this.activeShuffle !== null){
      this.activeShuffle.tick(delta);
    }
    this.inactiveShuffles.forEach(shuffle => shuffle.tick(delta));

    if(this.timeSinceLastMouseUpdate + delta >= GameplayManager.MOUSE_DELAY){
      //if (this.readyForUpdate == false){
        //console.log("FPS:" + app.ticker.FPS.toString());
        //console.log("delta:" + delta.toString());
        //console.log("speed:" + app.ticker.speed.toString());
      //}
      this.readyForUpdate = true;
    }else{
      this.timeSinceLastMouseUpdate += delta;
    }
  }

  // getCurrentLocation //
  // Returns the location of the tile that the mouse is over,
  // according to this.mouseData.
  // The board is extended indefinitely, so coordinates may be outside the actual board.
  getCurrentLocation(){
    return this.board.getTileLocation(this.mouseData);
  }

  // getCurrentTile //
  // Get the tile that the mouse is currently over, or null if there is no such tile.
  getCurrentTile(){
    return this.board.getTile(this.getCurrentLocation());
  }

  // mouseClearlyOnTile //
  // Checks whether the mouse is close enough to the center of a tile to be considered "on it".
  mouseClearlyOnTile(){
    return (this.board.getDistanceToTileCenter(this.mouseData) < 0.45*HexTile.getSpriteColumnWidth());
  }

  // updateMouse //
  // Sets mouseData to the current mouse coordinates.
  updateMouse(event : MouseEvent){
    this.mouseData.x = event.x;
    this.mouseData.y = event.y;
    this.mouseData.down = (event.buttons % 2 == 1);
    this.readyForUpdate = false;
    this.timeSinceLastMouseUpdate = 0;
  }

  // startShuffle //
  // Create a new shuffle for activeShuffle, assuming there is no current active shuffle.
  startShuffle(){
    const currentTile = this.getCurrentTile();
    if (currentTile !== null && currentTile.isReadyToSwap){
      // Create a new shuffle with leader
      if (this.activeShuffle !== null){
        // This shouldn't be possible.
        // User can't start a new shuffle without triggering endShuffle.
        console.error("GM.startShuffle: activeShuffle is replaced!");
        this.inactiveShuffles.push(this.activeShuffle);
      }

      if (!currentTile.hasOwner()){
        this.activeShuffle = new Shuffle(currentTile);
      }
    }
  }

  // endShuffle //
  // End the active shuffle and make it inactive.
  endShuffle(){
    if(this.activeShuffle !== null){
      //console.log(this.activeShuffle.path.length);
      this.activeShuffle.complete();
      this.inactiveShuffles.push(this.activeShuffle);
      this.activeShuffle = null;
    }
  }

  // giveToShuffle //
  // This sends the currently moused-over tile to activeShuffle, in case it wants to add that tile.
  giveToShuffle(){
    if(this.activeShuffle !== null){
      //console.log("Trying to add");
      if (this.mouseClearlyOnTile() == true){
        //console.log(Math.floor(this.board.getDistanceToTileCenter(this.mouseData)).toString() + " < " + Math.floor(0.2*HexTile.getSpriteColumnWidth()).toString());
        // Only send the tile to the shuffle if mouse is near center of some tile
        this.activeShuffle.encounterTile(this.getCurrentLocation());
      }
    }
  }

  // For debugging...
  debug(){
    if (DEBUG){
      // Show coordinates of tile
      const index = this.board.getTileLocation(this.mouseData);
      debugBoxes.hexCoords.value = "(" + index.i.toString() + ", " + index.j.toString() + ")";
      if (this.activeShuffle !== null){
        debugBoxes.shuffleCoords.value = this.activeShuffle.toString();
        debugBoxes.shufflePositions.value = this.activeShuffle.listCoordinates();
      }
      debugBoxes.positionInfo.value = Math.floor(this.board.getDistanceToTileCenter(this.mouseData)).toString();
    }
  }
}


function mouseMove(event : MouseEvent){
  const gm = game.gm;
  if (gm.readyForUpdate){
    gm.updateMouse(event);

    if (gm.mouseData.down){
      gm.giveToShuffle();
    }
    gm.debug();
  }
}

function mouseDown(event : MouseEvent){
  const gm = game.gm;
  gm.updateMouse(event);
  if (gm.board.coordinatesOverBoard(event)){
    gm.startShuffle();
  }
}

function mouseUp(event : MouseEvent){
  const gm = game.gm;
  gm.updateMouse(event);
  gm.endShuffle();
}




export { GameplayManager }