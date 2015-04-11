var util = require('util');
var DirtyManager = require('./dirty-manager');

var ObjectPool = [];

var GetObjectFromPool = function() {
  var result = ObjectPool.pop();

  if (result) {
    return result;
  }

  return {};
};

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
  { name: 'Show FPS', entry: 'showFps', defaults: true },
  { name: 'Show Key Codes', entry: 'showKeyCodes', defaults: true },
  { name: 'Show Performance Graph', entry: 'showGraph', defaults: false }
];

var Debugger = function(app) {
  this.video = app.video.createLayer({
    useRetina: true,
    initializeCanvas: true
  });

  this.graph = app.video.createLayer({
    useRetina: false,
    initializeCanvas: true
  });

  this.app = app;

  this.options = defaults;
  this._maxLogsCounts = 10;

  for (var i=0; i<this.options.length; i++) {
    var option = this.options[i];
    this._initOption(option);
  }

  this.disabled = false;

  this.fps = 0;
  this.fpsCount = 0;
  this.fpsElapsedTime = 0;
  this.fpsUpdateInterval = 0.5;
  this._framePerf = [];

  this._fontSize = 0;
  this._dirtyManager = new DirtyManager(this.video.canvas, this.video.ctx);

  this.logs = [];

  this._perfValues = {};
  this._perfNames = [];

  this.showDebug = false;
  this.enableDebugKeys = true;
  this.enableShortcuts = false;

  this.enableShortcutsKey = 220;

  this.lastKey = null;

  this._load();

  this.keyShortcuts = [
    { key: 123, entry: 'showDebug', type: 'toggle' }
  ];
};

Debugger.prototype._setFont = function(px, font) {
  this._fontSize = px;
  this.video.ctx.font = px + 'px ' + font;
};

Debugger.prototype.resize = function() {
  this.video.setSize(this.app.width, this.app.height);
};

Debugger.prototype.addConfig = function(option) {
  this.options.push(option);
  this._initOption(option);
};

Debugger.prototype._initOption = function(option) {
  option.type = option.type || 'toggle';
  option.defaults = option.defaults == null ? false : option.defaults;

  if (option.type === 'toggle') {
    this[option.entry] = option.defaults;
  }
};

Debugger.prototype.clear = function() {
  this.logs.length = 0;
};

