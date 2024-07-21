import { PIXI } from "./index"
import { app, DEBUG, debugBoxes, debugContainer } from "./makeStage"
import { HexTile, TileType, TileColor, TileState } from "./HexTile"
import { AbstractBoard, HexLocation } from "./AbstractBoard"
import { game, Game, GameState } from "./Game"
import { swapTranslationTween } from "./animations"

/* Board.ts
 * 
 * Implements the game board class, extending AbstractBoard.
 * Adds containers and visual components to the abstract board.
 * 
 * Terminology: 
 *  - Screen space is the coordinate space with the origin at the top left of the screen. No scaling.
 *  - Game space is the coordinate space with the origin at the top left of the stage. No scaling.
 *  - Board space is the coordinate space with the origin at the top left of the board container.
 *    For display purposes, the board is scaled down to fit into the specified width and height, but board space is not.
 *    Board space is scaled up to the actual dimensions of the sprites on the board container.
 *  - Coordinates in all three spaces are of the form { x : number, y : number}.
 *
 *  - HexLocation is different. A hex location is an integer pair { i : number, j : integer} that specifies a hexagon
 *    in the hexagonal tiling of the board. See AbstractBoard for an explanation of the location system.
 */

console.log("Loaded: Board");

class Board extends AbstractBoard {
  // x, y: The top right corner of the area given to draw the board.
  x : number;
  y : number;

  // width, height: The visual dimensions given to draw the board.
  width : number;
  height : number;

  // visualScale : The scale of the board container so that the board fits inside width and height.
  visualScale : number;

  // container : The container to hold the sprites etc.
  container : PIXI.Container;

  // Tiles undergoing animation.
  activeTiles : HexTile[];

  // debugContainer : For displaying whatever visuals are needed for debugging.
  debugContainer : PIXI.Container;

  constructor(x : number = 0, y : number = 0, width : number, height : number, gridWidth : number, gridHeight : number){
    super(gridWidth, gridHeight)

    this.activeTiles = [];
    
    this.x = x;
    this.y = y;

    for (let i = 0; i < this.gridWidth; i++){
      for (let j = 0; j < this.gridHeight; j++){
        this.grid[i][j].board = this;
      }
    }
    
    this.container = new PIXI.Container();
    this.container.sortableChildren = true;

    this.resize(width, height);

    this.debugContainer = new PIXI.Container();
    this.container.addChild(this.debugContainer);
  }

  // addSpritesToBoard //
  // Populates the board tiles with sprites.
  addSpritesToBoard(){
    for (let i = 0; i < this.gridWidth; i++){
      for (let j = 0; j < this.gridHeight; j++){
        if (this.grid[i][j] != null){
          const coords = this.getTileCenterCoordinates(i, j);
          this.grid[i][j].reposition(coords.x, coords.y);
          this.grid[i][j].updateSprite();
          this.container.addChild(this.grid[i][j].sprite);
        }
      }
    }
  }

  // swapTiles //
  // Exchange tiles s and t, both assumed not null.
  swapTiles(s : HexTile, t : HexTile){
    super.swapTiles(s, t);
    let tmp : number;
    tmp = s.x;
    s.x = t.x;
    t.x = tmp;
    
    tmp = s.y;
    s.y = t.y;
    t.y = tmp;

    s.stopAnimation("swapTranslation");
    t.stopAnimation("swapTranslation");
  }

  // screenToBoardspace //
  // Translates coordinates in screenspace into boardspace.
  // That is, it shifts the origin from the top-left corner of the page to the top-left
  // corner of the board container.
  screenToBoardspace(coordinates : { x : number, y : number}){
    const out = {x : -1, y : -1};
    coordinates = Game.screenToGamespace(coordinates);
    out.x = Math.floor((coordinates.x - this.container.x)/this.visualScale);
    out.y = Math.floor((coordinates.y - this.container.y)/this.visualScale);
    return out;
  }

  // coordinatesOverBoard //
  // Determines whether the coordinates are roughly over the board area.
  coordinatesOverBoard(coordinates : { x : number, y : number}) : boolean{
    const bsPos = this.screenToBoardspace(coordinates);
    return (bsPos.y >= 0 && bsPos.y < this.getActualHeight());
  }

