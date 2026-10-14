import Phaser from "phaser";
import BootScene from "./scenes/BootScene";
import GameScene from "./scenes/GameScene";
import "./../styles.css";

const game = new Phaser.Game({
  type: Phaser.AUTO,
  width: 960,
  height: 580,
  parent: "game",
  backgroundColor: "#c6dfa7",
  scene: [BootScene, GameScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  render: {
    antialias: true,
    pixelArt: false
  }
});

window.addEventListener("beforeunload", () => game.destroy(true));