Debugger.prototype.log = function(message, color) {
  color = color || 'white';
  message = typeof message === 'string' ? message : util.inspect(message);

  var messages = message.replace(/\\'/g, "'").split('\n');

  for (var i=0; i<messages.length; i++) {
    var msg = messages[i];
    if (this.logs.length >= this._maxLogsCounts) {
      ObjectPool.push(this.logs.shift());
    }

    var messageObject = GetObjectFromPool();
    messageObject.text = msg;
    messageObject.life = 10;
    messageObject.color = color;

    this.logs.push(messageObject);
  }
};

Debugger.prototype.update = function() {};

Debugger.prototype.exitUpdate = function(time) {
  if (this.disabled) { return; }

  if (this.showDebug) {
    this._maxLogsCounts = Math.ceil((this.app.height + 20)/20);
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

Debugger.prototype.keydown = function(value) {
  if (this.disabled) { return; }

  this.lastKey = value.key;

  var i;

  if (this.enableDebugKeys) {
    if (value.key === this.enableShortcutsKey) {
      value.event.preventDefault();

      this.enableShortcuts = !this.enableShortcuts;
      return true;
    }

    if (this.enableShortcuts) {
      for (i=0; i<this.options.length; i++) {
        var option = this.options[i];
        var keyIndex = i + 1;

        if (this.app.input.isKeyDown('ctrl')) {
          keyIndex -= 36;
        }

        var charId = indexToNumberAndLowerCaseKey(keyIndex);

        if (charId && value.key === charId) {
          value.event.preventDefault();

          if (option.type === 'toggle') {

            this[option.entry] = !this[option.entry];

            this._save();
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
    if (keyShortcut.key === value.key) {
      value.event.preventDefault();

      if (keyShortcut.type === 'toggle') {
        this[keyShortcut.entry] = !this[keyShortcut.entry];
        this._save();
      } else if (keyShortcut.type === 'call') {
        this[keyShortcut.entry]();
      }

      return true;
    }
  }

  return false;
};

Debugger.prototype._save = function() {
  var data = {
    showDebug: this.showDebug,
    options: {}
  };

  for (var i=0; i<this.options.length; i++) {
    var option = this.options[i];
    var value = this[option.entry];
    data.options[option.entry] = value;
  }

  window.localStorage.__potionDebug = JSON.stringify(data);
};

Debugger.prototype._load = function() {
  if (window.localStorage && window.localStorage.__potionDebug) {
    var data = JSON.parse(window.localStorage.__potionDebug);
    this.showDebug = data.showDebug;

    for (var name in data.options) {
      this[name] = data.options[name];
    }
  }
};

Debugger.prototype.render = function() {
  if (this.disabled) { return; }

  this._dirtyManager.clear();

  if (this.showDebug) {
    this.video.ctx.save();
    this._setFont(15, 'sans-serif');

    this._renderLogs();
    this._renderData();
    this._renderShortcuts();

    this.video.ctx.restore();

    if (this.showGraph) {
      this.graph.ctx.drawImage(this.graph.canvas, 0, this.app.height - 100, this.app.width, 100, -2, this.app.height - 100, this.app.width, 100);

      this.graph.ctx.fillStyle = '#F2F0D8';
      this.graph.ctx.fillRect(this.app.width - 2, this.app.height - 100, 2, 100);

      var last = 0;
      for (var i=0; i<this._framePerf.length; i++) {
        var item = this._framePerf[i];
        var name = this._perfNames[i];
        var background = 'black';
        if (name === 'update') {
          background = '#6BA5F2';
        } else if (name === 'render') {
          background = '#F27830';
        }
        this.graph.ctx.fillStyle = background;

        var height = (item + last) * 100/16;
        if (height > 100) { height = 100; }

        this.graph.ctx.fillRect(this.app.width - 2, this.app.height - height, 2, height - (last * 100/16));

        last += item;
      }

      this._framePerf.length = 0;
    } else {
      this.graph.clear();
    }
  }
};

Debugger.prototype._renderLogs = function() {
  this.video.ctx.textAlign = 'left';
  this.video.ctx.textBaseline = 'bottom';

  for (var i=0, len=this.logs.length; i<len; i++) {
    var log = this.logs[i];

    var y = -10 + this.app.height + (i - this.logs.length + 1) * 20;
    this._renderText(log.text, 10, y, log.color);
  }
};

Debugger.prototype.disable = function() {
  this.disabled = true;
};

Debugger.prototype.perf = function(name) {
  if (!this.showDebug) { return; }

  var exists = this._perfValues[name];

  if (exists == null) {
    this._perfNames.push(name);

    this._perfValues[name] = {
      name: name,
      value: 0,
      records: []
    };
  }

  var time = window.performance.now();

  var record = this._perfValues[name];

  record.value = time;
};

Debugger.prototype.stopPerf = function(name) {
  if (!this.showDebug) { return; }

  var record = this._perfValues[name];

  var time = window.performance.now();
  var diff = time - record.value;

  record.records.push(diff);
  if (record.records.length > 10) {
    record.records.shift();
  }

  var sum = 0;
  for (var i=0; i<record.records.length; i++) {
    sum += record.records[i];
  }

  var avg = sum/record.records.length;

  record.value = avg;
  this._framePerf.push(diff);
};

Debugger.prototype._renderData = function() {
  this.video.ctx.textAlign = 'right';
  this.video.ctx.textBaseline = 'top';

  var x = this.app.width - 14;
  var y = 14;

  if (this.showFps) {
    this._renderText(Math.round(this.fps) + ' fps', x, y);
  }

  y += 24;

  this._setFont(15, 'sans-serif');

  if (this.showKeyCodes) {
    var buttonName = '';
    if (this.app.input.mouse.isLeftDown) {
      buttonName = 'left';
    } else if (this.app.input.mouse.isRightDown) {
      buttonName = 'right';
    } else if (this.app.input.mouse.isMiddleDown) {
      buttonName = 'middle';
    }

    this._renderText('key ' + this.lastKey, x, y, this.app.input.isKeyDown(this.lastKey) ? '#e9dc7c' : 'white');
    this._renderText('btn ' + buttonName, x - 60, y, this.app.input.mouse.isDown ? '#e9dc7c' : 'white');

    for (var i=0; i<this._perfNames.length; i++) {
      var name = this._perfNames[i];
      var value = this._perfValues[name];

      y += 24;
      this._renderText(name + ': ' +  value.value.toFixed(3) + 'ms', x, y);
    }
  }
};


Debugger.prototype._renderShortcuts = function() {
  if (this.enableShortcuts) {
    var height = 28;

    this._setFont(20, 'Helvetica Neue, sans-serif');
    this.video.ctx.textAlign = 'left';
    this.video.ctx.textBaseline = 'top';
    var maxPerCollumn = Math.floor((this.app.height - 14)/height);

    for (var i=0; i<this.options.length; i++) {
      var option = this.options[i];
      var x = 14 + Math.floor(i/maxPerCollumn) * 320;
      var y = 14 + i%maxPerCollumn * height;

      var keyIndex = i + 1;
      var charId = indexToNumberAndLowerCaseKey(keyIndex);

      var isOn = this[option.entry];

      var shortcut = String.fromCharCode(charId);

      if (!charId) {
        shortcut = '^+' + String.fromCharCode(indexToNumberAndLowerCaseKey(keyIndex - 36));
      }

      var text = '[' + shortcut + '] ' + option.name;
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
  this.video.ctx.fillStyle = color;
  this.video.ctx.lineJoin = 'round';
  this.video.ctx.strokeStyle = outline;
  this.video.ctx.lineWidth = 3;
  this.video.ctx.strokeText(text, x, y);
  this.video.ctx.fillText(text, x, y);

  var width = this.video.ctx.measureText(text).width;

  var dx = x - 5;
  var dy = y;
  var dwidth = width + 10;
  var dheight = this._fontSize + 10;

  if (this.video.ctx.textAlign === 'right') {
    dx = x - 5 - width;
  }

  this._dirtyManager.addRect(dx, dy, dwidth, dheight);
};

module.exports = Debugger;
