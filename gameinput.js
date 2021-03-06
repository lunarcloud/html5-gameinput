/**
 * @preserve
 * @source: https://raw.githubusercontent.com/lunarcloud/gameinputjs/master/gameinput.js
 * @license magnet:?xt=urn:btih:d3d9a9a6595521f9666a5e94cc830dab83b65699&dn=expat.txt MIT (Expat) License
 */
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        // Node, CommonJS-like
        module.exports = factory();
    } else {
        // Browser globals (root is window)
        root.gi = factory();
    }
}(this, function () {
    "use strict";

    function Vector2(x, y) {
        this.x = (x === undefined) ? 0 : x;
        this.y = (y === undefined) ? 0 : y;
    }

    Vector2.prototype = {
        set: function(x, y) {
            this.x = x || 0;
            this.y = y || 0;
        },

        clone: function() {
            return new Vector2(this.x, this.y);
        },

        add: function(vector) {
            return new Vector2(this.x + vector.x, this.y + vector.y);
        },

        subtract: function(vector) {
            return new Vector2(this.x - vector.x, this.y - vector.y);
        },

        scale: function(scalar) {
            return new Vector2(this.x * scalar, this.y * scalar);
        },

        dot: function(vector) {
            return (this.x * vector.x + this.y + vector.y);
        },

        moveTowards: function(vector, t) {
            // Linearly interpolates between vectors A and B by t.
            // t = 0 returns A, t = 1 returns B
            t = Math.min(t, 1); // still allow negative t
            var diff = vector.subtract(this);
            return this.add(diff.scale(t));
        },

        magnitude: function() {
            return Math.sqrt(this.magnitudeSqr());
        },

        magnitudeSqr: function() {
            return (this.x * this.x + this.y * this.y);
        },

        distance: function (vector) {
            return Math.sqrt(this.distanceSqr(vector));
        },

        distanceSqr: function (vector) {
            var deltaX = this.x - vector.x;
            var deltaY = this.y - vector.y;
            return (deltaX * deltaX + deltaY * deltaY);
        },

        normalize: function() {
            var mag = this.magnitude();
            var vector = this.clone();
            if(Math.abs(mag) < 1e-9) {
                vector.x = 0;
                vector.y = 0;
            } else {
                vector.x /= mag;
                vector.y /= mag;
            }
            return vector;
        },

        angle: function() {
            return Math.atan2(this.y, this.x);
        },

        rotate: function(alpha) {
            var cos = Math.cos(alpha);
            var sin = Math.sin(alpha);
            var vector = new Vector2();
            vector.x = this.x * cos - this.y * sin;
            vector.y = this.x * sin + this.y * cos;
            return vector;
        },

        toPrecision: function(precision) {
            var vector = this.clone();
            vector.x = vector.x.toFixed(precision);
            vector.y = vector.y.toFixed(precision);
            return vector;
        },

        toString: function () {
            var vector = this.toPrecision(1);
            return ("[" + vector.x + "; " + vector.y + "]");
        }
    };


    function normalize(val, min, max) {
        return (val-min)/(max-min);
    }

    /**
     * GameInput
     * @brief   Game Input System
     * @desc    System for using a gamepad or keyboard control scheme for games
     */
    var gi = {};

    gi.debug = true; // disable to remove console output
    gi.handleKeyboard = true; // disable to deal with keyboard on your own

    /* Helper function */
    function toASCII(text) {
        return text.replace(/[^\x00-\x7F]/g, ""); /* eslint-disable-line no-control-regex */
    }


    gi.Schema = {};

    gi.Schema.Names = {
        d_up        :   "d_up",
        d_down      :   "d_down",
        d_left      :   "d_left",
        d_right     :   "d_right",
        menu        :   "menu",
        button0     :   "button0",
        button1     :   "button1",
        button2     :   "button2",
        button3     :   "button3",
        l_up        :   "l_up",
        l_down      :   "l_down",
        l_left      :   "l_left",
        l_right     :   "l_right",
        r_up        :   "r_up",
        r_down      :   "r_down",
        r_left      :   "r_left",
        r_right     :   "r_right",
        l_button    :   "l_button",
        r_button    :   "r_button",
        l_trigger   :   "l_trigger",
        r_trigger   :   "r_trigger"
    };

    gi.os = "Other";
    gi.browser = "Other";
    gi.firstPress = false;

    gi.canUseGamepadAPI = function()
    {
        return "getGamepads" in navigator;
    };

    gi.buttonDownActions = [];
    gi.buttonUpActions = [];

    gi.onButtonDown = function(action) {
        if (typeof(action) !== "function") throw "Action must be a function";
        gi.buttonDownActions.push(action);
    };

    gi.onButtonUp = function(action) {
        if (typeof(action) !== "function") throw "Action must be a function";
        gi.buttonUpActions.push(action);
    };

    gi.buttonDown = function(player, schemaName) {
        for ( var action in gi.buttonDownActions) {
            if (typeof(gi.buttonDownActions[action]) === "function") gi.buttonDownActions[action](player, schemaName);
        }
    };

    gi.buttonUp = function(player, schemaName) {
        for ( var action in gi.buttonUpActions) {
            if (typeof(gi.buttonUpActions[action]) === "function") gi.buttonUpActions[action](player, schemaName);
        }
    };

    gi.Player = function(number)
    {
        this.number = number;
        this.index = number - 1;

        this.type;
        this.model;
        this.schema;
        this.theme;
        this.state;
        this.analog;

        this.previous = {
            type: undefined,
            model: undefined,
            schema: undefined,
            state: undefined,
            analog: undefined,
        };

        this.buttonDownActions = {};
        this.buttonUpActions = {};

        for (var i in gi.Schema.Names)
        {
            this.buttonDownActions[ gi.Schema.Names[i] ] = [];
            this.buttonUpActions[ gi.Schema.Names[i] ] = [];
        }
    };

    gi.Player.prototype.buttonDown = function(schemaName)
    {
        gi.buttonDown(this.index, schemaName);
        for ( var action in this.buttonDownActions[schemaName])
            this.buttonDownActions[schemaName][action]();
    };

    gi.Player.prototype.buttonUp = function(schemaName)
    {
        gi.buttonUp(this.index, schemaName);
        for ( var action in this.buttonUpActions[schemaName])
            this.buttonUpActions[schemaName][action]();
    };

    gi.Player.prototype.onButtonDown = function(schemaName, action)
    {
        if (schemaName in gi.Schema.Names === false) throw "Must be gi.Schema.Names";
        if (typeof(action) !== "function") throw "Action must be a function";

        this.buttonDownActions[schemaName].push(action);
    };

    gi.Player.prototype.onButtonUp = function(schemaName, action)
    {
        if (schemaName in gi.Schema.Names === false) throw "Must be gi.Schema.Names";
        if (typeof(action) !== "function") throw "Action must be a function";

        this.buttonUpActions[schemaName].push(action);
    };

    gi.Player.prototype.hasGamePad = function()
    {
        return typeof(this.type) !== "undefined" && this.type !== gi.Type.Keyboard;
    };

    gi.Player.prototype.hasKeyboard = function()
    {
        return typeof(this.type) !== "undefined" && this.type === gi.Type.Keyboard;
    };

    gi.Player.prototype.getStickVector = function(stick)
    {
        if (stick != "l" && stick != "r") throw "Must be l or r";

        var x = 0;
        var y = 0;

        if (   this.schema[stick + "_up"] instanceof gi.Schema.AxisButton ) {
            if (this.schema[stick + "_up"].direction == "negative") {
                y -= this.analog[stick + "_up"] < this.schema[stick + "_up"].deadZone ? Math.abs(this.analog[stick + "_up"]) : 0;
            } else {
                y -= this.analog[stick + "_up"] > this.schema[stick + "_up"].deadZone ? Math.abs(this.analog[stick + "_up"]) : 0;
            }
        } else {
            y -= 0.7;
        }

        if (   this.schema[stick + "_down"] instanceof gi.Schema.AxisButton ) {
            if (this.schema[stick + "_down"].direction == "negative") {
                y += this.analog[stick + "_down"] < this.schema[stick + "_down"].deadZone ? Math.abs(this.analog[stick + "_down"]) : 0;
            } else {
                y += this.analog[stick + "_down"] > this.schema[stick + "_down"].deadZone ? Math.abs(this.analog[stick + "_down"]) : 0;
            }
        } else {
            x += 0.7;
        }

        if (   this.schema[stick + "_left"] instanceof gi.Schema.AxisButton ) {
            if (this.schema[stick + "_left"].direction == "negative") {
                x -= this.analog[stick + "_left"] < this.schema[stick + "_left"].deadZone ? Math.abs(this.analog[stick + "_left"]) : 0;
            } else {
                x -= this.analog[stick + "_left"] > this.schema[stick + "_left"].deadZone ? Math.abs(this.analog[stick + "_left"]) : 0;
            }
        } else {
            x -= 0.7;
        }

        if (   this.schema[stick + "_right"] instanceof gi.Schema.AxisButton ) {
            if (this.schema[stick + "_right"].direction == "negative") {
                x += this.analog[stick + "_right"] < this.schema[stick + "_right"].deadZone ? Math.abs(this.analog[stick + "_right"]) : 0;
            } else {
                x += this.analog[stick + "_right"] > this.schema[stick + "_right"].deadZone ? Math.abs(this.analog[stick + "_right"]) : 0;
            }
        } else {
            x += 0.7;
        }

        return new Vector2(x, y);

    };

    gi.Player.prototype.getNormalizedStickVector = function(stick)
    {
        var stickInput = this.getStickVector(stick);
        var radialDeadZone = 0;

        for (var direction in ["up", "down", "left", "right"]) {
            if ( this.schema[stick + "_" + direction] instanceof gi.Schema.AxisButton ) {
                if (this.schema[stick + "_" + direction].deadZone > radialDeadZone) {
                    radialDeadZone = this.schema[stick + "_" + direction].deadZone;
                }
            }
        }

        if(stickInput.magnitude < radialDeadZone) {
            return new Vector2(0,0);
        } else {
            return stickInput.normalize().scale((stickInput.magnitude() - radialDeadZone) / (1 - radialDeadZone));
        }
    };

    gi.Player.prototype.getNormalizedTriggerValue = function(trigger)
    {
        if (trigger != "l" && trigger != "r") throw "Must be l or r";
        trigger += "_trigger";

        if (   this.schema[trigger] instanceof gi.Schema.Key
            || this.schema[trigger] instanceof gi.Schema.Button
           ) {
            return this.state[trigger] ? 1 : 0;
        }
        // else  this.schema[trigger] instanceof gi.Schema.AxisButton

        return normalize(
            /*val*/ this.state[trigger],
            /*min*/ this.schema[trigger].deadZone,
            /*max*/ 1
        );
    };

    /**
     * @desc    Gets the button text
     * @param   schemaName      name of the button or axisValue
     * @param   symbolsAsWords  whether or not to convert Ragdoll's "x □ o △" to "cross square circle triangle"
     */
    gi.Player.prototype.getButtonText = function(schemaName, symbolsAsWords)
    {
        if ( this.schema instanceof gi.Schema.KeyboardAPI )
        {
            return this.schema[schemaName].text;
        }
        else if (this.model && this.model.type)
        {
            var text = this.model.type.schemaNames[schemaName];

            if (symbolsAsWords !== true) return text;

            switch (text) {
                case "▶":
                    return "start";
                case "x":
                    return "cross";
                case "o":
                    return "circle";
                case "□":
                    return "square";
                case "△":
                    return "triangle";
                default:
                    return text;
            }
        }
    };

    gi.Players = [
        new gi.Player(1),
        new gi.Player(2),
        new gi.Player(3),
        new gi.Player(4)
    ];

    gi.Connection = {};

    gi.Connection.GamePadMapping = {
        0 : 0,
        1 : 1,
        2 : 2,
        3 : 3
    };

    gi.getPlayer = function(index) {
        return gi.Players[gi.Connection.GamePadMapping[index]];
    };

    gi.Connection.Gamepads = [undefined, undefined, undefined, undefined];

    gi.Theme = function(name)
    {
        this.name = name;
    };

    gi.Schema.Key = function(code, text)
    {
        this.index = code;
        this.text = text;
    };

    gi.Schema.Button = function(index)
    {
        this.index = index;
    };

    gi.Schema.AxisButton = function(indexAndDirection, threshold, deadZone)
    {
        this.index = Math.abs(indexAndDirection);
        this.direction = indexAndDirection < 0 ? "negative" : "positive";
        if ( typeof(threshold) === "undefined" ) threshold = 0.5;
        this.threshold = (this.direction === "positive" ? 1 : -1 ) * Math.abs(threshold);
        if ( typeof(deadZone) === "undefined" ) deadZone = 0;
        this.deadZone = (this.direction === "positive" ? 1 : -1 ) * Math.abs(deadZone);
    };

    gi.Schema.Generic = function(d_up, d_down, d_left, d_right,
                                menu, button0, button1, button2, button3,
                                l_up, l_down, l_left, l_right,
                                r_up, r_down, r_left, r_right,
                                l_button, r_button, l_trigger, r_trigger)
    {
        this.d_up = d_up;
        this.d_down = d_down;
        this.d_left = d_left;
        this.d_right = d_right;
        this.menu = menu;
        this.button0 = button0;
        this.button1 = button1;
        this.button2 = button2;
        this.button3 = button3;
        this.l_up = l_up;
        this.l_down = l_down;
        this.l_left = l_left;
        this.l_right = l_right;
        this.r_up = r_up;
        this.r_down = r_down;
        this.r_left = r_left;
        this.r_right = r_right;
        this.l_button = l_button;
        this.r_button = r_button;
        this.l_trigger = l_trigger;
        this.r_trigger = r_trigger;
    };

    gi.Schema.Generic.prototype.lookup = function(key)
    {
        var schema = this;
        for (var i in schema)
        {
            if (schema[i] instanceof gi.Schema.Key)
            {
                if (key == schema[i].index) return i;
            }
            else if (schema[i] == key) return i;
        }
    };

    gi.Schema.GamePadAPI = function(d_up, d_down, d_left, d_right,
                                menu, button0, button1, button2, button3,
                                l_up, l_down, l_left, l_right,
                                r_up, r_down, r_left, r_right,
                                l_button, r_button, l_trigger, r_trigger)
    {
        for (var i in arguments)
        {
            if (typeof(arguments[i]) === "number") arguments[i] = new gi.Schema.Button(arguments[i]);
        }
        // if (typeof(d_up) === "number") d_up = new gi.Schema.Button(d_up); // TODO find out what I was doing here... it breaks things if uncommented

        gi.Schema.Generic.call(this, d_up, d_down, d_left, d_right,
                                menu, button0, button1, button2, button3,
                                l_up, l_down, l_left, l_right,
                                r_up, r_down, r_left, r_right,
                                l_button, r_button, l_trigger, r_trigger);
    };
    gi.Schema.GamePadAPI.prototype = new gi.Schema.Generic();
    gi.Schema.GamePadAPI.prototype.constructor = gi.Schema.GamePadAPI;

    gi.Schema.KeyboardAPI = function(name, d_up, d_down, d_left, d_right,
                                menu, button0, button1, button2, button3,
                                l_up, l_down, l_left, l_right,
                                r_up, r_down, r_left, r_right,
                                l_button, r_button, l_trigger, r_trigger)
    {
        for (var i in arguments)
        {
            if (typeof(arguments[i]) !== "undefined" && (arguments[i] instanceof gi.Schema.Key) === false) throw "Must be undefined or gi.Schema.Key";
        }
        gi.Schema.Generic.call(this, d_up, d_down, d_left, d_right,
                                menu, button0, button1, button2, button3,
                                l_up, l_down, l_left, l_right,
                                r_up, r_down, r_left, r_right,
                                l_button, r_button, l_trigger, r_trigger);
    };
    gi.Schema.KeyboardAPI.prototype = new gi.Schema.Generic();
    gi.Schema.KeyboardAPI.prototype.constructor = gi.Schema.KeyboardAPI;

    /**
     * @desc    Valid keycode integer
     */
    gi.Schema.KeyboardAPI.Keys = {
          ENTER: new gi.Schema.Key(13, "Return"),
          ESCAPE: new gi.Schema.Key(27, "Esc"),
          LEFT_ARROW: new gi.Schema.Key(37, "←"),
          UP_ARROW: new gi.Schema.Key(38, "↑"),
          RIGHT_ARROW: new gi.Schema.Key(39, "→"),
          DOWN_ARROW: new gi.Schema.Key(40, "↓"),
          NUM_0: new gi.Schema.Key(96, "NUM 0"),
          NUM_1: new gi.Schema.Key(97, "NUM 1"),
          NUM_2: new gi.Schema.Key(98, "NUM 2"),
          NUM_3: new gi.Schema.Key(99, "NUM 3"),
          NUM_4: new gi.Schema.Key(100, "NUM 4"),
          NUM_5: new gi.Schema.Key(101, "NUM 5"),
          NUM_6: new gi.Schema.Key(102, "NUM 6"),
          NUM_7: new gi.Schema.Key(103, "NUM 7"),
          NUM_8: new gi.Schema.Key(104, "NUM 8"),
          NUM_9: new gi.Schema.Key(105, "NUM 9"),
          KEY_0: new gi.Schema.Key(48, "0"),
          KEY_1: new gi.Schema.Key(49, "1"),
          KEY_2: new gi.Schema.Key(50, "2"),
          KEY_3: new gi.Schema.Key(51, "3"),
          KEY_4: new gi.Schema.Key(52, "4"),
          KEY_5: new gi.Schema.Key(53, "5"),
          KEY_6: new gi.Schema.Key(54, "6"),
          KEY_7: new gi.Schema.Key(55, "7"),
          KEY_8: new gi.Schema.Key(56, "8"),
          KEY_9: new gi.Schema.Key(57, "9"),
          KEY_A: new gi.Schema.Key(65, "A"),
          KEY_B: new gi.Schema.Key(66, "B"),
          KEY_C: new gi.Schema.Key(67, "C"),
          KEY_D: new gi.Schema.Key(68, "D"),
          KEY_E: new gi.Schema.Key(69, "E"),
          KEY_F: new gi.Schema.Key(70, "F"),
          KEY_G: new gi.Schema.Key(71, "G"),
          KEY_H: new gi.Schema.Key(72, "H"),
          KEY_I: new gi.Schema.Key(73, "I"),
          KEY_J: new gi.Schema.Key(74, "J"),
          KEY_K: new gi.Schema.Key(75, "K"),
          KEY_L: new gi.Schema.Key(76, "L"),
          KEY_M: new gi.Schema.Key(77, "M"),
          KEY_N: new gi.Schema.Key(78, "N"),
          KEY_O: new gi.Schema.Key(79, "O"),
          KEY_P: new gi.Schema.Key(80, "P"),
          KEY_Q: new gi.Schema.Key(81, "Q"),
          KEY_R: new gi.Schema.Key(82, "R"),
          KEY_S: new gi.Schema.Key(83, "S"),
          KEY_T: new gi.Schema.Key(84, "T"),
          KEY_U: new gi.Schema.Key(85, "U"),
          KEY_V: new gi.Schema.Key(86, "V"),
          KEY_W: new gi.Schema.Key(87, "W"),
          KEY_X: new gi.Schema.Key(88, "X"),
          KEY_Y: new gi.Schema.Key(89, "Y"),
          KEY_Z: new gi.Schema.Key(90, "Z"),
          OPEN_BRACKET: new gi.Schema.Key(91, "["),
          CLOSE_BRACKET: new gi.Schema.Key(93, "]"),
          SEMICOLON: new gi.Schema.Key(186, ";"),
          EQUALS: new gi.Schema.Key(187, "="),
          COMMA: new gi.Schema.Key(188, ","),
          DASH: new gi.Schema.Key(189, "-"),
          PERIOD: new gi.Schema.Key(190, "."),
          FORWARD_SLASH: new gi.Schema.Key(191, "/"),
          GRAVE_ACCENT: new gi.Schema.Key(192, "`"),
          BACK_SLASH: new gi.Schema.Key(220, "\\"),
          SINGLE_QUOTE: new gi.Schema.Key(222, "'")
        };

    gi.Schema.KeyboardAPI.Standard = {};

    gi.Schema.KeyboardAPI.Standard.QWERTY = new gi.Schema.KeyboardAPI(
        gi.Schema.KeyboardAPI.Keys.UP_ARROW,
        gi.Schema.KeyboardAPI.Keys.DOWN_ARROW,
        gi.Schema.KeyboardAPI.Keys.LEFT_ARROW,
        gi.Schema.KeyboardAPI.Keys.RIGHT_ARROW,
        gi.Schema.KeyboardAPI.Keys.ENTER,
        gi.Schema.KeyboardAPI.Keys.KEY_A,
        gi.Schema.KeyboardAPI.Keys.KEY_S,
        gi.Schema.KeyboardAPI.Keys.KEY_D,
        gi.Schema.KeyboardAPI.Keys.KEY_F,
        undefined, undefined, undefined, undefined,
        undefined, undefined, undefined, undefined,
        gi.Schema.KeyboardAPI.Keys.KEY_Q,
        gi.Schema.KeyboardAPI.Keys.KEY_W,
        gi.Schema.KeyboardAPI.Keys.KEY_E,
        gi.Schema.KeyboardAPI.Keys.KEY_R
    );
    gi.Schema.KeyboardAPI.Standard.QWERTY.name = "QWERTY";

    gi.Schema.KeyboardAPI.Standard.AZERTY = new gi.Schema.KeyboardAPI(
        gi.Schema.KeyboardAPI.Keys.UP_ARROW,
        gi.Schema.KeyboardAPI.Keys.DOWN_ARROW,
        gi.Schema.KeyboardAPI.Keys.LEFT_ARROW,
        gi.Schema.KeyboardAPI.Keys.RIGHT_ARROW,
        gi.Schema.KeyboardAPI.Keys.ENTER,
        gi.Schema.KeyboardAPI.Keys.KEY_Q,
        gi.Schema.KeyboardAPI.Keys.KEY_S,
        gi.Schema.KeyboardAPI.Keys.KEY_D,
        gi.Schema.KeyboardAPI.Keys.KEY_F,
        undefined, undefined, undefined, undefined,
        undefined, undefined, undefined, undefined,
        gi.Schema.KeyboardAPI.Keys.KEY_A,
        gi.Schema.KeyboardAPI.Keys.KEY_Z,
        gi.Schema.KeyboardAPI.Keys.KEY_E,
        gi.Schema.KeyboardAPI.Keys.KEY_R
    );
    gi.Schema.KeyboardAPI.Standard.AZERTY.name = "AZERTY";

    gi.Schema.KeyboardAPI.Standard.Dvorak = new gi.Schema.KeyboardAPI(
        gi.Schema.KeyboardAPI.Keys.UP_ARROW,
        gi.Schema.KeyboardAPI.Keys.DOWN_ARROW,
        gi.Schema.KeyboardAPI.Keys.LEFT_ARROW,
        gi.Schema.KeyboardAPI.Keys.RIGHT_ARROW,
        gi.Schema.KeyboardAPI.Keys.ENTER,
        gi.Schema.KeyboardAPI.Keys.KEY_A,
        gi.Schema.KeyboardAPI.Keys.KEY_O,
        gi.Schema.KeyboardAPI.Keys.KEY_E,
        gi.Schema.KeyboardAPI.Keys.KEY_U,
        undefined, undefined, undefined, undefined,
        undefined, undefined, undefined, undefined,
        gi.Schema.KeyboardAPI.Keys.SINGLE_QUOTE,
        gi.Schema.KeyboardAPI.Keys.COMMA,
        gi.Schema.KeyboardAPI.Keys.PERIOD,
        gi.Schema.KeyboardAPI.Keys.KEY_P
    );
    gi.Schema.KeyboardAPI.Standard.Dvorak.name = "Dvorak";

    gi.Type = function(name, theme, themeSchemaNames)
    {
        this.name = name;
        this.theme = theme;
        if (name != "Keyboard")
        {
            this.schemaNames = {
                d_up        :   "↑",
                d_down      :   "↓",
                d_left      :   "←",
                d_right     :   "→",
                menu        :   "▶",
                button0     :   "button0",
                button1     :   "button1",
                button2     :   "button2",
                button3     :   "button3",
                l_up        :   "↑",
                l_down      :   "↓",
                l_left      :   "←",
                l_right     :   "→",
                r_up        :   "↑",
                r_down      :   "↓",
                r_left      :   "←",
                r_right     :   "→",
                l_button    :   "l_button",
                r_button    :   "r_button",
                l_trigger   :   "l_trigger",
                r_trigger   :   "r_trigger"
            };
            for (var i in themeSchemaNames)
            {
                if (i in this.schemaNames ) this.schemaNames[i] = themeSchemaNames[i];
            }
        }
    };
    gi.Type.prototype.enable = function(){};

    gi.Type.Hedgehog = new gi.Type("Hedgehog", new gi.Theme("HedgeHog"), {
            button0     :   "A",
            button1     :   "B",
            button2     :   "X",
            button3     :   "Y",
            l_button    :   "LB",
            r_button    :   "RB",
            l_trigger   :   "LT",
            r_trigger   :   "RT"
    });

    gi.Type.Plumber = new gi.Type("Plumber", new gi.Theme("Plumber"), {
            button0     :   "A",
            button1     :   "B",
            button2     :   "X",
            button3     :   "Y",
            l_button    :   "LB",
            r_button    :   "RB",
            l_trigger   :   "LT",
            r_trigger   :   "RT"
    });

    gi.Type.Ragdoll = new gi.Type("Ragdoll", new gi.Theme("Ragdoll"), {
            button0     :   "x",
            button1     :   "o",
            button2     :   "□",
            button3     :   "△",
            l_button    :   "L1",
            r_button    :   "R1",
            l_trigger   :   "L2",
            r_trigger   :   "R2"
    });

    gi.Type.Ragdoll4 = new gi.Type("Ragdoll", new gi.Theme("Ragdoll"), {
            menu        :   "options",
            button0     :   "x",
            button1     :   "o",
            button2     :   "□",
            button3     :   "△",
            l_button    :   "L1",
            r_button    :   "R1",
            l_trigger   :   "L2",
            r_trigger   :   "R2"
    });

    gi.Type.Keyboard = new gi.Type("Keyboard", new gi.Theme("QWERTY"));

    gi.Type.Keyboard.StandardThemes = {
        QWERTY: new gi.Theme("QWERTY"),
        Dvorak: new gi.Theme("AZERTY"),
        Dvorak: new gi.Theme("Dvorak"),
        Blank: new gi.Theme("Blank")
    };

	gi.Type.Keyboard.set = function(standardType) {
		gi.Type.Keyboard.schema = gi.Schema.KeyboardAPI.Standard[standardType];
        gi.Type.Keyboard.theme = gi.Type.Keyboard.StandardThemes[standardType];

        if (typeof(gi.KeyboardWatcher.PlayerToWatch) !== "undefined" && typeof(gi.Players[gi.KeyboardWatcher.PlayerToWatch]) !== "undefined" )
        {
            gi.Players[gi.KeyboardWatcher.PlayerToWatch].schema = gi.Schema.KeyboardAPI.Standard[standardType];
            gi.Players[gi.KeyboardWatcher.PlayerToWatch].theme = gi.Type.Keyboard.StandardThemes[standardType];

            /* Treat this like a player reshuffle */
            for (var i = 0; i < gi.reshufflePlayersActions.length; i++)
            {
                if (typeof(gi.reshufflePlayersActions[i]) === "function") gi.reshufflePlayersActions[i]();
            }
        }
	}

    gi.Type.Keyboard.setQWERTY = function()
    {
        gi.Type.Keyboard.set('QWERTY');
    };

    gi.Type.Keyboard.setAZERTY = function()
    {
        gi.Type.Keyboard.set('AZERTY');
    };

    gi.Type.Keyboard.setDvorak = function()
    {
        gi.Type.Keyboard.set('Dvorak');
    };

    /**
     * @param   schema  gi.Schema
     */
    gi.Model = function(type, iconName, id, os, schema)
    {
        this.type = type;
        this.iconName = iconName;
        this.id = id;
        this.os = os;
        this.schema = schema;
    };

    gi.Type.Keyboard.model = new gi.Model(
            gi.Type.Keyboard,
            "keyboard",
            "keyboard",
            undefined,
            gi.Schema.KeyboardAPI.Standard.QWERTY);

    gi.Schema.StardardSchema = new gi.Schema.GamePadAPI(
            13, 14, 15, 16,
            10,
            1,2,3,4,
            new gi.Schema.AxisButton(-2),
            new gi.Schema.AxisButton(2),
            new gi.Schema.AxisButton(-1),
            new gi.Schema.AxisButton(1),
            new gi.Schema.AxisButton(-4),
            new gi.Schema.AxisButton(4),
            new gi.Schema.AxisButton(-3),
            new gi.Schema.AxisButton(3),
            5,6,7,8
    );

    gi.Models = {};

    gi.Models.UnknownStandardMapping = new gi.Model(
        gi.Type.Hedgehog,
        "generic",
        undefined,
        undefined,
        gi.Schema.StardardSchema);

    gi.Models.Generic = [
        new gi.Model(
            gi.Type.Hedgehog,
            "xbox360",
            "XInput",
            undefined,
            gi.Schema.StardardSchema
        ),
        new gi.Model(
            gi.Type.Hedgehog,
            "xbox360",
            "xinput",
            undefined,
            gi.Schema.StardardSchema
        ),
        new gi.Model(
            gi.Type.Hedgehog,
            "xbox360",
            "XBox 360",
            undefined,
            gi.Schema.StardardSchema
        ),
        new gi.Model(
            gi.Type.Hedgehog,
            "generic",
            "Logitech Rumblepad 2",
            undefined,
            new gi.Schema.GamePadAPI(
                12,13,14,15,
                10,
                2,3,1,4,
                new gi.Schema.AxisButton(-2),
                new gi.Schema.AxisButton(2),
                new gi.Schema.AxisButton(-1),
                new gi.Schema.AxisButton(1),
                new gi.Schema.AxisButton(-4),
                new gi.Schema.AxisButton(4),
                new gi.Schema.AxisButton(-3),
                new gi.Schema.AxisButton(3)//,
                // TODO l_button,
                // TODO r_button,
                // TODO l_trigger,
                // TODO r_trigger
        )),
        new gi.Model(
            gi.Type.Hedgehog,
            "generic",
            "Logitech Dual Action",
            undefined,
            new gi.Schema.GamePadAPI(
                12,13,14,15,
                10,
                2,3,1,4,
                new gi.Schema.AxisButton(-2),
                new gi.Schema.AxisButton(2),
                new gi.Schema.AxisButton(-1),
                new gi.Schema.AxisButton(1),
                new gi.Schema.AxisButton(-4),
                new gi.Schema.AxisButton(4),
                new gi.Schema.AxisButton(-3),
                new gi.Schema.AxisButton(3)//,
                // TODO l_button,
                // TODO r_button,
                // TODO l_trigger,
                // TODO r_trigger
        )),
        new gi.Model(
            gi.Type.Hedgehog,
            "generic",
            "STANDARD GAMEPAD",
            undefined,
            gi.Schema.StardardSchema
        )
    ];

    gi.Models.Specific = []; // starts as empty

    gi.KeyboardWatcher = new function()
    {
        this.PlayerToWatch = undefined;

        //setup keydown/keyup events
        window.addEventListener("keyup", function(e) {
            if (!gi.handleKeyboard) return;

            var player = gi.Players[gi.KeyboardWatcher.PlayerToWatch];
            if (typeof(player) !== "undefined" && typeof(player.schema) !== "undefined" )
            {
                var schemaButtonName = player.schema.lookup(e.which);
                if (typeof(schemaButtonName) !== "string" || typeof(player.state) === "undefined") return;
                player.state[schemaButtonName] = false;
                player.analog[schemaButtonName] = 0;
                if (typeof(schemaButtonName) !== "undefined" ) player.buttonUp(schemaButtonName);
            }
        });

        window.addEventListener("keydown", function(e) {
            if (!gi.handleKeyboard) return;

            var player = gi.Players[gi.KeyboardWatcher.PlayerToWatch];
            if (typeof(player) !== "undefined" && typeof(player.schema) !== "undefined" )
            {
                var schemaButtonName = player.schema.lookup(e.which);
                if (typeof(schemaButtonName) !== "string" || typeof(player.state) === "undefined") return;
                player.state[schemaButtonName] = true;
                player.analog[schemaButtonName] = 1;
                if (typeof(schemaButtonName) !== "undefined" ) player.buttonDown(schemaButtonName);
            }
        });
    };

    gi.loopingUpdate = true;

    gi.startUpdateLoop = function()
    {
        gi.loopingUpdate = true;
        gi.nextUpdateLoop();
    };

    gi.stopUpdateLoop = function()
    {
        gi.loopingUpdate = false;
    };

    gi.nextUpdateLoop = function()
    {
        if (gi.loopingUpdate === false) return;
        gi.update();
         requestAnimationFrame(gi.nextUpdateLoop); // way too slow!
    };

    gi.update = function()
    {
        if (gi.canUseGamepadAPI())
        {
            gi.Connection.Gamepads = navigator.getGamepads();

            for (let i = 0; i < gi.Connection.Gamepads.length; i++)
            {
                gi.Players[i].previous.state = gi.Players[i].state;
                gi.Players[i].state = {};
                gi.Players[i].previous.analog = gi.Players[i].analog;
                gi.Players[i].analog = {};

                var currentGamepad = gi.Connection.Gamepads[i];
                var currentSchema = gi.Players[i].schema;

                if (typeof(currentGamepad) === "undefined" || currentGamepad === null) continue;

                for (let j in currentSchema)
                {
                    if (typeof(currentSchema[j]) === "undefined")
                    {
                        //skip
                    }
                    else if ( typeof(currentGamepad.buttons[currentSchema[j] - 1] ) === "undefined")
                    {
                        var negativeAxis = currentSchema[j].threshold < 0;

                        var axisValue = gi.Players[i].analog[j] = currentGamepad.axes[currentSchema[j].index - 1];

                        gi.Players[i].state[j] = (negativeAxis && axisValue < currentSchema[j].threshold) || (!negativeAxis && axisValue > currentSchema[j].threshold);
                    }
                    else
                    {
                        gi.Players[i].state[j] = currentGamepad.buttons[currentSchema[j] - 1].pressed;

                        gi.Players[i].analog[j] = gi.Players[i].state[j] ? 1 : 0;
                    }
                }
            }

            // Keydown / Keyup
            for (let i = 0; i < gi.Players.length; i++)
            {
                for (let j in gi.Players[i].state)
                {
                    if (gi.firstPress !== true)
                    {
                        gi.firstPress = true;
                        return;
                    }

                    if ( gi.Players[i].previous.state[j] === false
                        && gi.Players[i].state[j] === true )
                    {
                        gi.Players[i].buttonDown(j);
                    }
                    else if ( gi.Players[i].previous.state[j] === true
                        && gi.Players[i].state[j] === false )
                    {
                        gi.Players[i].buttonUp(j);
                    }
                }
            }
        }
    };

    gi.gamepadsCount = function()
    {
        var gamepads = navigator.getGamepads();
        var count = 0;

        for (let i = 0; i < 4; i++) {
            count += typeof gamepads[i] === "object" && gamepads[i] !== null ? 1 : 0;
        }

        return count;
    };

    var lastCheckedNumberOfGamepads = -1;
    function connectionWatchLoop() {
        var currentNumberOfGamepads = gi.gamepadsCount();

        if ( lastCheckedNumberOfGamepads !== currentNumberOfGamepads) {
            if ( gi.debug ) console.debug("Now have " + currentNumberOfGamepads + " gamepad(s).");

            lastCheckedNumberOfGamepads = currentNumberOfGamepads;
            gi.initialGamePadSetup();
        }

        requestAnimationFrame(connectionWatchLoop);
    }

    gi.initialGamePadSetup = function()
    {
        // Pause Game or similar
        for (let i = 0; i < gi.reshufflePlayersActions.length; i++)
        {
            if (typeof(gi.reshufflePlayersActions[i]) === "function") gi.reshufflePlayersActions[i]();
        }

        //clear gamepad information
        for (let i = 0; i < gi.Players.length; i++)
        {
            gi.Players[i].type = undefined;
            gi.Players[i].model = undefined;
            gi.Players[i].schema = undefined;
            gi.Players[i].theme = undefined;
        }

        if (gi.canUseGamepadAPI())
        {
            gi.Connection.Gamepads = navigator.getGamepads();

            if (   gi.Connection.Gamepads[0] === undefined
                && gi.Connection.Gamepads[1] === undefined
                && gi.Connection.Gamepads[2] === undefined
                && gi.Connection.Gamepads[3] === undefined )
            {
                gi.firstPress = false;
            }

            for (let i in gi.Connection.Gamepads)
            {
                if (gi.Connection.Gamepads[i] instanceof Gamepad)
                {
                    //Translate into Type -  Players order is gamepad order
                    for (let j = 0; j < gi.Models.Specific.length; j++)
                    {
                        if ( toASCII(gi.Models.Specific[j].id) === toASCII(gi.Connection.Gamepads[i].id)
                            && gi.os === gi.Models.Specific[j].os )
                        {
                            gi.Players[i].type = gi.Models.Specific[j].type;
                            gi.Players[i].model = gi.Models.Specific[j];
                            gi.Players[i].schema = gi.Models.Specific[j].schema;
                            gi.Players[i].theme = gi.Models.Specific[j].type.theme;

                            if (gi.debug) {
                                console.debug("Gamepad of type " +  gi.Players[i].type.name + " configured");
                            }
                            break;
                        }
                    }

                    if (typeof(gi.Players[i].model) === "undefined")
                    {
                        for (let j = 0; j < gi.Models.Generic.length; j++)
                        {
                            if (gi.Connection.Gamepads[i].id.match(gi.Models.Generic[j].id) !== null)
                            {
                                gi.Players[i].type = gi.Models.Generic[j].type;
                                gi.Players[i].model = gi.Models.Generic[j];
                                gi.Players[i].schema = gi.Models.Generic[j].schema;
                                gi.Players[i].theme = gi.Models.Generic[j].type.theme;
                                if (gi.debug) {
                                    console.debug("Gamepad of type " +  gi.Players[i].type.name + " configured");
                                }
                            }
                        }

                        if (gi.Connection.Gamepads[i] instanceof Gamepad && typeof(gi.Players[i].model) === "undefined")
                        {
                            if (gi.debug) {
                                if (gi.Connection.Gamepads[i].mapping === "standard") {
                                    console.debug("Gamepad not detected, detected \"stardard\" mapping: \"" + gi.Connection.Gamepads[i].id + "\"");
                                } else {
                                    console.debug("Gamepad not detected, forcing \"stardard\" mapping: \"" + gi.Connection.Gamepads[i].id + "\"");
                                }
                            }

                            gi.Players[i].type = gi.Models.UnknownStandardMapping.type;
                            gi.Players[i].model = gi.Models.UnknownStandardMapping;
                            gi.Players[i].schema = gi.Models.UnknownStandardMapping.schema;
                            gi.Players[i].theme = gi.Models.UnknownStandardMapping.theme;

                            if (gi.debug) {
                                console.debug("Gamepad of type " +  gi.Players[i].type.name + " configured");
                            }
                        }
                    }

                    // blank state to start
                    gi.Players[i].state = {};
                    gi.Players[i].analog = {};

                    // setup Previous as current
                    gi.Players[i].previous.type = gi.Players[i].type;
                    gi.Players[i].previous.model = gi.Players[i].model;
                    gi.Players[i].previous.schema = gi.Players[i].schema;
                    gi.Players[i].previous.theme = gi.Players[i].theme;
                    gi.Players[i].previous.state = gi.Players[i].state;
                    gi.Players[i].previous.analog = gi.Players[i].analog;

                }
            }
        }
        else if (gi.debug)
        {
            console.debug("This browser does not support the Gamepad API");
        }

        //Setup Keyboard player
        if (gi.handleKeyboard)
        {
            gi.KeyboardWatcher.PlayerToWatch = undefined;
            for (let i = 0; i < gi.Players.length; i++)
            {
                // last player is keyboard
                if (gi.Players[i].type === undefined)
                {
                    gi.Players[i].type = gi.Type.Keyboard;
                    gi.Players[i].model = gi.Type.Keyboard.model;
                    gi.Players[i].schema = gi.Type.Keyboard.schema;
                    gi.Players[i].theme = gi.Type.Keyboard.theme;

                    gi.KeyboardWatcher.PlayerToWatch = i;
                    break;
                }
            }
        }
        else
        {
            gi.KeyboardWatcher.PlayerToWatch = undefined;
        }
    };

    gi.reshufflePlayersActions = [];

    gi.onReshufflePlayers = function(action)
    {
        gi.reshufflePlayersActions.push(action);
    };

    /* Initial Configuration */

    /* Detect OS */
    var osStrings = [
        {s:'Android', r:/Android/},
        {s:'iOS', r:/(iPhone|iPad|iPod)/},
        {s:'Windows', r:/Windows/},
        {s:'macOS', r:/Mac/},
        {s:'Linux', r:/(Linux|X11)/}
    ];
    for (var id in osStrings) {
        if (osStrings[id].r.test(navigator.userAgent)) { gi.os = osStrings[id].s; break; }
    }

    /* Detect Browser */
    if (/Chrome/.test(navigator.userAgent)) {
        gi.browser = "Chrome";
    } else if (/Firefox/.test(navigator.userAgent)) {
        gi.browser = "Firefox";
    } // else { gi.browser = "Other" }


    // gi.initialGamePadSetup(); // don't do this stuff until models exist
    if (typeof(gi.Type.Keyboard.schema) === "undefined") gi.Type.Keyboard.setQWERTY();
    gi.startUpdateLoop();

    // Start watching for gamepads joining and leaving
    if (gi.canUseGamepadAPI())
    {
        connectionWatchLoop();

        // warning, these are very unreliable!
        window.addEventListener("gamepadconnected", function(e) {
            if (gi.debug) console.debug("Gamepad connected at index %d: %s. %d buttons, %d axes.",
                e.gamepad.index, e.gamepad.id,
                e.gamepad.buttons.length, e.gamepad.axes.length);
            //gi.initialGamePadSetup(); // replaced with connectionWatchLoop
        }, false);

        window.addEventListener("gamepaddisconnected", function(e) {
            if (gi.debug) console.debug("Gamepad disconnected from index %d: %s",
                e.gamepad.index, e.gamepad.id);
            //gi.initialGamePadSetup(); // replaced with connectionWatchLoop
        }, false);
    }

    return gi;
}));

/**
 * @preserve
 * @license-end
 */
