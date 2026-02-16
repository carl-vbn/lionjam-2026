# TypeScript 2D game engine

An engine based on the HTML5 canvas and 2D rendering context to render tile based games on the web.

## High level overview

The engine should support rendering to an HTML Canvas taking up the fullscreen, while being responsive (dynamically resizing itself according to the page). The engine should provide a camera object that can be moved in 2D, and be zoomed in and out. It should also provide a world object that contains the tiles. A title is an instance of a class that provides a draw method. The world object should have a draw method that takes a context as parameter.

The context should be an abstraction around the native 2D canvas rendering context, and its interface should be agnostic to camera movement and zoom. It itself holds a reference to the camera, allowing it to apply the appropriate transformations before drawing to the real canvas context.

The context should also have pushTransform and popTransform functions. A transformations should have translation (vector), scale (number), and rotation (number), as well as a center (only applicable to scaling and rotation). The base unit in the context should be the tile, so a translation of 1 is the length of one tile (of course this can change if a transform was pushed).

The engine should expose a function for the user to create a rendering context specifying a camera, a window, and a canvas object. The camera should be swappable at runtime. The context should automatically listen for page resizes and adapt the canvas size.

The user can then create a world and call the draw function, supplying the context.

## Additional features

The engine should handle mouse and keyboard inputs. Each tile subclass should be able to override an onClick function to detect clicks. There should be a way to register a mouse listener and a keyboard listener.

The engine should also contain a simple 2D vector math library.

The engine should be able to play sounds, created in advance as audio clips with file names, and played back on demand.

The engine should make sure not to draw tiles that are outside of the camera view for optimization purpose, but this should work for different screen sizes and aspect ratios.

The context should have a function to draw text with custom fonts.

There should be a simple particle effect system, given a sprite, a number of particles, and a position, it should draw multiple instances of the sprite with random rotations expanding outwards and fading out.