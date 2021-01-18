import { PIXI } from "./index.ts"
import { app, DEBUG, debugBoxes, debugContainer } from "./makeStage.ts"
import { GameplayManager } from "./GameplayManager.ts"
import { HexTile, TileType, TileColor, TileState } from "./HexTile.ts"
import { Board } from "./Board.ts"


console.log("Loaded: Game.ts");

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

let game = new Game();

export { game, Game, GameState, AssetsToLoad }