import { PIXI } from "./index"
import { app, DEBUG, debugBoxes, debugContainer } from "./makeStage"
import { GameplayManager } from "./GameplayManager"
import { HexTile, TileType, TileColor, TileState } from "./HexTile"
import { Board } from "./Board"



import { trailTexture, solidTexture } from "./spriteLoader"
import { AutoRope } from "./AutoRope"


console.log("Loaded: Game");

/* Game.ts
 * The basic game structure. Stores the game state and allows transitions between states.
 */

 // IN PROGRESS

// One state for every possible screen, no need to split this into more enums
enum GameState {
  Loading,
  MainMenu,
  InGame,
  Paused
}

enum AssetsToLoad {
  Hexes
}

class Game {  
  static screenToGamespace(coordinates : { x : number, y : number}){
    const position = {x : -1, y : -1};
    position.x = Math.floor(coordinates.x - app.stage.x);
    position.y = Math.floor(coordinates.y - app.stage.y);
    return position;
  }

  // state 
  state : GameState;

  // Object that tracks which assets have been loaded.
  assetsLoaded : any;

  gm : GameplayManager;

  constructor(){
    this.state = GameState.Loading;
    this.assetsLoaded = {};
    this.assetsLoaded[AssetsToLoad.Hexes] = false;
    this.gm = new GameplayManager();
  }

  setLoaded(asset : AssetsToLoad){
    console.log("Loaded Hexes...")
    this.assetsLoaded[asset] = true;
    // If all assets are loaded, then move on:
    this.finishLoading();
  }

  finishLoading(){
    console.log("Done Loading...")
    this.state = GameState.InGame;
    this.gm.startGame();
  }

}

app.stage.sortableChildren = true;

const game = new Game();

debugContainer.zIndex = 5000;

/*
So! Seems like simplerope is sometimes batch rendered, and in that case
the size and start options just straight-up do not work.
*/

const ar = new AutoRope(solidTexture);
debugContainer.addChild(ar.container);
debugContainer.zIndex = 5000;

ar.pushControlPoint({ x: 30, y: 30 } );
ar.pushControlPoint({ x: 200, y: 400 });
ar.pushControlPoint({ x: 100, y: 300 });

ar.progressOnLastSegment(1);
ar.progressOnLastSegment(1);
console.log(ar.rope);

//debugBoxes.ropeSize.value = "" + ar.ropePoints.length + "   " + ar.ropeLength();

// @ts-ignore
console.log(ar.rope.geometry.indexBuffer.data.length);

ar.rope.size = 0;
ar.rope.start = 0;



debugBoxes.ropeStart.onchange = function(e: Event){
  ar.rope.start = parseInt(debugBoxes.ropeStart.value);
}
debugBoxes.ropeSize.onchange = function (e: Event) {
  ar.rope.size = parseInt(debugBoxes.ropeSize.value);
}

export { game, Game, GameState, AssetsToLoad }