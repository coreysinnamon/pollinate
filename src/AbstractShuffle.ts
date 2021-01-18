import { PIXI } from "./index.ts"
import { app, DEBUG, debugBoxes, debugContainer } from "./makeStage.ts"
import { HexTile, TileType, TileColor, TileState } from "./HexTile.ts"
import { Board, HexLocation } from "./Board.ts"
import { game, Game, GameState } from "./Game.ts"


console.log("Loaded: AbstractShuffle.ts");

/* AbstractShuffle.ts
 *
 * A shuffle tracks the sequence of tile locations on the board that get shuffled around when the user draws a path.
 * It keeps one tile (the "swapper") and a list of hex locations that the swappers swaps with, in order.
 * A location is removed from the path once it is swapped with.
 */

// Idea: Different swap speeds for different types of hexes?


// A shuffle event records the most recent happening in the abstract shuffle.
// This event structure is used by the Shuffle class, which extends AbstractShuffle and adds graphical components.
enum SEType {
  None,
  AddedToPath,
  RemovedFromPath,
  StartedSwap,
  CompletedSwap
}

type ShuffleEvent = { event : SEType, loc : HexLocation | null };

class AbstractShuffle {
  // shufflePeriod is the length (in frames) of a single swap
  static shufflePeriod : number = 50;

  // board is the Board to which the shuffle belongs
  board : Board;

  // swapper is the tile that was selected to start the shuffle.
  // It gets swapped in turn with each tile in the path.
  swapper : HexTile;

  // path is the list of hex locations.
  path : HexLocation[];
  
  // waiting indicates whether the path is ready to start a new swap.
  // (It may need to wait until the tile to swap with is not busy with something else.)
  waiting : boolean;

  // completed indicates that the path is not still being added to, so it can be destroyed
  completed : boolean;

  // shuffleProgress tracks the number of frames spent on the current swap (as of the last tick).
  shuffleProgress : number = 0;

  // latestEvent is the event acted on in the Shuffle class.
  latestEvent : ShuffleEvent;

  constructor(swapper : HexTile){
    this.swapper = swapper;
    this.path = [];
    this.board = game.gm.board;
    this.waiting = true;
    this.completed = false;
    this.latestEvent = { event : SEType.AddedToPath, loc : this.getLeaderLocation() };

    this.swapper.setOwner(this);
  }

  // getLeaderLocation //
  // Get location of the leader.
  getLeaderLocation(){
    if (this.path.length == 0){
      return { i : this.swapper.location.i, j : this.swapper.location.j };
    }else{
      return this.path[this.path.length - 1];
    }
  }

  // encounterTile //
  // Called when the user mouses over a new tile.
  // If it's adjacent to the leader (and is not the tile before that), it adds the location the path.
  // If it is the last tile before the leader, then they're tracing over the previous edge.
  // Remove the leader to delete that last edge in the path.
  encounterTile(loc : HexLocation){
    const tile = this.board.getTile(loc);
    const leader = this.getLeaderLocation();
    if(tile != null && HexTile.adjacentCoords(loc, leader)){
      if ( this.path.length > 2
           && loc.i == this.path[this.path.length-2].i
           && loc.j == this.path[this.path.length-2].j ){
        // Same as last tile before leader AND it's not currently being swapped with swapper
        // (because path.length > 2).
        // Remove leader instead of adding to path.
        this.path.pop();
        this.latestEvent.event = SEType.RemovedFromPath;
        this.latestEvent.loc = loc;
        //console.log("Removed (" + leader.i.toString() + ", " + leader.j.toString() + ")");
      }else{
        // New tile. Add it.
        this.path.push({ i: loc.i, j : loc.j });
        this.startNextSwap();
        //console.log("Added (" + coordinates.i.toString() + ", " + coordinates.j.toString() + ")");
  
        this.latestEvent.event = SEType.AddedToPath;
        this.latestEvent.loc = loc;
      }
    }
  }

  // startNextSwap //
  // Try to start the next swap, if the shuffle is ready to proceed and the next tile is unowned.
  startNextSwap(){
    if (this.path.length == 0){
      return;
    }
    if (this.waiting){
      // Figure out if it can proceed: Check if next tile is unowned.
      const tile = this.board.getTile(this.path[0]);
      if (tile.isUnowned()){
        tile.setOwner(this);
        this.waiting = false;
        this.shuffleProgress = 0;
        
        this.latestEvent.event = SEType.StartedSwap;
        this.latestEvent.loc = this.path[this.path.length - 1];
      }
    }
  }

  // completeSwap //
  // Called when a swap finishes. Remove the first tile from the path and try to start the next swap.
  completeSwap(){
    if (this.path.length == 0){
      console.error("AbstractShuffle.ts: Path empty during completeSwap!");
    }
    this.latestEvent.event = SEType.CompletedSwap;
    this.latestEvent.loc = this.path[this.path.length - 1];

    const tile = this.board.getTile(this.path.shift());
    this.board.swapTiles(this.swapper, tile);
    tile.resetOwner();
    this.shuffleProgress = -1;
    this.waiting = true;
    this.startNextSwap();

    if (this.isFinished()){
      this.swapper.resetOwner();
    }
  }

  // tick //
  // Update the progress of the current swap, and complete it if necessary.
  tick(delta : number){
    if (!this.waiting && this.shuffleProgress + delta >= AbstractShuffle.shufflePeriod){
      // The transition finishes now.
      delta -= AbstractShuffle.shufflePeriod - this.shuffleProgress;
      this.completeSwap();
    }

    // Start next swap if possible
    this.startNextSwap();

    // If we get here, we're in the middle of a transition.
    this.shuffleProgress += delta;
  }

  // complete //
  // Called when the user stops building the path.
  // Indicates that no more tiles will be added to the path.
  complete(){
    this.completed = true;
  }

  // isFinished //
  // Returns true if the shuffle is complete and there are no more swaps to do.
  isFinished(){
    return (this.completed && this.path.length == 0);
  }

  // toString //
  // Print the list of locations in the path.
  toString(){
    let output = this.swapper.toString() + " | ";
    for( let n = 0; n < this.path.length; n++ ){
      output += "(" + this.path[n].i.toString() + ", " + this.path[n].j.toString() + ") ";
    }
    return output;
  }

  // listCoordinates //
  // Like toString, but outputs the (x, y) coordinates in boardspace instead of the locations.
  listCoordinates(){
    let output = "(" + Math.floor(this.swapper.sprite.x).toString() + ", " + Math.floor(this.swapper.sprite.y).toString() + ") | ";
    for( let n = 0; n < this.path.length; n++ ){
      const tile = this.board.getTile(this.path[n]);
      output += "(" + Math.floor(tile.sprite.x).toString() + ", " + Math.floor(tile.sprite.y).toString() + ") ";
    }
    return output;
  }
}

export { AbstractShuffle, ShuffleEvent, SEType }