  // getTileCenterCoordinates //
  // Finds the idealized coordinates of the center of a tile at the given hex location (in boardspace coordinates).
  // It doesn't look at the tile itself, just at the board parameters.
  // Accepts either a hex location { i : number, j : number } or the individual components i and j.
  getTileCenterCoordinates(i : number | HexLocation, j? : number){
    if (typeof(i) !== "number"){
      j = i.j;
      i = i.i;
    }
    const location = { x : -1, y : -1};

    location.x = i*HexTile.getSpriteColumnWidth();
    location.x += HexTile.getSpriteHorizontalMargin()/2 + HexTile.widthOfSprite/2;
    if (j % 2 == 1){
      location.x += HexTile.getSpriteColumnWidth()/2;
    }

    location.y = j*HexTile.getSpriteRowHeight();
    location.y += HexTile.getSpriteVerticalMargin()/2 + HexTile.heightOfSprite/2;

    return location;
  }

  // getTileLocation //
  // An inverse of sorts to getTileCenterCoordinates.
  // Given screenspace coordinates, returns hex location of the tile under those coordinates.
  // These hex locations are extended beyond the board, to an infinite hexagonal tiling, so they may not actually correspond to a tile.
  getTileLocation(coordinates : { x : number, y : number}){
    const bsPos = this.screenToBoardspace(coordinates);
    //console.log("(" + coordinates.x + ", " + coordinates.y + ")      " + "(" + bsPos.x + ", " + bsPos.y + ")");
    const distanceToTopOfRow = bsPos.y % HexTile.getSpriteRowHeight();
    let row = Math.floor(bsPos.y/HexTile.getSpriteRowHeight());
    let column : number;
    // Either on row or row-1. Let's figure out which.
    if (distanceToTopOfRow < HexTile.getSpriteRowOverlap()){
      // Here we're in the awkward overlap place between rows.
      let distanceToRightOfHex : number;
      if (row % 2 == 0){
        distanceToRightOfHex = bsPos.x % HexTile.getSpriteColumnWidth();
      }else{
        distanceToRightOfHex = (bsPos.x - HexTile.getSpriteColumnWidth()/2) % HexTile.getSpriteColumnWidth();
      }
      const distanceToVerticalCenterOfHex = Math.abs(distanceToRightOfHex - HexTile.getSpriteColumnWidth()/2);
      if (distanceToVerticalCenterOfHex > distanceToTopOfRow*Math.sqrt(3)){
        row -= 1;
      }
    }
    // Now we've figured out the right row. Working out the column is easy.
    if (row % 2 == 0){
      column = Math.floor(bsPos.x/HexTile.getSpriteColumnWidth());
    }else{      
      column = Math.floor(bsPos.x/HexTile.getSpriteColumnWidth() - 1/2);
    }
    return { i : column, j : row }
  }

  // getDistanceToTileCenter //
  // Computes l2-distance to the center of the closest hexagon to the coordinates
  // Coordinates are in screen space.
  getDistanceToTileCenter(coordinates : { x : number, y : number}){
    const hexCoords = this.getTileLocation(coordinates);
    const closest = this.getTileCenterCoordinates(hexCoords);
    const bsPos = this.screenToBoardspace(coordinates);
    return Math.sqrt(Math.pow(bsPos.x - closest.x, 2) + Math.pow(bsPos.y - closest.y, 2));
  }

