import { PIXI } from "./index.ts"
import { app, DEBUG, debugBoxes, debugContainer } from "./makeStage.ts"
import { game, GameState } from "./Game.ts"
import { Shuffle } from "./Shuffle.ts"
import { hexTextures } from "./spriteLoader.ts"
import { HexLocation } from "./Board.ts"
import { AbstractTile, TileType, TileColor, TileState, TileOwner } from "./AbstractTile.ts"

console.log("Loaded: HexTile.ts");

/* HexTile.ts
 * The HexTile class is the visual extension to AbstractTile. See AbstractTile.ts.
 * AbstractTile contains everything to make the game work. HexTile adds graphical
 * components showing the gameplay.
 */

class HexTile extends AbstractTile {
  // This first part gives access to the dimensions and shape of the hexagonal sprites.
  static widthOfSprite : number;
  static heightOfSprite : number;
  // The margin is the blank area around each hexagon.
  static marginAroundSprite : number;

  // This is the vertical distance from the top of the hexagon to the top of the vertical sides.
  static getSpriteRowOverlap(){
    return HexTile.getSpriteColumnWidth()/(2*Math.sqrt(3));
  }

  static getSpriteHorizontalMargin(){
    return HexTile.marginAroundSprite;
  }

  static getSpriteVerticalMargin(){
    return HexTile.marginAroundSprite*2/Math.sqrt(3); 
  }

  // The vertical distance from the top of the hexagon to the bottom of the vertical sides.
  static getSpriteRowHeight(){
    return HexTile.getSpriteVerticalMargin() + HexTile.heightOfSprite - HexTile.getSpriteRowOverlap();
  }

  // This is the horizontal width of the sprite + margin.
  static getSpriteColumnWidth(){
    return HexTile.getSpriteHorizontalMargin() + HexTile.widthOfSprite;
  }

  // This is the vertical height of the sprite + margin.
  static getSpriteRowOuterHeight(){
    return HexTile.getSpriteVerticalMargin() + HexTile.heightOfSprite;
  }



  // Determines whether two given HexLocations are adjacent as hexagons
  static adjacentCoords(sCoords : HexLocation, tCoords : HexLocation){
    const di = (1-2*(sCoords.j % 2))*(sCoords.i - tCoords.i);
    const dj = sCoords.j - tCoords.j;
    return ((dj == 0 && di == -1) || (dj == -1 && di == 0) || (dj == 1 && di == 0) || (di == 1 && Math.abs(dj) <= 1));
  }


  sprite : PIXI.Sprite;

  constructor(i : number, j : number, type : TileType = TileType.Bee, color : TileColor = TileColor.Green){
    super(i, j, type, color);
  
    this.sprite = new PIXI.Sprite();
    this.sprite.anchor.set(0.5,0.5);
  }

  // reposition //
  // Move center of sprite to (x, y)
  reposition(x : number, y : number){
    this.sprite.x = x;
    this.sprite.y = y;
  }

  // resize //
  // Change dimensions of the sprite.
  resize(width : number, height : number){
    this.sprite.width = width;
    this.sprite.height = height;
  }

  updateSprite(){
    if (game.state != GameState.Loading){
      if(this.type != TileType.Off && this.type != TileType.On){
        this.sprite.texture = hexTextures[this.type][this.color][this.state];
      }
    }
  }

  setOwner(owner : TileOwner){
    super.setOwner(owner);
    this.sprite.tint = 0x888888;
  }

  resetOwner(){
    super.resetOwner();
    this.sprite.tint = 0xFFFFFF;
  }
}

export { HexTile, TileType, TileColor, TileState }