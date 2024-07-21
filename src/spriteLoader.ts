import * as PIXI from 'pixi.js'
import { game, GameState, AssetsToLoad } from "./Game"
import { app, DEBUG, debugBoxes, debugContainer } from "./makeStage"
import { HexTile, TileType, TileColor, TileState } from "./HexTile"

console.log("Loaded: spriteLoader");

/* spriteLoader.ts
 * Loads sprites and puts them in appropriate structures.
 */


const hexTextures : any = {};

const miscTextures = {};

const assetsFilePath = "./assets/";
const hexSpriteSheetPath = assetsFilePath+"hexSpriteSheet.json";

PIXI.Assets.load(hexSpriteSheetPath).then(populateTextureDirectory);

function populateTextureDirectory() {
  // get a reference to the sprite sheet we've just loaded:
  const sheet = PIXI.Assets.get(hexSpriteSheetPath);
  const t = sheet.textures;
  

  // Create structure of hexTextures directoriy
  for (let type in TileType){
    hexTextures[type] = {};
      for (let color in TileColor){
        hexTextures[type][color] = {};
        for (let state in TileState){
          hexTextures[type][color][state] = null;
        }
      }
  }

  hexTextures[TileType.Bee][TileColor.Green][TileState.Active] = t["B-Green-Active.png"];
  hexTextures[TileType.Bee][TileColor.Green][TileState.Inactive] = t["B-Green-Inactive.png"];
  hexTextures[TileType.Bee][TileColor.Orange][TileState.Active] = t["B-Orange-Active.png"];
  hexTextures[TileType.Bee][TileColor.Orange][TileState.Inactive] = t["B-Orange-Inactive.png"];
  hexTextures[TileType.Bee][TileColor.Red][TileState.Active] = t["B-Red-Active.png"];
  hexTextures[TileType.Bee][TileColor.Red][TileState.Inactive] = t["B-Red-Inactive.png"];
  hexTextures[TileType.Bee][TileColor.Omni][TileState.Active] = t["B-Omni-Active.png"];
  hexTextures[TileType.Bee][TileColor.Omni][TileState.Inactive] = t["B-Omni-Inactive.png"];
  hexTextures[TileType.Flower][TileColor.Green][TileState.Active] = t["Green-Active.png"];
  hexTextures[TileType.Flower][TileColor.Green][TileState.Inactive] = t["Green-Inactive.png"];
  hexTextures[TileType.Flower][TileColor.Orange][TileState.Active] = t["Orange-Active.png"];
  hexTextures[TileType.Flower][TileColor.Orange][TileState.Inactive] = t["Orange-Inactive.png"];
  hexTextures[TileType.Flower][TileColor.Red][TileState.Active] = t["Red-Active.png"];
  hexTextures[TileType.Flower][TileColor.Red][TileState.Inactive] = t["Red-Inactive.png"];
  hexTextures[TileType.Flower][TileColor.GreenOrange][TileState.Active] = t["Green-Orange-Active.png"];
  hexTextures[TileType.Flower][TileColor.GreenOrange][TileState.Inactive] = t["Green-Orange-Inactive.png"];
  hexTextures[TileType.Flower][TileColor.GreenRed][TileState.Active] = t["Red-Green-Active.png"];
  hexTextures[TileType.Flower][TileColor.GreenRed][TileState.Inactive] = t["Red-Green-Inactive.png"];
  hexTextures[TileType.Flower][TileColor.OrangeRed][TileState.Active] = t["Orange-Red-Active.png"];
  hexTextures[TileType.Flower][TileColor.OrangeRed][TileState.Inactive] = t["Orange-Red-Inactive.png"];

  //otherTextures["rope-texture"] = t["dotted-line"];

  // Note the width and height of a representative sprite (it's assumed they're all the same)
  const representative = t["B-Green-Active.png"];
  HexTile.widthOfSprite = representative.width;
  HexTile.heightOfSprite = representative.height;
  HexTile.marginAroundSprite = Math.floor(representative.height/6);

  /*
  console.log("Sprite width : " + HexTile.widthOfSprite.toString());
  console.log("Sprite height : " + HexTile.heightOfSprite.toString());
  console.log("Sprite column width : " + HexTile.getSpriteColumnWidth().toString());
  console.log("Sprite row inner height : " + HexTile.getSpriteRowHeight().toString());
  console.log("Sprite row outer height : " + HexTile.getSpriteRowOuterHeight().toString());
  */

  game.setLoaded(AssetsToLoad.Hexes);
}

const trailTexture = PIXI.Texture.from(assetsFilePath+'dotted-line.png');
// const trailTexture = PIXI.Texture.from(assetsFilePath+'arrow-line.png');
const solidTexture = PIXI.Texture.from(assetsFilePath+'solid-line.png');

export { trailTexture, solidTexture, hexTextures };