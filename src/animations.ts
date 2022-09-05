import { TextureGCSystem } from "pixi.js";
import { HexTile } from "./HexTile"

type Coordinates = { x: number, y: number };


enum TweenState {
  RUNNING,
  REVERSING,
  PAUSED,
  SHUTTING_DOWN,
  DEAD,
}

class Displacement {
  translation: Coordinates | null;
  rotation: number | null;
  stretchFactor: Coordinates | null;

  constructor(t: Coordinates | null = null, r: number | null = null, s: Coordinates | null = null) {
    this.translation = t == null ? { x: 0, y: 0 } : t;
    this.rotation = r == null ? 0 : r;
    this.stretchFactor = s == null ? { x: 1, y: 1 } : s;
  }

  add(d: Displacement) {
    this.translation.x += d.translation.x;
    this.translation.y += d.translation.y;
    this.rotation += d.rotation;
    this.stretchFactor.x *= d.stretchFactor.x;
    this.stretchFactor.y *= d.stretchFactor.y;
  }
}



function swapTranslationTween(period: number, s : HexTile, t : HexTile){
  const dx = t.x - s.x;
  const dy = t.y - s.y;
  return new Tween(function(p : number, d: Displacement){
      d.translation.x = dx*p;
      d.translation.y = dy*p;
    }, 0, null, period, 1);
}

function returnTween(period: number) {
    return function(t: Tween) : Tween {
      const tx = t.displacement.translation.x;
      const ty = t.displacement.translation.y;
      const r = t.displacement.rotation;
      const sx = t.displacement.stretchFactor.x;
      const sy = t.displacement.stretchFactor.y;
      return new Tween(function (p: number, d: Displacement) {
        d.translation.x = tx * (1 - p);
        d.translation.y = ty * (1 - p);
        d.rotation = r * (1 - p);
        d.stretchFactor.x = sx ** (1 - p);
        d.stretchFactor.y = sy ** (1 - p);
      }, 0, null, period, 1);
    }
}

function wiggleTween(amplitude: number, angle: number, speed: number){
  return new Tween(
    function (p: number, d: Displacement) {
      d.translation.x = amplitude * Math.sin(0.6 * Math.sin(p * 2 * Math.PI * speed) * Math.PI / 2),
      d.translation.y = -amplitude / 2 * (Math.cos(0.6 * Math.sin(p * 2 * Math.PI * speed) * Math.PI / 2) - 1)
      d.rotation = angle * Math.sin(Math.sin(p * 2 * Math.PI * speed));
    }, 0, null, 100, null)
    .onStopDo(returnTween(10));
}


class Tween {
  f: (t: number, d: Displacement) => void;
  displacement: Displacement;
  progress: number;
  period: number;
  repetitions: number | null;
  state: TweenState;
  thenTween: Tween | null = null;
  lastTween: Tween | null = this;
  shutdownTween: (t: Tween) => Tween | null = null;

  constructor(f: (p: number, d: Displacement) => void,
              p: number = 0,
              d: Displacement | null = null,
              period: number = -1,
              repetitions: number | null = 1){
    this.displacement = d == null ? new Displacement() : d;
    this.f = f;
    this.progress = p;
    this.period = period;
    this.repetitions = repetitions;
    this.state = TweenState.RUNNING;

    this.f(this.progress, this.displacement);
  }

  overwrite(t: Tween) {
    this.f = t.f;
    this.progress = t.progress;
    this.period = t.period;
    this.repetitions = t.repetitions;
    this.state = t.state;
    this.nextTween = t.nextTween;
    this.shutdownTween = t.shutdownTween;

    this.f(this.progress, this.displacement);
  }

  pause(){
    this.state = TweenState.PAUSED;
  }

  tick(delta: number) {
    if (this.state == TweenState.PAUSED || this.state == TweenState.DEAD) {
      return;
    }

    this.progress += delta;

    if (this.progress >= this.period) {
      const leftover = this.progress - this.period;

      if (this.repetitions !== null) {
        this.repetitions -= 1;
        if (this.repetitions <= 0) {
          // not looping; reached the end of the last repetition
          this.nextTween();
          this.tick(leftover);
          return;
        }
      }
      this.progress = leftover;

    }

    this.f(this.progress / this.period, this.displacement);

  }

  nextTween(){
    if (this.thenTween == null){
      this.stop();
    }else{
      this.overwrite(this.thenTween);
    }
  }

  then(t: Tween) {
    this.thenTween = t;
    if (this.lastTween == this) {
      this.lastTween = this.thenTween;
    }

    if (this.state == TweenState.DEAD){
      this.nextTween();
    }
    return this;
  }

  onStopDo(g: ((t: Tween) => Tween) | null){
    this.shutdownTween = g;
    return this;
  }

  stop(){
    if(this.shutdownTween !== null){
      this.overwrite(this.shutdownTween(this));
      this.state = TweenState.SHUTTING_DOWN;
    }else{
      this.kill();
    }
  }

  isStopping() {
    return (this.state == TweenState.SHUTTING_DOWN);
  }

  kill(){
    this.state = TweenState.DEAD;
  }

  isDead() {
    return (this.state == TweenState.DEAD);
  }
}

export { swapTranslationTween, wiggleTween, Coordinates, Displacement, Tween }