  //For debugging: draw the "true" grid of hexes on this.debugContainer in red lines.
  showIdealHexes(){
    function getHexCorners(pos : { x : number, y : number}){
      return [ {x : pos.x , y : pos.y - HexTile.getSpriteRowOuterHeight()/2 },
               {x : pos.x + HexTile.getSpriteColumnWidth()/2 , y : pos.y - (HexTile.getSpriteRowOuterHeight()/2 - HexTile.getSpriteRowOverlap()) },
               {x : pos.x + HexTile.getSpriteColumnWidth()/2 , y : pos.y + (HexTile.getSpriteRowOuterHeight()/2 - HexTile.getSpriteRowOverlap()) },
               {x : pos.x , y : pos.y + HexTile.getSpriteRowOuterHeight()/2 },
               {x : pos.x - HexTile.getSpriteColumnWidth()/2 , y : pos.y + (HexTile.getSpriteRowOuterHeight()/2 - HexTile.getSpriteRowOverlap()) },
               {x : pos.x - HexTile.getSpriteColumnWidth()/2 , y : pos.y - (HexTile.getSpriteRowOuterHeight()/2 - HexTile.getSpriteRowOverlap()) } ];
    }

    const graphics = new PIXI.Graphics();
    graphics.lineStyle(3, 0xFF0000);
    graphics.alpha = 0.5;
    for (let i = 0; i < this.gridWidth; i++){
      for (let j = 0; j < this.gridHeight; j++){
        const pos = this.getTileCenterCoordinates(i, j);
        const pts = getHexCorners(pos);
        graphics.moveTo(pts[0].x, pts[0].y);
        graphics.lineTo(pts[1].x, pts[1].y);
        graphics.lineTo(pts[2].x, pts[2].y);
        graphics.lineTo(pts[3].x, pts[3].y);
        graphics.lineTo(pts[4].x, pts[4].y);
        graphics.lineTo(pts[5].x, pts[5].y);
        graphics.closePath();
      }
    }
    this.debugContainer.addChild(graphics);
  }

  // getActualWidth //
  // Returns the width of the hexTiles in the container in boardspace coordinates.
  getActualWidth(){
    const row = this.gridHeight == 1 ? 0 : 1;
    const location = this.getTileCenterCoordinates(this.gridWidth-1, row);
    return location.x + HexTile.getSpriteColumnWidth()/2;
  }

  // getActualHeight //
  // Returns the height of the hexTiles in the container in boardspace coordinates.
  getActualHeight(){
    const location = this.getTileCenterCoordinates(0, this.gridHeight-1);
    return location.y + HexTile.getSpriteRowOuterHeight()/2;
  }

  // getVisualWidth //
  // Returns the width of the hexTiles in the container in gamespace coordinates.
  getVisualWidth(){
    return this.visualScale*this.getActualWidth();
  }

  // getVisualHeight //
  // Returns the height of the hexTiles in the container in gamespace coordinates.
  getVisualHeight(){
    return this.visualScale*this.getActualHeight();
  }

  // centerContainer //
  // Moves the container to be centered on the rectangle with corners
  // (this.x, this.y) and (this.x + this.width, this.y + this.height).
  centerContainer(){
    this.container.x = this.x + (this.width - this.getVisualWidth())/2;
    this.container.y = this.y + (this.height - this.getVisualHeight())/2;
  }

  // reposition //
  // Changes this.x and this.y and moves the board visuals accordingly.
  reposition(x : number, y : number){
    this.x = x;
    this.y = y;
    this.centerContainer();
  }

  // resize //
  // Changes this.width and this.height and moves/resizes the board visuals accordingly.
  resize(width : number, height : number){
    this.width = width;
    this.height = height;
    // Recompute visual scale
    // The scale should make the board as large as possible within the width/height allowed.
    // Figure out whether the width or the height is the bottleneck:
    const allowedRatio = this.width/this.height;
    const actualRatio = this.getActualWidth()/this.getActualHeight();
    if (allowedRatio >= actualRatio){
      // height is the bottleneck
      console.log("Height is the bottleneck");
      this.visualScale = this.height/this.getActualHeight();
    }else{
      // width is the bottleneck
      console.log("Width is the bottleneck");
      this.visualScale = this.width/this.getActualWidth();
    }

    // Rescale the container
    this.container.scale.x = this.visualScale;
    this.container.scale.y = this.visualScale;

    // Now center the container inside the available width/height
    this.centerContainer();

  }

  // showFrame //
  // Draws rectangular frame around the board.
  // For debugging only.
  showFrame(){
    const containerFrame = new PIXI.Graphics();
    containerFrame.lineStyle(3, 0xFFFFFF);
    containerFrame.drawRect(0, 0, this.getActualWidth(), this.getActualHeight());
    this.debugContainer.addChild(containerFrame);
  }
}

export { Board, HexLocation }

