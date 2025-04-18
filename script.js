class Player {
  constructor(game) {
    this.game = game;
    this.width = 100;
    this.height = 100;
    this.x = this.game.width * 0.5 - this.width * 0.5;
    this.y = this.game.height - this.height;
    this.speed = 5;
    this.lives = 3;
  }
  draw(context) {
    context.fillRect(this.x, this.y, this.width, this.height);
  }
  shoot() {
    const projectile = this.game.getProjectile();
    if (projectile) projectile.start(this.x + this.width * 0.5, this.y);
  }

  restart() {
    this.x = this.game.width * 0.5 - this.width * 0.5;
    this.y = this.game.height - this.height;
    this.lives = 3;
  }
  update() {
    // horizontal movement
    if (this.game.keys.indexOf("ArrowLeft") > -1) this.x -= this.speed;
    if (this.game.keys.indexOf("ArrowRight") > -1) this.x += this.speed;
    // horizontal boundaries
    if (this.x < -this.width * 0.5) this.x = -this.width * 0.5;
    else if (this.x > this.game.width - this.width * 0.5)
      this.x = this.game.width - this.width * 0.5;
  }
}

class Projectile {
  constructor() {
    this.width = 8;
    this.height = 20;
    this.x = 0;
    this.y = 0;
    this.speed = 20;
    this.free = true;
  }
  draw(context) {
    if (!this.free) {
      context.fillRect(this.x, this.y, this.width, this.height);
    }
  }

  update() {
    if (!this.free) {
      this.y -= this.speed;
      if (this.y < -this.height) this.reset();
    }
  }
  start(x, y) {
    this.x = x - this.width;
    this.y = y;
    this.free = false;
  }
  reset() {
    this.free = true;
  }
}

class Enemy {
  constructor(game, positionX, positionY) {
    this.game = game;
    this.width = this.game.enemySize;
    this.height = this.game.enemySize;
    this.x = 0;
    this.y = 0;
    this.positionX = positionX;
    this.positionY = positionY;
    this.markedForDeletion = false;
  }

  draw(context) {
    context.strokeRect(this.x, this.y, this.width, this.height);
  }
  update(x, y) {
    this.x = x + this.positionX;
    this.y = y + this.positionY;
    // check collision enemies - projectiles
    this.game.projectilesPool.forEach((projectile) => {
      if (!projectile.free && this.game.checkCollision(this, projectile)) {
        this.markedForDeletion = true;
        projectile.reset();
        this.game.score++;
      }
    });
    // check collision enemies - player
    if (this.game.checkCollision(this, this.game.player)) {
      this.markedForDeletion = true;
      if (!this.game.gameOver && this.game.score > 0) this.game.score--;
      this.game.player.lives--;
      if (this.game.player.lives < 1) this.game.gameOver = true;
    }
    if (this.y + this.height > this.game.height) {
      // lose condition
      this.game.gameOver = true;
      this.markedForDeletion = true;
    }
  }
}

class Wave {
  constructor(game) {
    this.game = game;
    this.width = this.game.columns * this.game.enemySize;
    this.height = this.game.rows * this.game.enemySize;
    this.x = 0;
    this.y = 0 - this.height;
    this.speedX = 2;
    this.speedY = 0;
    this.enemies = [];
    this.nextWaveTrigger = false;
    this.create();
  }
  render(context) {
    if (this.y < 0) this.y += 5;
    this.speedY = 0;
    // context.strokeRect(this.x, this.y, this.width, this.height);

    if (this.x < 0 || this.x > this.game.width - this.width) {
      this.speedX *= -1;
      this.speedY += this.game.enemySize;
    }
    this.x += this.speedX;
    this.y += this.speedY;
    this.enemies.forEach((enemy) => {
      enemy.update(this.x, this.y);
      enemy.draw(context);
    });
    this.enemies = this.enemies.filter((object) => !object.markedForDeletion);
  }
  create() {
    for (let y = 0; y < this.game.rows; y++) {
      for (let x = 0; x < this.game.columns; x++) {
        let enemyX = x * this.game.enemySize;
        let enemyY = y * this.game.enemySize;
        this.enemies.push(new Enemy(this.game, enemyX, enemyY));
      }
    }
  }
}

