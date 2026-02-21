import { AudioClip } from "../engine/index.js";

export const sounds = {
  atTheShore:  new AudioClip("/assets/audio/At The Shore.mp3"),
  seaAmbiance: new AudioClip("/assets/audio/seaambiance.mp3"),
  burning:     new AudioClip("/assets/audio/burning.mp3"),
  chop:        new AudioClip("/assets/audio/chop.wav"),
  damage:      new AudioClip("/assets/audio/damage.wav"),
  damageOther: new AudioClip("/assets/audio/damageOther.wav"),
  grill:       new AudioClip("/assets/audio/grill.mp3"),
  die:         new AudioClip("/assets/audio/die.wav"),
  ignite:      new AudioClip("/assets/audio/ignite.mp3"),
  kill:        new AudioClip("/assets/audio/kill.wav"),
  pickups: [
    new AudioClip("/assets/audio/pickup.wav"),
    new AudioClip("/assets/audio/pickup2.wav"),
    new AudioClip("/assets/audio/pickup3.wav"),
    new AudioClip("/assets/audio/pickup4.wav"),
    new AudioClip("/assets/audio/pickup5.wav"),
  ],
  place:       new AudioClip("/assets/audio/place.wav"),
  loot:        new AudioClip("/assets/audio/loot.wav"),
  treeshake:   new AudioClip("/assets/audio/treeshake.mp3"),
  watertake:   new AudioClip("/assets/audio/watertake.mp3"),
};
