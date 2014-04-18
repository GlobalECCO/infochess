define(['underscore', 'lib/infochess', 'lib/helper'], function(_, InfoChess, HelperModule) {

  function Tutorial() {
    var self = this;
    self.active = false;
    self.finished = false;
    self.script = [];
    self.timers = [];
    self.step = 0;
    self.socket = null;
    self.role = null;
    self.background = null;
    self.foreground = null;
    self.buttonContainer = null;
    self.InfoChess = null;

    //----------------------------------------------------------------------------
    Tutorial.prototype.initChess = function() {
      self.InfoChess = new InfoChess.InfoChess;
    };

    //----------------------------------------------------------------------------
    Tutorial.prototype.init = function(socket, updatePlayerCB, endTutorialCB) {
      self.socket = socket;
      self.updatePlayerCB = updatePlayerCB;
      self.endTutorialCB = endTutorialCB;

      self.ui = $("<div>\
                     <div class='tutorialBackground'/>\
                     <div class='tutorialForeground'>\
                     </div>\
                     <div class='tutorialButtonContainer'>\
                       <div class='tutorialLabel'>Tutorial Controls:</div>\
                       <div class='tutorialButton restartTutorialButton'>Restart Tutorial</div>\
                       <div class='tutorialButton endTutorialButton'>End Tutorial</div>\
                     </div>\
                   </div>");
      $('body').append(self.ui);

      self.background = self.ui.find('.tutorialBackground');
      self.foreground = self.ui.find('.tutorialForeground');
      self.buttonContainer = self.ui.find('.tutorialButtonContainer');
      self.buttonContainer.find('.restartTutorialButton').click(self.onRestartTutorial);
      self.buttonContainer.find('.endTutorialButton').click(self.onEndTutorial);

      self.ui.hide();
    };

    //----------------------------------------------------------------------------
    Tutorial.prototype.setRole = function(role) {
      self.role = role;
      self.initChess();
      self.InfoChess.currentRole = role;
    };

    //----------------------------------------------------------------------------
    Tutorial.prototype.isActive = function() {
      return self.active;
    };

    //----------------------------------------------------------------------------
    Tutorial.prototype.isFinished = function() {
      return self.finished;
    }

    //----------------------------------------------------------------------------
    // Script is an array that contains the contents of the entire tutorial.
    // See the bottom of this source for details on its structure.
    Tutorial.prototype.show = function(script) {
      self.script = script;
      self.active = true;
      self.finished = false;
      self.ui.show();

      self.performStep(0);
    };

    //----------------------------------------------------------------------------
    Tutorial.prototype.hide = function() {
      self.ui.hide();
      // $(window).off('resize.tutorial');
    };

    //----------------------------------------------------------------------------
    Tutorial.prototype.updatePlayer = function(result) {
      var data = {
        result: result,
        gameState: self.InfoChess.asDTO(self.role),
        notes: '',
        history: self.InfoChess.getHistory(self.role)
      };

      if (self.updatePlayerCB !== undefined) {
        self.updatePlayerCB(data);
      }
    };

    //----------------------------------------------------------------------------
    Tutorial.prototype.emit = function(type, data) {
      for (var i = 0; i < self.serverHandlers.length; ++i) {
        if (self.serverHandlers[i].signal === type) {
          var result = self.serverHandlers[i].handler(data);
          self.updatePlayer(result);
          return;
        }
      }
    };

    //----------------------------------------------------------------------------
    Tutorial.prototype.onRestartTutorial = function() {
      self.onEndTutorial();
      self.show(self.script);
    };

    //----------------------------------------------------------------------------
    Tutorial.prototype.onEndTutorial = function() {
      self.active = false;
      self.finished = true;

      _.each(self.timers, function(timer) {
        clearTimeout(timer);
      });
      self.timers = [];
      self.background.empty();
      self.foreground.empty();
      Opentip.hideTips();
      self.hide();

      self.initChess();
      self.updatePlayer();

      if (self.endTutorialCB !== undefined) {
        self.endTutorialCB();
      }
    };

    //----------------------------------------------------------------------------
    Tutorial.prototype.performStep = function(step) {
      if (step > -1 && step < self.script.length) {
        self.step = step;
        var currentStep = self.script[step];

        //is this step an array of elements and tips?
        if (_.isArray(currentStep)) {
          var absTime = 0;

          _.each(currentStep, function(item){
            absTime += item.hasOwnProperty('delay') ? item.delay : 0;

            self.timers.push(setTimeout(function() {
              self.performItem(item);
              self.timers.unshift();
            }, absTime));
          });

        }
        else {
          this.timers.push(setTimeout(function() {
            self.performItem(currentStep);
            self.timers.unshift();
          }, currentStep.hasOwnProperty('delay') ? currentStep.delay : 0));
        }

        return;
      }

      self.onEndTutorial();
    };

    //----------------------------------------------------------------------------
    Tutorial.prototype.performItem = function(item) {
      var $el = $(item.el);
      var $tooltipTarget = $el;

      if (item.hasOwnProperty('grouped') && item.grouped) {
        //gather boundaries
        var bbox = self.getBoundingBoxOfElements($el);

        //create bounding box around $el
        var $box = $("<div class='boundingBox'></div>")
        self.setCSSOfBoundingBox($box, bbox);

        self.background.append($box);
        $el.data('boundingBox', $box);
        $box.data('source', $el);

        //point the tooltip to this box
        $tooltipTarget = $box;
      }

      if (item.hasOwnProperty('tip')){
        var t = new Opentip($tooltipTarget.get(0), item.tip.content, item.tip.title || '',
                            {
                              target: item.tip.target || $tooltipTarget.get(0),
                              group:null,
                              showOn:'creation',
                              hideOn: 'fakeEventThatDoesntExist',
                              removeElementsOnHide:true,
                              stemLength: item.tip.stemLength || 50,
                              tipJoint: item.tip.tipJoint || 'top left',
                              offset: item.tip.offset || [0, 0],
                              delay: item.tip.delay || 0,
                              style: self.doesItemHaveNullAction(item) ? 'tutorialTips' : 'tutorialActionTips'
                            });
        $(t.container[0]).on('click.blockClick', self.onBlockClick);
      }

      $el.each(function() {
        self.cloneElement(this, item)
      });
    };

    //----------------------------------------------------------------------------
    Tutorial.prototype.onBlockClick = function(event) {
      event.stopPropagation();
    },

    //----------------------------------------------------------------------------
    Tutorial.prototype.getBoundingBoxOfElements = function($elements) {
      //gather boundaries
      var left = Number.MAX_VALUE;
      var right = Number.MIN_VALUE;
      var bottom = Number.MIN_VALUE;
      var top = Number.MAX_VALUE;

      _.each($elements, function(element){
        var rect = element.getBoundingClientRect();
        left = (rect.left < left) ? rect.left : left;
        right = (rect.right > right) ? rect.right : right;
        bottom = (rect.bottom > bottom) ? rect.bottom : bottom;
        top = (rect.top < top) ? rect.top : top;
      });

      return {left:left, right:right, top:top, bottom:bottom};
    },

    //----------------------------------------------------------------------------
    Tutorial.prototype.setCSSOfBoundingBox = function($el, bbox) {
      $el.css('left', bbox.left);
      $el.css('right', bbox.right);
      $el.css('top', bbox.top);
      $el.css('bottom', bbox.bottom);
      $el.css('width', bbox.right-bbox.left);
      $el.css('height', bbox.bottom-bbox.top);
    },

    //----------------------------------------------------------------------------
    Tutorial.prototype.doesItemHaveNullAction = function(item) {
      //step has an action property and it's null, meaning there's no action to perform
      return (item.hasOwnProperty('action') &&
              (item.action == null));
    },

    //----------------------------------------------------------------------------
    Tutorial.prototype.cloneElement = function(element, item, alternate) {
      // Clone the element
      var $el = $(element);
      if (item.hasOwnProperty('shallowCopy') && item.shallowCopy) {
        var $clone = $(element.cloneNode(true));
      }
      else {
        var $clone = $el.clone(true);
      }
      $clone.data('source', $el);

      // Add the clone to the appropriate layer
      if (item.hasOwnProperty('action') && alternate === undefined) {
        self.background.append($clone);
        if (item.action !== null) {
          var alternateTarget = $(item.action)[0];
          self.cloneElement(alternateTarget, item, true);
        }
      }
      else {
        $clone.one('click', self.onFinished); //click handler
        self.foreground.append($clone);

        //Highlight the elements which have some action to perform and assign
        //a click handler
        var $box = $("<div class='highlightCircle'></div>")
        var bbox = self.getBoundingBoxOfElements($el);
        self.setCSSOfBoundingBox($box, bbox);
        $box.data('source', $el);
        self.foreground.prepend($box);
      }

      // Now position the element
      $clone.css('transition', 'none');
      $clone.css('position', 'absolute');
      self.positionClone($clone, $el);
    };

    //----------------------------------------------------------------------------
    Tutorial.prototype.positionClone = function($clone, $el) {
      $clone.offset($el.offset());
      $clone.css('width', $el.width());
      $clone.css('height', $el.height());
    },

    //----------------------------------------------------------------------------
    Tutorial.prototype.cleanUpElement = function($el) {
      if ($el.data('boundingBox')) {
        var $bbox = $el.data('boundingBox');
        $bbox.remove();
        $el.removeData('boundingBox');
      }

      Opentip.hideTips();
    },

    //----------------------------------------------------------------------------
    Tutorial.prototype.onFinished = function(event) {
      // Cleanup our previous clones
      self.background.empty();
      self.foreground.empty();

      // Move on to the next step of the tutorial
      if (_.isArray(self.script[self.step])) {
        _.each(self.script[self.step], function(item) {
          if (item.callback != null) {
            item.callback();
          }
          self.cleanUpElement($(item.el));
        });
      }
      else {
        if (self.script[self.step].callback != null) {
          self.script[self.step].callback();
        }
        self.cleanUpElement($(self.script[self.step].el));
      }

      self.step++;

      if (self.step < self.script.length) {
        self.performStep(self.step);
      }
      else {
        self.onEndTutorial();
      }
    },

    //----------------------------------------------------------------------------
    // Defined 'fake' server handlers.
    self.serverHandlers = [
      {
        signal: 'select_army',
        handler: function(serializedArmy) {
          var opponentRole = 'black'
          var opponentRow = '7';
          if (self.role === 'black') {
            opponentRole = 'white';
            opponentRow = '0';
          }

          var opponentArmy = '{"pieces": {"3,' + opponentRow + '": {"cost": 0, "limit": 1, "starting_row": 0, "invisible": true, "type": "king", "colour": "' + opponentRole + '"}}, "ew_points": 5}';

          self.InfoChess.setArmy(opponentRole, opponentArmy);
          self.InfoChess.setArmy(self.role, serializedArmy);
          }
      },
      {
        signal: 'move',
        handler: function(move) {
          return self.InfoChess.move(self.role, new HelperModule.Position(move.src.x, move.src.y), new HelperModule.Position(move.dest.x, move.dest.y));
        },
      },
    ];
  }

  //----------------------------------------------------------------------------
  Opentip.styles.tutorialActionTips = {
    extends: "tutorialTips",
    className: "tutorialActionTips",
    borderColor: "#FFFF00",
    borderWidth: 1,
    background: [[0, "rgba(50, 50, 50, 0.8)"], [1, "rgba(30, 30, 30, 0.9)"]]
  };

  Opentip.styles.tutorialTips = {
    extends: "dark",
    className: "tutorialTips",
    borderColor: "#000",
    borderWidth: 1,
    background: [[0, "rgba(235, 235, 235, 0.9)"], [1, "rgba(170, 170, 170, 0.95)"]],
  };

  return new Tutorial;
});

//----------------------------------------------------------------------------
// Script data structure
//
// [ array for each step of the script
//  {el: <JQuery selector> //these elements will be highlighted
//   action: <JQuery selector> //if undefined, a 'click' on el will move to next tutorial step
//                             //if null, no events on el will be used to proceed to next tutorial step
//                             //if defined, a 'click' on these elements will proceed to the next tutorial step
//   tip: {         //a tooltip to be displayed
//    title: <text> //the text to use as a title for this tip
//    content: <text> //the text to use as context for this tip
//    target: <Jquery selector> //which element this tip will point to.
//                              //if undefined, the el will be used
//    stemLength: <number> //how far away the tool tip will be to the element
//    tipJoint: <(top,middle,bottom) (left, center, right)> //which direction to project the tool tip
//   }
//   grouped: <boolean> //if a bounding box should be rendered around el or not
//   callback: <function> //a callback function that gets called at the end of this tutorial step
//  }

//  //a single step can have multiple elements/tips defined.
//  //E.g. First step has two elements defined, second step has one
// [{el:''},
//  {el:''}],
// {el: ''}
// ]
