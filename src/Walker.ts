import { PIXI } from "./index.ts"

console.log("Loaded: Walker.ts");

/* Walker.ts
 * A walker is used by AutoRope (see AutoRope.ts) to decide where to place ropePoints.
 * By altering the walker, we alter how the wiggly parts of the Shuffle graphics work.
 */


type Pt = { x : number, y : number };

/////////// UTILITY FUNCTIONS ////////////////
function l2dist( s : Pt, t : Pt){
  return Math.sqrt(Math.pow(s.x - t.x, 2) + Math.pow(s.y - t.y, 2));
}

function l2norm( s : Pt ){
  return Math.sqrt(Math.pow(s.x, 2) + Math.pow(s.y, 2));
}

// Shift angle to (-pi, pi].
//   -pi/2 = south
//   0 = east
//   pi/2 = north
//   pi = west
function standardizeAngle(theta : number){
  theta = ((theta % (2*Math.PI)) + 2*Math.PI) % (2*Math.PI);
  return theta - (theta > Math.PI ? 2*Math.PI : 0);
}

// Get angle in (-pi, pi) corresponding to the direction of the given vector.
function getAngle(vec : Pt){
  if (l2norm(vec) == 0){
    return 0;
  }
  if (Math.abs(vec.x) > Math.abs(vec.y)){
    return standardizeAngle(Math.atan(vec.y/vec.x) + (vec.x < 0 ? Math.PI : 0));
  }else{
    return standardizeAngle(Math.PI/2 - Math.atan(vec.x/vec.y) + (vec.y < 0 ? Math.PI : 0));
  }
}

// Get unit vector in the direction of the given angle.
function getVectorFromAngle(theta : number){
  theta = standardizeAngle(theta);
  if (true || Math.abs(theta) < Math.PI/4){
    const ratio = Math.tan(theta);
    return (Math.abs(theta) <= Math.PI/2 ? { x : Math.sqrt(1/(Math.pow(ratio,2) + 1)) , y : ratio*Math.sqrt(1/(Math.pow(ratio,2) + 1)) }
                                         : { x : -Math.sqrt(1/(Math.pow(ratio,2) + 1)) , y : -ratio*Math.sqrt(1/(Math.pow(ratio,2) + 1)) } );
  }else{
    const ratio = Math.tan(theta + Math.PI/2);
    return (Math.abs(theta) <= Math.PI/2 ? { x : ratio*Math.sqrt(1/(Math.pow(ratio,2) + 1)), y : Math.sqrt(1/(Math.pow(ratio,2) + 1)) }
                                         : { x : -ratio*Math.sqrt(1/(Math.pow(ratio,2) + 1)), y : -Math.sqrt(1/(Math.pow(ratio,2) + 1)) } );
  }
}
/////////////////////////

class Walker{
  // Parameters used in moveLeader
  static followerSlowStep = 30;
  static slowdtheta = Math.PI/8;
  static followerFastStep = Walker.followerSlowStep/3;
  static fastdtheta = Walker.slowdtheta;
  static maxDistance = 400;
  //Increasing alpha increases the amplitude of the wiggle
  static alpha = 0.2*Math.PI;
  //Increasing beta reduces the chance of loops
  static beta = 0.5*Math.PI;

  // The leader moves, the follower follows indirectly.
  // The follower decides where the points should be placed.
  leader : Pt;
  follower : Pt;
  
  // theta is the angle that the follower is currently moving along.
  theta : number;
  // dir is 1 or -1, indicating that theta is moving clockwise (1) or counterclockwise (-1).
  dir : number;
  
  // Stores the history of the parameters, since sometimes we need to backtrack.
  stateHistory : any[];

  constructor(){
    this.leader = { x : 0, y : 0 };
    this.follower = { x : 0, y : 0 };

    this.theta = null;
    this.dir = 2*Math.floor(Math.random()*2)-1;

    this.stateHistory = [];
  }

  // setStartPosition //
  // Move leader and follower to a position.
  setStartPosition( pt : { x : number, y : number }){
    this.leader.x = pt.x;
    this.leader.y = pt.y;
    this.follower.x = pt.x;
    this.follower.y = pt.y;
    this.theta = null;
  }

