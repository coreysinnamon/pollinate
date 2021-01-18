import { PIXI } from "./index.ts"
import { Walker } from "./Walker.ts"

console.log("Loaded: AutoRope.ts");

/* Autorope.ts
 * This is used to draw a PIXI.SimpleRope (a textured graphic that 
 * passes through many changeable points), with the points being placed
 * in a wiggly pattern around the actual "control points".
 * The control points determine the rough shape of the rope, but the ropePoints
 * get placed all around that shape to give a smooth and amusing appearance to the thing.
 * This is used to draw the trail representing a Shuffle. See Shuffle.ts.
 */

class AutoRope{
  // For dotted-line texture
  static textureScale = 1/4;
  // For arrow-line texture
  //static textureScale = 1/6;

  rope : PIXI.SimpleRope;
  // ropePoints: The actual points that define the rope
  ropePoints : PIXI.Point[];
  // controlPoints: The points that define the control of the rope, from which ropePoints is determined
  controlPoints : PIXI.Point[];
  // segmentSize: This tracks pointers to the last point in ropePoints before each controlPoint.
  //              Specifically, segmentSize[i] is the last point in ropePoints before controlPoints[i+1].
  //              Used for adding/removing ropePoints when controlPoints changes.
  segmentSize : number[];

  // segmentProgress: The number of ropePoints left in the current segment.
  //                  Used to animate rope.
  //                  It takes the value null if no segment is currently being moved through.
  segmentProgress : number | null;

  // The rope texture.
  texture : PIXI.Texture;

  // The walker decides where to put ropePoints through Walker.walk(). See Walker.ts.
  walker : Walker;

  // Container to hold the rope.
  container : PIXI.Container;

  constructor(texture : PIXI.Texture){
    this.ropePoints = [];
    this.segmentSize = [];
    this.controlPoints = [];
    this.segmentProgress = null;
    this.texture = texture;
    this.walker = new Walker();

    this.container = new PIXI.Container();
  }

  // initializeRope //
  // Create the rope using this.ropePoints.
  // We can't do this from the constructor because we need
  // some points before we can actually instantiate the rope.
  // We may also initialize the rope multiple times if ropePoints becomes empty inbetween.
  initializeRope(){
    if (this.ropePoints.length == 0){
      console.error("Tried to initialize empty rope.");
      return;
    }
    this.rope = new PIXI.SimpleRope(this.texture, this.ropePoints, AutoRope.textureScale);
    this.rope.roundPixels = true;
    this.rope.zIndex = 1000;

    this.container.addChild(this.rope);
  }

  // segmentVec //
  // Computes vector between controlPoints[segNumber-1] and controlPoints[segNumber].
  segmentVec(segNumber : number){
    if (segNumber < 1 || this.controlPoints.length <= segNumber) return null;
    return { x : (this.controlPoints[segNumber].x - this.controlPoints[segNumber-1].x),
             y : (this.controlPoints[segNumber].y - this.controlPoints[segNumber-1].y) };
  }

  // pushControlPoint //
  // Add control point to end.
  pushControlPoint( pt : { x : number, y : number }){
    this.controlPoints.push(new PIXI.Point(pt.x, pt.y));
    if (this.controlPoints.length == 1){
      // Too soon to create a rope
      return;
    }
    if (this.controlPoints.length == 2){
      // Now it's time to start a new rope.
      // Set the start position and reset walker.theta, so that 
      // the next path starts at that place with no memory of its previous direction.
      this.walker.setStartPosition(this.controlPoints[0]);
    }

    // Make walker generate new rope points and add them.
    const segVec = this.segmentVec(this.controlPoints.length-1);
    const ptsToAdd = this.walker.walk(segVec);
    for (let n=0; n < ptsToAdd.length; n++){
      this.ropePoints.push(ptsToAdd[n]);
    }
    this.segmentSize.push(ptsToAdd.length);

    if (this.controlPoints.length == 2){
      //Initialize the rope now that there are points to work with
      this.initializeRope();
    }
  }

  // shiftControlPoint //
  // Delete control point from front and adjust ropePoints accordingly.
  shiftControlPoint(){
    if (this.controlPoints.length == 0) return;
    if (this.controlPoints.length == 1) {
      this.controlPoints.shift();
      return;
    }
    if (this.controlPoints.length == 2) {
      this.controlPoints.shift();
      this.segmentSize.shift();
      // Delete the rope and clear the ropePoints
      this.container.removeChild(this.rope);
      this.rope = null;
      while (this.ropePoints.length > 0) this.ropePoints.shift();
      
      // instruct walker to forget about its state at the deleted control point
      this.walker.shiftHistory();

      return;
    }
    const ptsToRemove = this.segmentSize[0];

    this.controlPoints.shift();
    this.segmentSize.shift();
    for (let n = 0; n < ptsToRemove; n++){
      this.ropePoints.shift();
    }
  }

  // popControlPoint //
  // Delete control point from end and adjust ropePoints accordingly
  popControlPoint(){
    if (this.controlPoints.length == 0) return;
    if (this.controlPoints.length == 1) {
      this.controlPoints.pop();
      return;
    }
    if (this.controlPoints.length == 2) {
      this.controlPoints.pop();
      this.segmentSize.pop();
      // Delete the rope and clear the ropePoints
      this.container.removeChild(this.rope);
      this.rope = null;
      while (this.ropePoints.length > 0) this.ropePoints.shift();
      return;
    }

    const ptsToRemove = this.segmentSize[this.segmentSize.length-1];

    this.controlPoints.pop();
    this.segmentSize.pop();
    for (let n = 0; n < ptsToRemove; n++){
      this.ropePoints.pop();
    }

    this.walker.backstep();
  }

  startNextSegment(){
    this.segmentProgress = 0;
  }

  completeSegment(){
    this.shiftControlPoint();
    this.segmentProgress = null;
  }


  tick(delta : number){
    if (this.segmentProgress == null){
      // Not moving through any transition
    }

  }
}

export { AutoRope }
