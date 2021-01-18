import { PIXI } from "./index.ts"
import { app, DEBUG, debugBoxes, debugContainer } from "./makeStage.ts"
import { game, GameState } from "./Game.ts"
import { AbstractShuffle } from "./AbstractShuffle.ts"
import { HexLocation } from "./Board.ts"

console.log("Loaded: AbstractTile.ts");

/* AbstractTile.ts
 * Mechanics class for the tiles in the game. This does not include graphical parts.
 */

enum TileType {
  Bee,
  Flower,
  On,
  Off
}

enum TileColor {
  None,
  Green,
  Orange,
  Red,
  GreenOrange,
  GreenRed,
  OrangeRed,
  Omni
}

enum TileState {
  Active,
  Inactive,
  Transitioning
}

type TileOwner = AbstractShuffle;


class AbstractTile {

  type : TileType;
  color : TileColor;
  state : TileState;
  location : HexLocation;
  owner : TileOwner | null;

  constructor(i : number, j : number, type : TileType = TileType.Bee, color : TileColor = TileColor.Green){
    this.type = type;
    this.color = color;
    this.state = TileState.Active;
    this.location = { i : i, j : j };
    this.owner = null;
  }

  toString(){
    return "(" + this.location.i.toString() + ", " + this.location.j.toString() + ")";
  }

  setState(state : TileState){
    this.state = state;
  }

  isUnowned(){
    return (this.owner == null);
  }

  setOwner(owner : TileOwner){
    this.owner = owner;
  }

  resetOwner(){
    this.owner = null;
  }
}

export { AbstractTile, TileType, TileColor, TileState, TileOwner }