  // walk //
  // Moves the leader and generates a sequence of points based on the follower,
  // which follows after the leader.
  walk(vec : { x : number, y : number } | null) : PIXI.Point[]{
    if (vec == null){
      return [];
    }

    // Write current state to history
    this.pushHistory();

    return this.moveLeader(vec);
  }


  // moveLeader //
  // Move the leader and let the follower trail and place points as it moves.
  // moveLeader returns a list of the points the follower passes through.
  moveLeader(dp : Pt){
    if (this.theta == null){
      this.theta = getAngle(dp);
    }
    const maxNumber = 200;


    const toAdd : PIXI.Point[] = [];

    const segmentLength = l2norm(dp);
    while(toAdd.length < maxNumber){
      const proj = ((this.follower.x - this.leader.x)*dp.x + (this.follower.y - this.leader.y)*dp.y)/segmentLength;
      if (proj > segmentLength){
        break;
      }

      const closestPointOnSegment = { x : (proj <= 0 ? this.leader.x : this.leader.x + dp.x*Math.min(1, proj/segmentLength)),
                                      y : (proj <= 0 ? this.leader.y : this.leader.y + dp.y*Math.min(1, proj/segmentLength)) };

      const distanceToSegment = l2dist(this.follower, closestPointOnSegment);

      let targetVec : Pt;
      if (distanceToSegment > Walker.maxDistance){
        targetVec = { x : closestPointOnSegment.x - this.follower.x,
                      y : closestPointOnSegment.y - this.follower.y };
      }else{
        const ratio = distanceToSegment/Walker.maxDistance;
        targetVec = { x : ratio*(closestPointOnSegment.x - this.follower.x) + (1-ratio)*(dp.x*distanceToSegment/segmentLength),
                      y : ratio*(closestPointOnSegment.y - this.follower.y) + (1-ratio)*(dp.y*distanceToSegment/segmentLength) };
      }
     
      const targetTheta = getAngle(targetVec);

      const gamma = standardizeAngle(this.theta - targetTheta);
      if (Walker.alpha < Math.abs(gamma) && Math.abs(gamma) < Walker.beta){
      this.dir = (gamma > 0 ? -1 : 1);
      }

      // Now determine the rate of turning. The further off track, the faster the turn.
      const dtheta = (Math.abs(gamma) < Walker.beta ? Walker.slowdtheta : Walker.fastdtheta);
      const followerStep = (Math.abs(gamma) < Walker.beta ? Walker.followerSlowStep : Walker.followerFastStep);

      this.theta = standardizeAngle(this.theta + this.dir*dtheta);

      //console.log(gamma);
      //console.log(this.dir);

      const step = getVectorFromAngle(this.theta);
      this.follower.x += step.x*followerStep;
      this.follower.y += step.y*followerStep;
      toAdd.push(new PIXI.Point(this.follower.x, this.follower.y));
    }

    if(toAdd.length >= maxNumber){
      console.log("Walker.moveLeader: toAdd length exceeded!");
    }

    this.leader.x += dp.x;
    this.leader.y += dp.y;
  
    return toAdd;
  }

  // backstep //
  // Revert to the last remembered state (before the last call to walk).
  backstep(){
    if (this.stateHistory.length < 2){
      this.theta = null;
    }
    const lastState = this.stateHistory.pop();

    this.leader.x = lastState.leader.x;
    this.leader.y = lastState.leader.y;
    this.follower.x = lastState.follower.x;
    this.follower.y = lastState.follower.y;
    this.theta = lastState.theta;
    this.dir = lastState.dir;
  }

  // pushHistory //
  // Write current state to history.
  pushHistory(){
    this.stateHistory.push({ leader : { x : this.leader.x, y : this.leader.y },
                         follower : { x : this.follower.x, y : this.follower.y },
                         theta : this.theta,
                         dir : this.dir });
  }

  // shiftHistory //
  // Delete the oldest state from history.
  shiftHistory(){
    this.stateHistory.shift();
  }
}

export { Walker }