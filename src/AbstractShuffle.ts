import { PIXI } from "./index"
import { app, DEBUG, debugBoxes, debugContainer } from "./makeStage"
import { HexTile, TileType, TileColor, TileState } from "./HexTile"
import { Board, HexLocation } from "./Board"
import { game, Game, GameState } from "./Game"
import { wiggleTween} from "./animations"


console.log("Loaded: AbstractShuffle");

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
  Backtracked,
  StartedSwap,
  CompletedSwap
}

type ShuffleEvent = { event : SEType, loc : HexLocation | null };

class AbstractShuffle {
  // shufflePeriod is the length (in frames) of a single swap
  static shufflePeriod : number = 30;
  // shuffleDrawPeriod is the time (in frames) to draw an edge between hexes
  static shuffleDrawPeriod: number = 10;

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

    this.swapper.setOwnerShuffle(this);
    // Start wiggling; record the key for the tween
    this.swapper.tweenKeys.swapWiggle = this.swapper.animate(wiggleTween(35, 0.2, 3));
  }

  destruct(){
    let x = this.swapper.location;
    let y;
    for (let n = 0; n < this.path.length-1; n++){
      y = this.path[n]
      this.board.releaseEdge(x, y);
      x = y;
    }

    for (let n = 0; n < this.path.length; n++){
      const t = this.board.getTile(this.path[n]);
      t.releaseOwnerShuffle(this);
    }
    this.swapper.releaseOwnerShuffle(this);
    this.swapper.clearAnimation(this.swapper.tweenKeys.swapWiggle);
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

  // containsLocation //
  // Determines whether the location is in the path (at least once)
  // A tile should be owned by this shuffle <=> containsLocation returns true
  containsLocation(loc : HexLocation){
    if (loc.i == this.swapper.location.i && loc.j == this.swapper.location.j){
      return true;
    }
    for (let n = 0; n < this.path.length; n++){
      if (this.path[n].i == loc.i && this.path[n].j == loc.j){
        return true;
      }
    }
    return false;
  }

  // popLeader //
  // Remove the leader from the path
  popLeader(){
    if (this.path.length == 0){
      return;
    }
    const leader = this.getLeaderLocation();
    this.path.pop();
  }

  // encounterTile //
  // Called when the user mouses over a new tile.
  // If it's adjacent to the leader (and is not the tile before that), it adds the location the path.
  // If it is the last tile before the leader, then they're tracing over the previous edge.
  // Remove the leader to delete that last edge in the path.
  encounterTile(loc : HexLocation){
    const tile = this.board.getTile(loc);
    const leader = this.getLeaderLocation();
    if(tile != null && Board.adjacentCoords(loc, leader)){

      // Is tile the last tile in the path before the leader?
      // If so, we should backtrack that last edge.
      // But be careful not to backtrack on an edge that is being traversed!
      // We require path.length > 2 to avoid this.
      if ( this.path.length > 2
           && loc.i == this.path[this.path.length-2].i
           && loc.j == this.path[this.path.length-2].j ){
        // Remove leader instead of adding to path.
        this.popLeader();
        // Release the last edge that the leader was involved in
        this.board.releaseEdge(loc, leader);

        this.latestEvent.event = SEType.Backtracked;
        this.latestEvent.loc = loc;
        //console.log("Removed (" + leader.i.toString() + ", " + leader.j.toString() + ")");
      }else{
        // New tile. Add it unless it this edge from leader to tile is already used by some shufle.
        if(this.board.edgeIsFree(leader, loc)){
          this.path.push({ i: loc.i, j : loc.j });
          this.board.claimEdge(leader, loc);
          //this.startNextSwap();
          //console.log("Added (" + coordinates.i.toString() + ", " + coordinates.j.toString() + ")");
  
          this.latestEvent.event = SEType.AddedToPath;
          this.latestEvent.loc = loc;
        }
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
      // Figure out if it can proceed
      const tile = this.board.getTile(this.path[0]);
      if (tile.isReadyToSwap()){
        tile.setOwnerShuffle(this);

        this.waiting = false;
        this.shuffleProgress = 0;

        this.latestEvent.event = SEType.StartedSwap;
        this.latestEvent.loc = this.path[0];
      }
    }
  }

  // completeSwap //
  // Called when a swap finishes. Remove the first tile from the path and try to start the next swap.
  completeSwap(){
    if (this.path.length == 0){
      console.error("AbstractShuffle.ts: Path empty during completeSwap!");
    }

    const tile = this.board.getTile(this.path.shift());
    tile.releaseOwnerShuffle(this);

    this.board.releaseEdge(this.swapper.location, tile.location);
    this.board.swapTiles(this.swapper, tile);

    this.shuffleProgress = 0;
    this.waiting = true;
    //this.startNextSwap();

    if (this.isFinished()){
      this.destruct();
    }

    this.latestEvent.event = SEType.CompletedSwap;
    this.latestEvent.loc = this.path[this.path.length - 1];
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

    if (!this.waiting){
      // If we get here, we're in the middle of a transition.
      this.shuffleProgress += delta;
    }
  }


  // complete //
  // Called when the user stops building the path.
  // Indicates that no more tiles will be added to the path.
  complete(){
    this.completed = true;
    if (this.isFinished()){
      this.destruct();
    }

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