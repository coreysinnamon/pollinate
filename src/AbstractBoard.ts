import { PIXI } from "./index"
import { app, DEBUG, debugBoxes, debugContainer } from "./makeStage"
import { HexTile, TileType, TileColor, TileState } from "./HexTile"

console.log("Loaded: AbstractBoard");

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

  // Determines whether two given HexLocations are adjacent as hexagons
  static adjacentCoords(s : HexLocation, t : HexLocation){
    // This is written concisely, not to be readable. Rewrite it if you like.
    const di = (1-2*(s.j % 2))*(s.i - t.i);
    const dj = s.j - t.j;
    return ((dj == 0 && di == -1) || (dj == -1 && di == 0) || (dj == 1 && di == 0) || (di == 1 && Math.abs(dj) <= 1));
  }

  gridWidth : number;
  gridHeight : number;
  grid : HexTile[][];

  // Keep a directory (bit string) of edges in the board currently used by some shuffle
  edgesUsedByShuffles : boolean[];

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

    this.edgesUsedByShuffles = new Array(3*this.gridHeight*this.gridWidth);
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

  edgeNumber(s : HexLocation, t: HexLocation){
    // swap s and t, if necessary, to order them lexicographically by (j,i)
    if (s.j > t.j || (s.j == t.j && s.i > t.i)){
      const swap = s;
      s = t;
      t = swap;
    }
    
    const tileIndex = 3*(s.j*this.gridWidth + s.i)

    // offset = 0, 1, or 2
    //    X   X
    //  X   s   0
    //    1   2 

    const offset = (t.j - s.j) * (t.i - s.i - (s.j % 2) + 2);
    return tileIndex + offset;
  }

  edgeIsFree(s : HexLocation, t: HexLocation){
    return !this.edgesUsedByShuffles[this.edgeNumber(s,t)];
  }

  claimEdge(s : HexLocation, t: HexLocation){
    this.edgesUsedByShuffles[this.edgeNumber(s,t)] = true;
  }

  releaseEdge(s : HexLocation, t: HexLocation){
    this.edgesUsedByShuffles[this.edgeNumber(s,t)] = false;
  }

  locationIsFree(s : HexLocation){
    const adjacentLocs = [];
    if (s.j % 2 == 0){
      adjacentLocs.push({i : s.i - 1, j : s.j});
      adjacentLocs.push({i : s.i + 1, j : s.j});
      adjacentLocs.push({i : s.i-1, j : s.j-1});
      adjacentLocs.push({i : s.i, j : s.j-1});
      adjacentLocs.push({i : s.i-1, j : s.j+1});
      adjacentLocs.push({i : s.i, j : s.j+1});
    }else{
      adjacentLocs.push({i : s.i - 1, j : s.j});
      adjacentLocs.push({i : s.i + 1, j : s.j});
      adjacentLocs.push({i : s.i-1, j : s.j-1});
      adjacentLocs.push({i : s.i, j : s.j-1});
      adjacentLocs.push({i : s.i-1, j : s.j+1});
      adjacentLocs.push({i : s.i, j : s.j+1});
    }
    for (let n = 0; n < adjacentLocs.length; n++){
      const t = adjacentLocs[n];
      if ( t.i >= 0 && t.i < this.gridWidth
        && t.j >= 0 && t.j < this.gridHeight ){
        if (this.edgesUsedByShuffles[this.edgeNumber(s,t)]){
          return false;
        }
      }
    }
    return true;
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