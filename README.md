# Potion Debugger

Game debugger for [Potion framework](https://github.com/jansedivy/potion)

## Installation

`npm install potion-debugger`

## Features

- runtime informations
- togglable settings
- logging
- pretty printing objects, arrays
- error logging with stack traces (even with Browserify using [source-map-support](https://github.com/evanw/node-source-map-support))

## Usage

Debugger requires some methods to be called

- *update* - must be called with `time` in exitUpdate hook
- *render* - must be called in render hook
- *keydown* - must be called with `key` in keydown hook

Debugger also requires runtime property with time on the Potion instance for displaying total game time

```javascript
var Debugger = require('potion-debugger');

Potion.init(document.querySelector('canvas'), {
  init: function() {
    this.runtime = {
      time: 0
    };

    this.debug = new Debugger(this);
  },

  update: function(time) {
    this.runtime.time += time;
  },

  exitUpdate: function(time) {
    this.debug.update(time);
  },

  render: function() {
    this.debug.render();
  },

  keydown: function(key) {
    this.debug.keydown(key);
  }
});
```

## Keyboard shortcuts

- **F12** toggles all debug rendering
- **\** shows user defined togglable options

## API

### log(message, color=white)

#### message

Value you want to print to the screen, can be any javascript value (string, object, array, ...)

#### color

Color you want to use for printing the message

## License

[MIT license](http://opensource.org/licenses/mit-license.php)
