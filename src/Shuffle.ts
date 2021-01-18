import { PIXI } from "./index.ts"
import { app, DEBUG, debugBoxes, debugContainer } from "./makeStage.ts"
import { ShuffleEvent, SEType, AbstractShuffle } from "./AbstractShuffle.ts"
import { HexTile, TileType, TileColor, TileState } from "./HexTile.ts"
import { Board, HexLocation } from "./Board.ts"
import { game, Game, GameState } from "./Game.ts"
import { AutoRope } from "./AutoRope.ts"
import { trailTexture } from "./spriteLoader.ts"


console.log("Loaded: Shuffle.ts");

class Shuffle extends AbstractShuffle {

  // trail is the graphical object that draws the trail through the tiles in the path.
  trail : AutoRope;

  constructor(swapper : HexTile){
    super(swapper);

    this.trail = new AutoRope(trailTexture);
    this.board.container.addChild(this.trail.container);
    this.updateTrail();

  }

  encounterTile(coordinates : HexLocation){
    super.encounterTile(coordinates);
    this.updateTrail();
  }

  //startNextSwap(){
  //  super.startNextSwap();
  //}

  completeSwap(){
    super.completeSwap();
    this.updateTrail();
  }

  tick(delta : number){
    super.tick(delta);
    //this.tickTrail(delta);
  }

  //finish(){
  //  super.finish();
  //}

  updateTrail(){
    //console.log("Update trail...");
    switch(this.latestEvent.event){
      case (SEType.AddedToPath):
        const tileLocation = this.board.getTileCenterCoordinates(this.latestEvent.loc);
        this.trail.pushControlPoint(tileLocation);
        break;
      case (SEType.RemovedFromPath):
        this.trail.popControlPoint();
        break;
      case (SEType.StartedSwap):
        this.trail.startNextSegment();
        break;
      case (SEType.CompletedSwap):
        this.trail.completeSegment();
        break;
    }
    this.latestEvent.event = SEType.None;
  }
}

export { Shuffle }