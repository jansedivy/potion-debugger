# Potion Debugger

Game debugger for [Potion framework](https://github.com/jansedivy/potion)

## Screenshot

<img width="513" height="345" src="http://cl.ly/image/2d3X451M3K1B/Screen%20Shot%202014-07-30%20at%2013.00.24.png?"/>

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

## Custom options

When creating debugger instance you can pass array of options you want to configure

Keyboard shortcuts are automatically defined based on the position in array

There are already defined 3 custom options for showing fps, time and key/button codes

```javascript
this.debug = new Debugger(this, [
  { name: 'Show Pathfinding', entry: 'showPathFinding' }
  { name: 'Alert', type: 'call', entry: function() { alert('debug'); } }
]);
```

#### name

Rendered name for the option

#### type

defaults to `toggle`, can be `toggle` or `call`

#### default

default value

#### entry

When type is `toggle` entry will be defined as property on debug instance

###### example

```javascript
if (this.debug.showPathFinding) {
  // render
}
```

When type is `call` entry is going to be called as function

## API

### log(message, color=white)

#### message

Value you want to print to the screen, can be any javascript value (string, object, array, ...)

#### color

Color you want to use for printing the message

## License

[MIT license](http://opensource.org/licenses/mit-license.php)
