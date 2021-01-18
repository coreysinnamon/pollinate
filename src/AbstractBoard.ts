import { PIXI } from "./index.ts"
import { app, DEBUG, debugBoxes, debugContainer } from "./makeStage.ts"
import { HexTile, TileType, TileColor, TileState } from "./HexTile.ts"

console.log("Loaded: AbstractBoard.ts");

/* AbstractBoard.ts
 * Implements the AbstractBoard class, which consists of a grid in a hexagonal tiling of the plane.
 * One "rectangular" grid is populated with HexTiles (or null, if that tile is missing).
 * The hex grid is implemented as a 2d array.
 * If "H" represents a hexagon, the grid looks like this:
 *  H H H H H H H H H H H H
 *   H H H H H H H H H H H H
 *  H H H H H H H H H H H H
 *   H H H H H H H H H H H H
 *  H H H H H H H H H H H H
 *   H H H H H H H H H H H H
 *  H H H H H H H H H H H H
 *   H H H H H H H H H H H H
 * For coordinates, use ( i = column, j = row), where a row of hexagons has horizontally-aligned centers.
 * In other words, each line of H's above is a row. Integer i is the row number (increasing top to bottom, starting from 0).
 * Within each row, a hexagon is in its own column. Integer j is the column number (increasing left to right, starting from 0).
 * Coordinates (i, j) are called a "hex location".
 */

 type HexLocation = { i : number, j : number };

class AbstractBoard {
  gridWidth : number;
  gridHeight : number;
  grid : HexTile[][];

  constructor(gridWidth : number, gridHeight : number) {
    this.gridWidth = gridWidth;
    this.gridHeight = gridHeight;

    this.grid = new Array(this.gridWidth);
    for (let i = 0; i < this.gridWidth; i++){
      this.grid[i] = new Array(this.gridHeight);
      for (let j = 0; j < this.gridHeight; j++){
        this.grid[i][j] = new HexTile(i, j);
      }
    }
  }

  // getTile //
  // Return tile at the given location, if there is one. Else return null.
  getTile(coords : HexLocation){
    if (coords.i >= 0 && coords.j >= 0
        && coords.i < this.gridWidth
        && coords.j < this.gridHeight){
      return this.grid[coords.i][coords.j];
    }
    return null;
  }

  // swapTiles //
  // Exchange tiles s and t, both assumed not null.
  swapTiles(s : HexTile, t : HexTile){
    this.grid[s.location.i][s.location.j] = t;
    this.grid[t.location.i][t.location.j] = s;

    let tmp : number;
    tmp = s.location.i;
    s.location.i = t.location.i;
    t.location.i = tmp;

    tmp = s.location.j;
    s.location.j = t.location.j;
    t.location.j = tmp;
  }

  // printShape //
  // Draw the shape of the board with H's.
  printShape(){
    for (let i = 0; i < this.gridWidth; i++){
      let rowString : string = "";
      if (i % 2 == 1){
        rowString += " ";
      }
      for (let j = 0; j < this.gridHeight; j++){
        if (this.grid[i][j]){
          rowString += "H ";
        }else{
          rowString += "  ";
        }
      }
      console.log(rowString);
    }
  }

  // randomGrid //
  // For debugging. Fill in the grid with random tiles.
  randomGrid(){
    const beeColorOptions = [TileColor.Green, TileColor.Orange, TileColor.Red, TileColor.Omni];
    const flowerColorOptions = [TileColor.Green, TileColor.Orange, TileColor.Red, TileColor.GreenOrange, TileColor.GreenRed, TileColor.OrangeRed];
    const stateOptions = [TileState.Active, TileState.Inactive];
    for (let i = 0; i < this.gridWidth; i++){
      for (let j = 0; j < this.gridHeight; j++){
        if (Math.random() < 1/2){
          this.grid[i][j].type = TileType.Bee;
          this.grid[i][j].color = beeColorOptions[Math.floor(Math.random()*4)];
        }else{
          if (Math.random() < 1){
            this.grid[i][j].type = TileType.Flower;
            this.grid[i][j].color = flowerColorOptions[Math.floor(Math.random()*6)];
          }
        }
        this.grid[i][j].setState(stateOptions[Math.floor(Math.random())]);
      }
    }
  }
}
export { AbstractBoard, HexLocation }