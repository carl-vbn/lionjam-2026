/**
 * Simple asset loader for images.
 * Preloads images and caches them by path.
 */
export class AssetLoader {
  private cache: Map<string, HTMLImageElement> = new Map();

  /** Load a single image. Returns the cached image if already loaded. */
  loadImage(src: string): Promise<HTMLImageElement> {
    const cached = this.cache.get(src);
    if (cached) return Promise.resolve(cached);

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.cache.set(src, img);
        resolve(img);
      };
      img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
      img.src = src;
    });
  }

  /** Load multiple images in parallel. */
  loadImages(srcs: string[]): Promise<HTMLImageElement[]> {
    return Promise.all(srcs.map((src) => this.loadImage(src)));
  }

  /** Get a previously loaded image. Returns null if not loaded. */
  getImage(src: string): HTMLImageElement | null {
    return this.cache.get(src) ?? null;
  }
}
