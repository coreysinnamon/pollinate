import { PIXI } from "./index"
import { app, DEBUG, debugBoxes, debugContainer } from "./makeStage"
import { HexTile, TileType, TileColor, TileState } from "./HexTile"
import { AbstractBoard } from "./AbstractBoard"
import { game, Game, GameState } from "./Game"
import { Board } from "./Board"


console.log("Loaded: testBoard");

// Temporary: For debugging.

function createBoard(){
  const gridWidth = 6;
  const gridHeight = 8;
  const w = app.screen.width*0.95;
  const h = app.screen.height*0.7;
  const x = (app.screen.width - w)/2;
  const y = (app.screen.height - h)/2;


  const board = new Board(x, y, w, h, gridWidth, gridHeight);
  board.randomGrid();
  //board.printShape();

  board.addSpritesToBoard();
  //board.showFrame();
  board.showIdealHexes();
  return board;
}


export { createBoard }

