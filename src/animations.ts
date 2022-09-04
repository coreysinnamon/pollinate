import { HexTile } from "./HexTile"

type Coordinates = { x: number, y: number };

function swapTranslationTween(period: number, s : HexTile, t : HexTile){
  const dx = t.x - s.x;
  const dy = t.y - s.y;
  return new Tween(function(p : number){
      return { x : dx*p, y : dy*p };
    }, null, null, period, 0, false);
}

function wiggleTween(amplitude: number, angle: number, speed: number){
  return new Tween(
    function (p: number) {
      return {
        x: amplitude * Math.sin(0.6 * Math.sin(p * 2 * Math.PI * speed) * Math.PI / 2),
        y: -amplitude / 2 * (Math.cos(0.6 * Math.sin(p * 2 * Math.PI * speed) * Math.PI / 2) - 1)
      };
    },
    function (p: number) {
      return angle * Math.sin(Math.sin(p * 2 * Math.PI * speed));
    }, null, 100, 0, true);
}

class Tween {
  translate: (t: number) => Coordinates;
  rotate: (t: number) => number;
  stretch: (t: number) => Coordinates;
  period: number;
  progress: number;
  active: boolean;
  loop: boolean;

  constructor(translate: ((t: number) => Coordinates) | null,
   rotate: ((t: number) => number) | null,
   stretch: ((t: number) => Coordinates) | null,
   period: number = -1, progress: number = 0, loop: boolean = false){
    this.translate = translate;
    this.rotate = rotate;
    this.stretch = stretch;
    this.period = period;
    this.progress = progress;
    this.active = true;
    this.loop = loop;
  }
}

class TileAnimation {
  key = 0;
  animations: { [key: number]: Tween } = {}

  addTween(t: Tween){
    this.animations[this.key] = t;
    return this.key++;
  }
}

export { swapTranslationTween, wiggleTween, Coordinates, Tween, TileAnimation }