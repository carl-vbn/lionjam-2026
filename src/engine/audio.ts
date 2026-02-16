/**
 * A preloaded audio clip that can be played on demand.
 * Multiple overlapping playbacks are supported via cloneNode.
 */
export class AudioClip {
  private audio: HTMLAudioElement;
  private _loaded: boolean = false;

  get loaded(): boolean {
    return this._loaded;
  }

  constructor(src: string) {
    this.audio = new Audio(src);
    this.audio.addEventListener("canplaythrough", () => {
      this._loaded = true;
    }, { once: true });
  }

  /** Load the audio clip. Resolves when ready to play. */
  load(): Promise<void> {
    if (this._loaded) return Promise.resolve();
    return new Promise((resolve, reject) => {
      this.audio.addEventListener("canplaythrough", () => {
        this._loaded = true;
        resolve();
      }, { once: true });
      this.audio.addEventListener("error", () => {
        reject(new Error(`Failed to load audio: ${this.audio.src}`));
      }, { once: true });
      this.audio.load();
    });
  }

  /** Play the clip from the beginning. Returns the audio element used for playback. */
  play(volume: number = 1): HTMLAudioElement {
    const instance = this.audio.cloneNode(true) as HTMLAudioElement;
    instance.volume = volume;
    instance.play();
    return instance;
  }

  /** Play the clip in a loop. */
  playLooping(volume: number = 1): HTMLAudioElement {
    const instance = this.audio.cloneNode(true) as HTMLAudioElement;
    instance.volume = volume;
    instance.loop = true;
    instance.play();
    return instance;
  }
}
