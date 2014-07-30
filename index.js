var util = require('util');
var sourceMaps = require('source-map-support');

var indexToNumberAndLowerCaseKey = function(index) {
  if (index <= 9) {
    return 48 + index;
  } else if (index === 10) {
    return 48;
  } else if (index > 10 && index <= 36) {
    return 64 + (index-10);
  } else {
    return null;
  }
};

var defaults = [
  { name: 'Show FPS', entry: 'showFps', default: true },
  { name: 'Show Key Codes', entry: 'showKeyCodes', default: true },
  { name: 'Show Time', entry: 'showTime', default: true }
];

var Debugger = function(app, options) {
  this.app = app;
  options = options || [];

  options = options.concat(defaults);

  this.options = options;

  for (var i=0; i<options.length; i++) {
    var option = options[i];
    option.type = option.type || 'toggle';
    option.default = option.default == null ? false : option.default;

    if (option.type === 'toggle') {
      this[option.entry] = option.default;
    }
  }

  if (window.localStorage && window.localStorage.__debug) {
    var data = JSON.parse(window.localStorage.__debug);
    for (var name in data) {
      this[name] = data[name];
    }
  }

  sourceMaps.install();

  this.fps = 0;
  this.fpsCount = 0;
  this.fpsElapsedTime = 0;
  this.fpsUpdateInterval = 0.5;

  this.logs = [];

  this.showDebug = true;
  this.enableDebugKeys = true;
  this.enableShortcuts = false;

  this.enableShortcutsKey = 220;

  this.lastKey = null;

  this.keyShortcuts = [
    { key: 123, entry: 'showDebug', type: 'toggle' }
  ];

  var self = this;

  window.addEventListener('error', function(error) {
    self.log(error.error.stack, 'red');
  });
};

