import { PIXI } from "./index"
import { app, DEBUG, debugBoxes, debugContainer } from "./makeStage"
import { ShuffleEvent, SEType, AbstractShuffle } from "./AbstractShuffle"
import { HexTile, TileType, TileColor, TileState } from "./HexTile"
import { Board, HexLocation } from "./Board"
import { game, Game, GameState } from "./Game"
import { AutoRope } from "./AutoRope"
import { trailTexture } from "./spriteLoader"
import { swapTranslationTween } from "./animations"


console.log("Loaded: Shuffle");

class Shuffle extends AbstractShuffle {

  // trail is the graphical object that draws the trail through the tiles in the path.
  trail : AutoRope;

  constructor(swapper : HexTile){
    super(swapper);

    this.trail = new AutoRope(trailTexture);
    this.board.container.addChild(this.trail.container);
    this.trail.container.zIndex = 1000;
    this.updateTrail();
  }

  destruct(){
    super.destruct();
    this.board.container.removeChild(this.trail.container);
    this.trail.destruct();
  }

  encounterTile(coordinates : HexLocation){
    super.encounterTile(coordinates);
    this.updateTrail();
  }

  startNextSwap(){
    super.startNextSwap();
    this.updateTrail();
  }

  completeSwap(){
    super.completeSwap();
    this.updateTrail();
  }

  tick(delta : number){
    super.tick(delta);
    this.trail.progressOnLastSegment(delta/Shuffle.shuffleDrawPeriod);
    if (!this.waiting) {
      this.trail.progressOnFirstSegment(delta / Shuffle.shufflePeriod);
    }
  }

  //finish(){
  //  super.finish();
  //}

  updateTrail(){
    //console.log("Update trail...");
    switch(this.latestEvent.event){
      case (SEType.AddedToPath):
        //console.log("Added to trail");
        const tileLocation = this.board.getTileCenterCoordinates(this.latestEvent.loc);
        this.trail.pushControlPoint(tileLocation);
        break;

      case (SEType.Backtracked):
        //console.log("Backtracked");
        this.trail.popControlPoint();
        break;

      case (SEType.StartedSwap):
        //console.log("Started Swap");
        const s = this.swapper;
        const t = this.board.getTile(this.latestEvent.loc);

        // Start swap translation animation and remember the key for the animation, to clear it when the swap actually happens
        s.sprite.zIndex = 599;
        t.sprite.zIndex = 500;
        s.animate("swapTranslation", swapTranslationTween(Shuffle.shufflePeriod, s, t));
        t.animate("swapTranslation", swapTranslationTween(Shuffle.shufflePeriod, t, s));
        break;

      case (SEType.CompletedSwap):
        //console.log("Completed Swap");
        this.trail.completeSegment();
        break;
    }
    this.latestEvent.event = SEType.None;
  }
}

export { Shuffle }