export function getImage(url: string): HTMLImageElement {
    const img = new Image();
    img.src = url;
    return img;
}

/**
 * Creates a version of the image with a colored outline around non-transparent pixels.
 * Returns a promise that resolves once the source image is loaded and the outline is rendered.
 */
export function createOutlinedImage(
    source: HTMLImageElement,
    outlineWidth: number,
    outlineColor: string
): Promise<HTMLImageElement> {
    function render(): HTMLImageElement {
        const w = source.naturalWidth;
        const h = source.naturalHeight;
        const pad = outlineWidth;

        const canvas = document.createElement("canvas");
        canvas.width = w + pad * 2;
        canvas.height = h + pad * 2;
        const ctx = canvas.getContext("2d")!;

        // Draw the source image in each offset direction to create the outline shape
        ctx.globalCompositeOperation = "source-over";
        for (let dx = -outlineWidth; dx <= outlineWidth; dx++) {
            for (let dy = -outlineWidth; dy <= outlineWidth; dy++) {
                if (dx * dx + dy * dy > outlineWidth * outlineWidth) continue;
                ctx.drawImage(source, pad + dx, pad + dy);
            }
        }

        // Tint the entire silhouette with the outline color
        ctx.globalCompositeOperation = "source-in";
        ctx.fillStyle = outlineColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw the original image on top
        ctx.globalCompositeOperation = "source-over";
        ctx.drawImage(source, pad, pad);

        const result = new Image();
        result.src = canvas.toDataURL();
        return result;
    }

    if (source.complete && source.naturalWidth > 0) {
        return Promise.resolve(render());
    }

    return new Promise((resolve, reject) => {
        source.addEventListener("load", () => resolve(render()), { once: true });
        source.addEventListener("error", () => reject(new Error(`Failed to load image: ${source.src}`)), { once: true });
    });
}