class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.width = this.canvas.width;
    this.height = this.canvas.height;
    this.keys = [];
    this.player = new Player(this);

    //projectiles
    this.projectilesPool = [];
    this.numberOfProjectiles = 10;
    this.createProjectile();
    console.log(this.projectilesPool);

    //waves
    this.columns = 2;
    this.rows = 2;
    this.enemySize = 60;

    this.waves = [];
    this.waves.push(new Wave(this));
    this.waveCount = 1;

    //score
    this.score = 0;
    this.gameOver = false;

    // event listeners
    window.addEventListener("keydown", (e) => {
      // if (!this.keys.includes(e.key))  this.keys.push(e.key);
      if (this.keys.indexOf(e.key) === -1) this.keys.push(e.key);
      if (e.key === "1") this.player.shoot();
      console.log(this.keys);
    });
    window.addEventListener("keyup", (e) => {
      const index = this.keys.indexOf(e.key);
      if (index > -1) this.keys.splice(index, 1);
      console.log(this.keys);
    });
  }
  render(context) {
    this.drawStatusText(context);
    this.player.draw(context);
    this.player.update();

    this.projectilesPool.forEach((projectile) => {
      projectile.update();
      projectile.draw(context);
    });
    this.waves.forEach((wave) => {
      wave.render(context);
      if (wave.enemies.length < 1 && !wave.nextWaveTrigger && !this.gameOver) {
        this.newWave();
        this.waveCount++;
        wave.nextWaveTrigger = true;
        this.player.lives++;
      }
    });
  }
  // create projectile object pool
  createProjectile() {
    for (let i = 0; i < this.numberOfProjectiles; i++) {
      this.projectilesPool.push(new Projectile());
    }
  }
  // helper method
  // get free projectile object
  getProjectile() {
    for (let i = 0; i < this.projectilesPool.length; i++) {
      if (this.projectilesPool[i].free) return this.projectilesPool[i];
    }
  }
  // collission detectedbetween 2 rectangles
  checkCollision(a, b) {
    // use Return to get T or F ... I could use IF(){} but this also works
    return (
      // checks if the top left of rect A is to the left of  top right of Rect B
      a.x < b.x + b.width &&
      // checks if right top of rectangle A is to the right of  the top left part of Rect B
      a.x + a.width > b.x &&
      // checks if top left of rect A is to the left of bottom left of rectangle B
      a.y < b.y + b.height &&
      // checks if left bottom side of rectangle A is below top left side of rectangle B
      a.y + a.height > b.y
    );
  }
  drawStatusText(context) {
    context.save();
    context.shadowOffsetX = 2;
    context.shadowOffsetY = 2;
    context.shadowColor = "black";
    context.fillText("Score :" + this.score, 20, 40);
    context.fillText("Wave: " + this.waveCount, 20, 80);
    for (let i = 0; i < this.player.lives; i++) {
      context.fillRect(20 + 10 * i, 100, 5, 20);
    }
    if (this.gameOver) {
      context.textAlign = "center";
      context.font = "100px Impact";
      context.fillText("GAME OVER!", this.width * 0.5, this.height * 0.5);
      context.font = "20px Impact";
      context.fillText(
        "Press R to restart",
        this.width * 0.5,
        this.height * 0.6
      );
    }
    context.restore();
  }
  newWave() {
    if (
      Math.random() < 0.5 &&
      this.columns * this.enemySize < this.width * 0.8
    ) {
      this.columns++;
    } else if (this.rows * this.enemySize < this.height * 0.6) {
      this.rows++;
    }
    this.waves.push(new Wave(this));
  }
  restart() {
    this.player.restart();
  }
}

window.addEventListener("load", function () {
  const canvas = document.getElementById("canvas1");
  const ctx = canvas.getContext("2d");
  canvas.width = 600;
  canvas.height = 800;
  ctx.fillStyle = "white";
  ctx.strokeStyle = "white";
  ctx.linewidth = 5;
  ctx.font = "30px Impact";

  const game = new Game(canvas);
  // console.log(game);
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    game.render(ctx);
    window.requestAnimationFrame(animate);
  }
  animate();
});
