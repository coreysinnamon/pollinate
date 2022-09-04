import { PIXI } from "./index"
import { app, DEBUG, debugBoxes, debugContainer } from "./makeStage"
import { game, GameState } from "./Game"
import { Board } from "./Board"
import { AbstractShuffle } from "./AbstractShuffle"
import { hexTextures } from "./spriteLoader"
import { HexLocation } from "./Board"
import { Coordinates, Tween, TileAnimation, wiggleTween } from "./animations"

console.log("Loaded: HexTile");

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

/* HexTile.ts
 * 
 */

class HexTile {
  // This first part gives access to the dimensions and shape of the hexagonal sprites.
  static widthOfSprite: number;
  static heightOfSprite: number;
  // The margin is the blank area around each hexagon.
  static marginAroundSprite: number;

  // This is the vertical distance from the top of the hexagon to the top of the vertical sides.
  static getSpriteRowOverlap() {
    return HexTile.getSpriteColumnWidth() / (2 * Math.sqrt(3));
  }

  static getSpriteHorizontalMargin() {
    return HexTile.marginAroundSprite;
  }

  static getSpriteVerticalMargin() {
    return HexTile.marginAroundSprite * 2 / Math.sqrt(3);
  }

  // The vertical distance from the top of the hexagon to the bottom of the vertical sides.
  static getSpriteRowHeight() {
    return HexTile.getSpriteVerticalMargin() + HexTile.heightOfSprite - HexTile.getSpriteRowOverlap();
  }

  // This is the horizontal width of the sprite + margin.
  static getSpriteColumnWidth() {
    return HexTile.getSpriteHorizontalMargin() + HexTile.widthOfSprite;
  }

  // This is the vertical height of the sprite + margin.
  static getSpriteRowOuterHeight() {
    return HexTile.getSpriteVerticalMargin() + HexTile.heightOfSprite;
  }

  board: Board;

  type: TileType;
  color: TileColor;
  state: TileState;

  location: HexLocation;
  shuffle: AbstractShuffle | null;

  x: number;
  y: number;
  theta: number;
  xscale: number;
  yscale: number;
  width: number;
  height: number;

  anim: TileAnimation;

  // Tween keys, so that they can be deleted where appropriate
  tweenKeys: { [id: string]: number };

  sprite: PIXI.Sprite;

  constructor(i: number, j: number, type: TileType = TileType.Bee, color: TileColor = TileColor.Green) {
    this.board = null;
    this.type = type;
    this.color = color;
    this.state = TileState.Inactive;
    this.location = { i: i, j: j };
    this.shuffle = null;

    this.anim = new TileAnimation();
    this.tweenKeys = { swapTranslation: 0, swapWiggle: 0 };
    this.sprite = new PIXI.Sprite();
    this.sprite.anchor.set(0.5, 0.5);

    this.theta = 0;
    this.xscale = 1;
    this.yscale = 1;
  }

  toString() {
    return "(" + this.location.i.toString() + ", " + this.location.j.toString() + ")";
  }

  setState(state: TileState) {
    this.state = state;
  }

  // reposition //
  // Move center of the tile to (x, y)
  reposition(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  // resize //
  // Change dimensions of the sprite.
  resize(width: number, height: number) {
    //this.width = width;
    //this.height = height;
  }

  updateSprite() {
    if (game.state != GameState.Loading) {
      if (this.type != TileType.Off && this.type != TileType.On) {
        this.sprite.texture = hexTextures[this.type][this.color][this.state];
      }
    }
    this.sprite.x = this.x;
    this.sprite.y = this.y;
  }

  hasOwner(){
    return this.shuffle !== null;
  }

  setOwnerShuffle(owner: AbstractShuffle) {
    if (this.shuffle == owner) return;
    this.shuffle = owner;
    // this.sprite.tint = 0x888888;

    // Start wiggling; record the key for the tween
    // this.tweenKeys.swapWiggle = this.animate(wiggleTween(20, 0.3, 2));
  }

  releaseOwnerShuffle(owner: AbstractShuffle) {
    if (this.shuffle == owner) {
      this.shuffle = null;
      // this.sprite.tint = 0xFFFFFF;

      // this.clearAnimation(this.tweenKeys.swapWiggle);
    }
  }

  isReadyToSwap() {
    return (this.shuffle == null);
  }

  tick(delta: number) {
    //console.log(this.toString());
    let x = this.x;
    let y = this.y;
    let theta = this.theta;
    let xscale = this.xscale;
    let yscale = this.yscale;

    for (const [key, tween] of Object.entries(this.anim.animations)) {
      if (tween.active){
        tween.progress += delta;
        if (tween.progress >= tween.period) {
          if (tween.loop){
            tween.progress = tween.progress % tween.period;
          }else{
            tween.progress = tween.period;
            tween.active = false;
          }
        }
        
        if (tween.translate !== null){
          const pos = tween.translate(tween.progress / tween.period);
          x += pos.x;
          y += pos.y;
        }

        if (tween.rotate !== null) {
          theta += tween.rotate(tween.progress / tween.period);
        }
        
        if (tween.stretch !== null) {
          const stretch = tween.stretch(tween.progress / tween.period);
          xscale += stretch.x;
          yscale += stretch.y;
        }
      }
    }
    this.sprite.x = x;
    this.sprite.y = y;
    this.sprite.rotation = theta;
    this.sprite.scale.x = this.xscale;
    this.sprite.scale.y = this.yscale;
  }

  animate(t: Tween) {
    // Store and return the key, so it can be deleted later
    const key = this.anim.addTween(t);
    if (!this.board.activeTiles.includes(this)) {
      this.board.activeTiles.push(this);
    }
    return key;
  }

  clearAnimation(key: number | null) {
    if (key !== null && key in this.anim.animations){
      delete(this.anim.animations[key]);
    }else{
      for (const k in this.anim.animations){
        delete(this.anim.animations[k]);
      }
    }
  }
}

export { HexTile, TileType, TileColor, TileState }