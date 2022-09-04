import { PIXI } from "./index"
import { Walker } from "./Walker"
import { debugBoxes, debugContainer } from "./makeStage"


console.log("Loaded: AutoRope");

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
  // ropePoints: The points that define the rope (reverse order, so ropePoints[0] is the latest point to be added. This is for appearance.)
  ropePoints : PIXI.Point[];
  // ropePointsToAdd: The points that should be added to the end of the rope over time, giving the appearance of the rope growing gradually. (Reverse order, again).
  ropePointsToAdd : PIXI.Point[];
  // controlPoints: The points that control the shape of the rope, from which ropePoints is determined
  controlPoints : PIXI.Point[];
  // segmentSize: This tracks the number of ropePoints between controlPoints.
  //              Specifically, segmentSize[i] is the number of points in ropePoints
  //              between controlPoints[i] and controlPoints[i+1].
  //              Used for adding/removing ropePoints when controlPoints changes.
  segmentSize : number[];

  // firstSegmentProgess: The index in ropePoints of the first shown ropePoint. Used to animate rope.
  firstSegmentProgress : number;
  // lastSegmentProgress: The number of ropePoints so far added to the currently-being-drawn last segment.
  //                      Used to animate rope.
  lastSegmentProgress : number;
  // firstSegment: The index of the segment at the start of the rope that is being animated (shrinking)
  segmentBeingRemovedFrom: number;
  // segmentBeingAddedTo: The index of the segment at the end of the rope that is being animated (growing)
  segmentBeingAddedTo : number;
  // texturePhase: We want to trick the texture to look like it's not frenetically moving as the ends of the rope get pushed around
  texturePhase : number;

  // The rope texture.
  texture : PIXI.Texture;


  // new params (under development):
  ropeStart: number;
  // ropeSize: number;
  firstDisplayedPointIndex: number;


  // The walker decides where to put ropePoints through Walker.walk(). See Walker.ts.
  walker : Walker;

  // Container to hold the rope.
  container : PIXI.Container;

  constructor(texture : PIXI.Texture){
    this.ropePoints = [];
    this.ropePointsToAdd = [];
    this.segmentSize = [];
    this.controlPoints = [];
    this.firstSegmentProgress = 0;
    this.lastSegmentProgress = 0;
    this.segmentBeingRemovedFrom = 0;
    this.segmentBeingAddedTo = 0;
    this.texture = texture;

    this.firstDisplayedPointIndex = 0;
    this.ropeStart = 0;
    // this.ropeSize = 0;

    this.walker = new Walker();

    this.container = new PIXI.Container();
  }

  destruct(){
    this.ropePoints = [];
    this.ropePointsToAdd = [];
    this.segmentSize = [];
    this.controlPoints = [];
    this.firstSegmentProgress = 0;
    this.lastSegmentProgress = 0;
    this.walker = null;
  }

  ropeLength(){
    let len = 0;
    let a = this.ropePoints[0];
    for (let n = 0; n < this.ropePoints.length; n++) {
      let b = this.ropePoints[n];
      len += Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
      a = b;
    }
    return len;
  }

  // initializeRope //
  // Create the rope using this.ropePoints.
  // We can't do this from the constructor because we need
  // some points before we can actually instantiate the rope.
  // We may also initialize the rope multiple times if ropePoints becomes empty inbetween.
  initializeRope(){
    this.rope = new PIXI.SimpleRope(this.texture, this.ropePoints, AutoRope.textureScale);
    this.rope.roundPixels = true;
    this.container.addChild(this.rope);
  }

  // destroyRope //
  destroyRope(){
    debugBoxes.ropeStart.value += "   X";

    this.container.removeChild(this.rope);
    this.rope = null;
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
      this.ropePointsToAdd.push(ptsToAdd[n]);
    }
    this.segmentSize.push(ptsToAdd.length);
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
      debugBoxes.ropeStart.value = "Delete1";

      this.destroyRope();
      while (this.ropePoints.length > 0) this.ropePoints.pop();
      while (this.ropePointsToAdd.length > 0) this.ropePointsToAdd.pop();
      
      // instruct walker to forget about its state at the deleted control point
      this.walker.shiftHistory();
      // reset segment animation variables
      this.firstSegmentProgress = 0;
      this.lastSegmentProgress = 0;
      this.segmentBeingRemovedFrom = 0;
      this.segmentBeingAddedTo = 0;

      return;
    }
    // const ptsToRemove = this.segmentSize[0] - Math.ceil(this.segmentSize[0]*this.frontProgress);

    this.controlPoints.shift();
    // this.segmentSize.shift();
    // this.segmentBeingAddedTo -= 1;

    // let n = 0;
    // while(this.ropePoints.length > 0 && n++ < ptsToRemove) this.ropePoints.shift();
    // while(this.ropePointsToAdd.length > 0 && n++ < ptsToRemove) this.ropePointsToAdd.shift();
    // this.frontProgress = 0;
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
      debugBoxes.ropeStart.value = "Delete2";
      this.destroyRope();
      while (this.ropePoints.length > 0) this.ropePoints.pop();
      while (this.ropePointsToAdd.length > 0) this.ropePointsToAdd.pop();

      this.walker.backstep();

      // reset segment animation variables
      this.firstSegmentProgress = 0;
      this.lastSegmentProgress = 0;
      this.segmentBeingRemovedFrom = 0;
      this.segmentBeingAddedTo = 0;
      return;
    }

    const ptsToRemove = this.segmentSize[this.segmentSize.length-1];

    this.controlPoints.pop();
    this.segmentSize.pop();
    
    let n = 0;
    while(this.ropePointsToAdd.length > 0 && n++ < ptsToRemove) this.ropePointsToAdd.pop();
    while(this.ropePoints.length > 0 && n++ < ptsToRemove) this.ropePoints.pop();
    
    this.walker.backstep();
  }

  completeSegment(){
    this.shiftControlPoint();
  }

  progressOnFirstSegment(dp : number){
    if (this.segmentBeingRemovedFrom >= this.segmentSize.length) {
      this.segmentBeingRemovedFrom = this.segmentSize.length;
      this.firstSegmentProgress = 0;
      return;
    }

    debugBoxes.ropeSize.value = "" + this.segmentBeingRemovedFrom;
    const oldProgress = this.firstSegmentProgress;
    let leftover = 0;
    if (this.firstSegmentProgress + dp * this.segmentSize[this.segmentBeingRemovedFrom] > this.segmentSize[this.segmentBeingRemovedFrom]){
      leftover = dp - (1 - this.firstSegmentProgress/this.segmentSize[this.segmentBeingRemovedFrom]);
      this.firstSegmentProgress = this.segmentSize[this.segmentBeingRemovedFrom];
    }else{
      this.firstSegmentProgress = this.firstSegmentProgress + dp * this.segmentSize[this.segmentBeingRemovedFrom]
    }

    const ptsToRemove = Math.ceil(this.firstSegmentProgress) - Math.ceil(oldProgress);

    for(let i = 0; i < ptsToRemove; i++){
      this.ropePoints.shift();
    }

    // // this.rope.start = this.ropeStart;
    // this.firstDisplayedPointIndex += ptsToHide;

    // const ptsToHide = Math.ceil(this.firstSegmentProgress) - Math.ceil(oldProgress);
  
    // let a = this.ropePoints[this.firstDisplayedPointIndex];
    // for (let n = this.firstDisplayedPointIndex + 1; n <= this.firstDisplayedPointIndex + ptsToHide; n++) {
    //   if (n >= this.ropePoints.length)
    //     break;
    //   let b = this.ropePoints[n];
    //   this.ropeStart += Math.sqrt((a.x - b.x)**2 + (a.y - b.y)**2);
    //   a = b;
    // }
    // //this.rope.start = this.ropeStart;
    // this.firstDisplayedPointIndex += ptsToHide;

    if (leftover > 0){
      this.segmentBeingRemovedFrom++;
      this.firstSegmentProgress = 0;
      this.progressOnFirstSegment(leftover);
    }
  }

  // This is the only place that points get added to ropePoints
  progressOnLastSegment(dp : number){
    if (this.segmentBeingAddedTo >= this.segmentSize.length) {
      this.segmentBeingAddedTo = this.segmentSize.length;
      this.lastSegmentProgress = 0;
    }

    // Is the rope currently uninitialized? We may need to initialize the rope, if so.
    const ropeWasEmpty = (this.ropePoints.length < 2);

    const segNum = this.segmentBeingAddedTo;
    if(segNum >= this.segmentSize.length) return;
    const numberAlreadyAdded = this.lastSegmentProgress;
    const leftover = (this.lastSegmentProgress/this.segmentSize[segNum] + dp) - 1;

    this.lastSegmentProgress = Math.min(this.lastSegmentProgress + dp*this.segmentSize[segNum], this.segmentSize[segNum]);
    const ptsToAdd = Math.ceil(this.lastSegmentProgress) - Math.ceil(numberAlreadyAdded);
    for (let n = 0; n < ptsToAdd; n++){
      if (this.ropePointsToAdd.length >  0) this.ropePoints.push(this.ropePointsToAdd.shift());
    }
    if(ropeWasEmpty && this.ropePoints.length >= 2){
      this.initializeRope();
    }
    if (leftover >= 0){
      this.segmentBeingAddedTo += 1;
      this.lastSegmentProgress = 0;
      this.progressOnLastSegment(leftover);
    }
  }
}

export { AutoRope }