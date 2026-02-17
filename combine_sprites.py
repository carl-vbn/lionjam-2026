#!/usr/bin/env python3
import sys
from PIL import Image

if len(sys.argv) < 3:
    print(f"Usage: {sys.argv[0]} output.png input1.png input2.png ...")
    sys.exit(1)

output_path = sys.argv[1]
input_paths = sys.argv[2:]

images = [Image.open(p) for p in input_paths]

total_width = sum(img.width for img in images)
max_height = max(img.height for img in images)

result = Image.new("RGBA", (total_width, max_height))

x = 0
for img in images:
    result.paste(img, (x, 0))
    x += img.width

result.save(output_path)
print(f"Saved {output_path} ({total_width}x{max_height}, {len(images)} frames)")