Debugger.prototype.log = function(message, color) {
  color = color || 'white';
  message = typeof message === 'string' ? message : util.inspect(message);

  var messages = message.replace(/\\'/g, "'").split('\n');

  for (var i=0; i<messages.length; i++) {
    var msg = messages[i];
    this.logs.push({ text: msg, life: 10, color: color });
  }
};

Debugger.prototype.enterUpdate = function() {
  if (this.pause) {
    return true;
  }
};

Debugger.prototype.update = function(time) {
  if (this.showDebug) {
    this.fpsCount += 1;
    this.fpsElapsedTime += time;

    if (this.fpsElapsedTime > this.fpsUpdateInterval) {
      var fps = this.fpsCount/this.fpsElapsedTime;

      if (this.showFps) {
        this.fps = this.fps * (1-0.8) + 0.8 * fps;
      }

      this.fpsCount = 0;
      this.fpsElapsedTime = 0;
    }

    for (var i=0, len=this.logs.length; i<len; i++) {
      var log = this.logs[i];
      if (log) {
        log.life -= time;
        if (log.life <= 0) {
          var index = this.logs.indexOf(log);
          if (index > -1) { this.logs.splice(index, 1); }
        }
      }
    }
  }
};

Debugger.prototype.keydown = function(key) {
  this.lastKey = key;

  var i;

  if (this.enableDebugKeys) {
    if (key === this.enableShortcutsKey) {
      this.enableShortcuts = !this.enableShortcuts;
      return true;
    }

    if (this.enableShortcuts) {
      for (i=0; i<this.options.length; i++) {
        var option = this.options[i];

        var keyIndex = i + 1;

        keyIndex = indexToNumberAndLowerCaseKey(keyIndex);

        if (keyIndex && key === keyIndex) {
          if (option.type === 'toggle') {

            this[option.entry] = !this[option.entry];

            var data = {};

            if (window.localStorage.__debug) {
              data = JSON.parse(window.localStorage.__debug);
            }

            data[option.entry] = this[option.entry];

            window.localStorage.__debug = JSON.stringify(data);

          } else if (option.type === 'call') {
            option.entry();
          }

          return true;
        }
      }
    }
  }

  for (i=0; i<this.keyShortcuts.length; i++) {
    var keyShortcut = this.keyShortcuts[i];
    if (keyShortcut.key === key) {

      if (keyShortcut.type === 'toggle') {
        this[keyShortcut.entry] = !this[keyShortcut.entry];
      } else if (keyShortcut.type === 'call') {
        this[keyShortcut.entry]();
      }

      return true;
    }
  }

  return false;
};

Debugger.prototype.render = function() {
  if (this.showDebug) {
    this.app.video.ctx.save();
    this.app.video.ctx.font = '15px sans-serif';

    this._renderLogs();
    this._renderData();
    this._renderShortcuts();

    this.app.video.ctx.restore();
  }
};

Debugger.prototype._renderLogs = function() {
  this.app.video.ctx.textAlign = 'left';
  this.app.video.ctx.textBaseline = 'bottom';

  for (var i=0, len=this.logs.length; i<len; i++) {
    var log = this.logs[i];

    var y = -10 + this.app.height + (i - this.logs.length + 1) * 20;
    this._renderText(log.text, 10, y, log.color);
  }
};

Debugger.prototype._renderData = function() {
  this.app.video.ctx.textAlign = 'right';
  this.app.video.ctx.textBaseline = 'top';

  var x = this.app.width - 14;
  var y = 14;

  if (this.showFps) {
    this._renderText(Math.round(this.fps) + ' fps', x, y);
  }

  y += 20;

  this.app.video.ctx.font = '20px sans-serif';
  if (this.showTime) {
    if (this.app.runtime && this.app.runtime.time != null) {
      this._renderText(this.app.runtime.time.toFixed(2) + ' s', x, y);
    }
  }
  y += 30;

  this.app.video.ctx.font = '15px sans-serif';

  if (this.showKeyCodes) {
    this._renderText('key ' + this.lastKey, x, y, this.app.input.isKeyDown(this.lastKey) ? '#e9dc7c' : 'white');
    this._renderText('btn ' + this.app.input.mouse.button, x - 60, y, this.app.input.mouse.isDown ? '#e9dc7c' : 'white');
  }
};


Debugger.prototype._renderShortcuts = function() {
  if (this.enableShortcuts) {
    var height = 24;

    this.app.video.ctx.textAlign = 'left';
    this.app.video.ctx.textBaseline = 'top';
    var maxPerCollumn = Math.floor((this.app.height - 14)/height);

    for (var i=0; i<this.options.length; i++) {
      var option = this.options[i];
      var x = 14 + Math.floor(i/maxPerCollumn) * 220;
      var y = 14 + i%maxPerCollumn * height;

      var keyIndex = i + 1;
      keyIndex = indexToNumberAndLowerCaseKey(keyIndex);

      var isOn = this[option.entry];

      var text = '[' + String.fromCharCode(keyIndex) + '] ' + option.name;
      if (option.type === 'toggle') {
        text += ' (' + (isOn ? 'ON' : 'OFF') + ')';
      } else if (option.type === 'call') {
        text += ' (CALL)';
      }

      var color = 'rgba(255, 255, 255, 1)';
      var outline = 'rgba(0, 0, 0, 1)';

      if (!isOn) {
        color = 'rgba(255, 255, 255, .7)';
        outline = 'rgba(0, 0, 0, .7)';
      }

      this._renderText(text, x, y, color, outline);
    }
  }
};

Debugger.prototype._renderText = function(text, x, y, color, outline) {
  color = color || 'white';
  outline = outline || 'black';
  this.app.video.ctx.fillStyle = color;
  this.app.video.ctx.lineJoin = 'round';
  this.app.video.ctx.strokeStyle = outline;
  this.app.video.ctx.lineWidth = 3;
  this.app.video.ctx.strokeText(text, x, y);
  this.app.video.ctx.fillText(text, x, y);
};

module.exports = Debugger;
