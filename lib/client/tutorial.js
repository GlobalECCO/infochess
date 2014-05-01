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
    Tutorial.prototype.initTutorialSteps = function() {
      self.script = [
        // Step 1
        [{
          el: '.tutorialLabel',
          tip: {
            title: 'InfoChess',
            content: 'InfoChess plays like a standard game of chess, with the addition of invisible pieces and information warfare attacks.  Unless otherwise noted, all standard chess rules apply (castling, en passant, pawn upgrades, etc.).  The goal is to take your opponent\'s king, but both players have limited information.',
            tipJoint: 'left',
            stemLength: 0,
            offset: [72, 350],
          },
          action: null,
        },

        {
          el: '#points_indicator',
          tip: {
            title: 'Points Indicator',
            content: 'You only get a subset of the pieces you get in a standard game of chess.  You have 10 points to spend on building pieces for your side.',
            tipJoint: 'right',
            offset: [30, 0],
          },
          action: null,
          delay: 100,
        },

        {
          el: '#army_selector #king',
          tip: {
            title: 'King',
            content: 'You must place one King.  Kings are invisible to the other player unless they capture a piece or move into the last three rows.',
            tipJoint: 'right',
          },
          action: null,
        },

        {
          el: '#army_selector #king',
          tip: {
            content: 'Click here to build a King.',
            tipJoint: 'top right',
          },
        }],

        // Step 2
        [{
          el: '#army_selector #king',
          tip: {
            title: 'King Movement',
            content: 'A King can move one space in any direction as illustrated here:<br><br><img src="images/move_king.png" width="200" height="200" style="display: block; margin-left: auto; margin-right: auto"><br>',
            tipJoint: 'right',
          },
          action: null,
        },

        {
          el: '.shadow_piece',
          tip: {
            content: 'Click on a valid spot to place your King there.',
            tipJoint: 'bottom',
          },
        }],

        // Step 3
        [{
          el: '#army_selector #queen',
          tip: {
            title: 'Queen',
            content: 'A Queen costs 3 points to build and you can start with no more than one.  Queens are visible to the other player at all times.',
            tipJoint: 'right',
          },
          action: null,
          delay: 100,
        },

        {
          el: '#army_selector #queen',
          tip: {
            content: 'Click here to build a Queen.',
            tipJoint: 'top right',
          },
        }],

        // Step 4
        [{
          el: '#army_selector #queen',
          tip: {
            title: 'Queen Movement',
            content: 'A Queen can move any number of spaces diagonally or orthogonally as illustrated here:<br><br><img src="images/move_queen.png" width="200" height="200" style="display: block; margin-left: auto; margin-right: auto"><br>',
            tipJoint: 'right',
          },
          action: null,
        },

        {
          el: '.shadow_piece',
          tip: {
            content: 'Click on a valid spot to place your Queen there.',
            tipJoint: 'bottom',
          },
        }],

        // Step 5
        [{
          el: '#army_selector #knight',
          tip: {
            title: 'Knight',
            content: 'A Knight costs 2 points to build and you can start with no more than two.  Knights are invisible to the other player unless they capture a piece or move into the last three rows.',
            tipJoint: 'right',
          },
          action: null,
          delay: 100,
        },

        {
          el: '#army_selector #knight',
          tip: {
            content: 'Click here to build a Knight.',
            tipJoint: 'top right',
          },
        }],

        // Step 6
        [{
          el: '#army_selector #knight',
          tip: {
            title: 'Knight Movement',
            content: 'A Knight moves two squares in any orthogonal direction and then 1 space in either perpendicular direction as illustrated here: <br><br><img src="images/move_knight.png" width="200" height="200" style="display: block; margin-left: auto; margin-right: auto"><br>',
            tipJoint: 'right',
          },
          action: null,
        },

        {
          el: '.shadow_piece',
          tip: {
            content: 'Click on a valid spot to place your Knight there.',
            tipJoint: 'bottom',
          },
        }],

        // Step 7
        [{
          el: '#army_selector #rook',
          tip: {
            title: 'Rook',
            content: 'A Rook costs 2 points to build and you can start with no more than two.  Rooks are visible to the other player at all times.',
            tipJoint: 'right',
          },
          action: null,
          delay: 100,
        },

        {
          el: '#army_selector #rook',
          tip: {
            content: 'Click here to build a Rook.',
            tipJoint: 'top right',
          },
        }],

        // Step 8
        [{
          el: '#army_selector #rook',
          tip: {
            title: 'Rook Movement',
            content: 'A Rook can move any number of spaces orthogonally as illustrated here:<br><br><img src="images/move_rook.png" width="200" height="200" style="display: block; margin-left: auto; margin-right: auto"><br>',
            tipJoint: 'right',
          },
          action: null,
        },

        {
          el: '.shadow_piece',
          tip: {
            content: 'Click on a valid spot to place your Rook there.',
            tipJoint: 'bottom',
          },
        }],

        // Step 9
        [{
          el: '#army_selector #pawn',
          tip: {
            title: 'Pawn',
            content: 'A Pawn costs 1 point to build and you can have no more than eight.  Pawns are invisible to the other player unless they capture a piece or move into the last three rows.',
            tipJoint: 'right',
          },
          action: null,
          delay: 100,
        },

        {
          el: '#army_selector #pawn',
          tip: {
            content: 'Click here to build a Pawn.',
            tipJoint: 'top right',
          },
        }],

        // Step 10
        [{
          el: '#army_selector #pawn',
          tip: {
            title: 'Pawn Movement',
            content: 'A Pawn can move forward one space (or two if it\'s the Pawn\'s first move) if it is unoccupied or diagonally forward to capture a piece as illustrated here:<br><br><img src="images/move_pawn.png" width="200" height="200" style="display: block; margin-left: auto; margin-right: auto"><br>',
            tipJoint: 'bottom right',
            offset: [0, 60],
          },
          action: null,
        },

        {
          el: '.shadow_piece',
          tip: {
            content: 'Click on a valid spot to place your Pawn there.',
            tipJoint: 'bottom',
          },
        }],

        // Step 11
        [{
          el: '.shadow_piece',
          tip: {
            content: 'Click on a valid spot to place another Pawn.',
            tipJoint: 'bottom',
          },
        }],

        // Step 12
        [{
          el: '#army_selector #bishop',
          tip: {
            title: 'Bishop',
            content: 'A Bishop costs 1 point to build, you can start with no more than two, and they must be on different colored squares.  Bishops are visible to the other player at all times.',
            tipJoint: 'right',
          },
          action: null,
          delay: 100,
        },

        {
          el: '#army_selector #bishop',
          tip: {
            content: 'Click here to build a Bishop.',
            tipJoint: 'top right',
          },
        }],

        // Step 13
        [{
          el: '#army_selector #bishop',
          tip: {
            title: 'Bishop Movement',
            content: 'A Bishop can move any number of spaces diagonally as illustrated here:<br><br><img src="images/move_bishop.png" width="200" height="200" style="display: block; margin-left: auto; margin-right: auto"><br>',
            tipJoint: 'bottom right',
            offset: [0, 60],
          },
          action: null,
        },

        {
          el: '.shadow_piece',
          tip: {
            content: 'Click on a valid spot to place your Bishop there.',
            tipJoint: 'bottom',
          },
        }],

        // Step 14
        [{
          el: '#iw_selector',
          tip: {
            title: 'Information Warfare Points',
            content: 'You have 10 points to distribute between Electronic Warfare and Psyops attacks.  Before a game, you can move this slider to allocate those points.',
            tipJoint: 'right',
            offset: [0, -9],
          },
          action: null,
          delay: 100,
        },

        {
          el: '#ready',
          tip: {
            content: 'Click here to start the game.',
            tipJoint: 'right',
          },
        }],

        // Step 15
        [{
          el: '#pawn_capture',
          tip: {
            title: 'Pawn Capture',
            content: 'This button lets you see if any of your pawns are able to capture invisible enemy pieces.  If any captures are possible, one must be executed.  Otherwise, you are free to move any piece as normal.',
            tipJoint: 'bottom',
          },
          action: null,
        },

        {
          el: '#pawn_capture',
          tip: {
            content: 'Click here to check if your pawns can capture anything.',
            tipJoint: 'left',
          },
        }],

        // Step 16
        [{
          el: '#notes_selector',
          tip: {
            title: 'Notes',
            content: 'You can click on this tab to take notes during the game.',
            tipJoint: 'bottom',
            offset: [10, 0],
          },
          action: null,
        },

        {
          el: '[class^="pawn_"].normal_piece',
          tip: {
            content: 'Every turn, you must move a piece.  Select a Pawn now to move it.',
            tipJoint: 'bottom',
          },
        }],

        // Step 17
        [{
          el: '#log_selector',
          tip: {
            title: 'Log',
            content: 'You can view a log of the game\'s history here.',
            tipJoint: 'bottom',
          },
          action: null,
        },

        {
          el: '.shadow_piece',
          tip: {
            content: 'Click on one of the valid positions to move your piece there.',
            tipJoint: 'bottom',
            offset: [0, -75],
          },
        }],

        // Step 18
        [{
          el: '#action_selector',
          tip: {
            title: 'Information Warfare (IW) Attack',
            content: 'After moving a piece you may attack the other player with either an Electronic Warfare or Psyops attack, as long as you have the corresponding points available.',
            tipJoint: 'right',
            stemLength: 300,
            offset: [-10, -200],
          },
          action: null,
        },

        {
          el: '#ew_main',
          tip: {
            title: 'Electronic Warfare Attack',
            content: 'An Electronic Warfare attack prevents the other player from moving their pieces on their next turn.  They may still use an IW attack, if they choose.',
            tipJoint: 'right',
          },
          action: null,
        },

        {
          el: '#psyop_main',
          tip: {
            title: 'Psyops Attack',
            content: 'A Pysops attack will remove one of your opponent\'s pieces.  The piece will be either the furthest Pawn from their King or the furthest non-Pawn piece from the King, if no Pawns are left.',
            tipJoint: 'right',
          },
          action: null,
        },

        {
          el: '#end_turn',
          tip: {
            content: 'Click here to end your turn without making an IW attack.',
            tipJoint: 'right'
          },
        }],

        // Step 19
        [{
          el: '[class^="pawn_"].normal_piece',
          tip: {
            content: 'Click on a Pawn to move it.',
            tipJoint: 'bottom',
          },
        }],

        // Step 20
        [{
          el: '.shadow_piece',
          tip: {
            content: 'Click on one of the valid positions to move your piece there.',
            tipJoint: 'top',
          },
        }],

        // Step 21
        [        {
          el: '#ew_feint',
          tip: {
            title: 'Feint Attack',
            content: 'Each IW attack has a strength.  A feint attack will never have an effect on your opponent, however, it will look like any other attack, so they might waste their points trying to defend against it.',
            tipJoint: 'bottom',
            stemLength: 20,
          },
          action: null,
        },

        {
          el: '#ew_normal',
          tip: {
            title: 'Normal Attack',
            content: 'A normal attack can be defended against using points of the same type.  If defended, the attack will have no effect.',
            tipJoint: 'right',
          },
          action: null,
        },

        {
          el: '#ew_reinforced',
          tip: {
            title: 'Reinforced Attack',
            content: 'A reinforced attack will have an effect on the opponent whether they defend it or not.  It will look like any other attack to your opponent, so they might waste their points trying to defend against it.',
            tipJoint: 'top',
            stemLength: 70,
          },
          action: null,
        },

        {
          el: '#ew_reinforced',
          tip: {
            content: 'Click here to make a reinforced Electronic Warfare attack now.',
            tipJoint: 'topRight',
            offset: [0, -15],
          },
        }],

        // Step 22
        [{
          el: '#action_selector',
          action: null,
        },

        {
          el: '#psyop_points_indicator',
          tip: {
            title: 'IW Points',
            content: 'IW points are used to both attack and defend a given attack type.  You can see how many you have left for each type here.',
            tipJoint: 'top right',
            stemLength: 100,
            offset: [125, -50],
          },
          action: null,
        },

        {
          el: '#ew_normal #value, #ew_reinforced #value, #ew_feint #value',
          tip: {
            title: 'Cost Cycle',
            content: 'IW attack/defense costs cycle between the following costs.  Electronic Warfare begins Expensive and Pysops begins Cheap:<br><br>' +
                      '<table class="costCycleTable">' +
                        '<tr>' +
                          '<th></th>' +
                          '<th>Cheap</th>' +
                          '<th>Expensive</th>' +
                        '</tr>' +
                        '<tr>' +
                          '<th>Feint</th>' +
                          '<td>N/A</td>' +
                          '<td>1</td>' +
                        '</tr>' +
                        '<tr>' +
                          '<th>Normal</th>' +
                          '<td>1</td>' +
                          '<td>2</td>' +
                        '</tr>' +
                        '<tr>' +
                          '<th>Reinforced</th>' +
                          '<td>2</td>' +
                          '<td>3</td>' +
                        '</tr>' +
                        '<tr><th colspan="3"><hr></th></tr>' +
                        '<tr>' +
                          '<th>Defense</th>' +
                          '<td>2</td>' +
                          '<td>1</td>' +
                        '</tr>' +
                      '</table>',
            tipJoint: 'top',
            stemLength: 25,
            offset: [0, 10],
          },
          grouped: true,
          action: null,
        },

        {
          el: '#settings',
          tip: {
            content: 'Click here to open the game settings.',
            tipJoint: 'top right',
            stemLength: 65,
          },
        }],

        // Step 23
        [{
          el: 'a[href="rules.html"]',
          tip: {
            title: 'Rules',
            content: 'You can see more detailed rules for the game by clicking here.',
            tipJoint: 'right'
          },
          action: null,
        },

        {
          el: '#show_confirm_forfeit',
          tip: {
            title: 'Forfeit Game',
            content: 'If you know you are beaten and want to end the game early, you can forfeit the game by clicking here.',
            tipJoint: 'bottom left',
            stemLength: 30,
            offset: [-210, 0],
          },
          action: null,
        },

        {
          el: '#show_offer_draw',
          tip: {
            title: 'Offer a Draw',
            content: 'If the game seems to be a stalemate, you can always offer your opponent a draw to end the game with no winner or loser.',
            tipJoint: 'right'
          },
          action: null,
        },

        {
          el: '.endTutorialButton',
          tip: {
            content: 'Click here to start playing the game.',
            tipJoint: 'bottom'
          },
        }],
      ];
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

      self.initTutorialSteps();
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
    };

    //----------------------------------------------------------------------------
    Tutorial.prototype.setFinished = function() {
      self.finished = true;
    };

    //----------------------------------------------------------------------------
    // Script is an array that contains the contents of the entire tutorial.
    // See the bottom of this source for details on its structure.
    Tutorial.prototype.show = function() {
      self.active = true;
      self.finished = false;
      self.ui.show();

      self.performStep(0);
      $(window).on('resize.tutorial', this.onResize);
    };

    //----------------------------------------------------------------------------
    Tutorial.prototype.hide = function() {
      self.ui.hide();
      $(window).off('resize.tutorial');
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
      self.initTutorialSteps();
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

      // Make sure the settings dialog is closed
      $("#settings_content .close").click();

      if (self.endTutorialCB !== undefined) {
        self.endTutorialCB();
      }

      self.initChess();
      self.updatePlayer();
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
        if (item.tip.stemLength === undefined) {
          item.tip.stemLength = 50;
        }
        var t = new Opentip($tooltipTarget.get(0), item.tip.content, item.tip.title || '',
                            {
                              target: item.tip.target || $tooltipTarget.get(0),
                              group: null,
                              showOn:'creation',
                              hideOn: 'fakeEventThatDoesntExist',
                              removeElementsOnHide: true,
                              stemLength: item.tip.stemLength,
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
        self.foreground.append($box);
        $box.click(function() {
          $clone.click();
        });
      }

      // Now position the element
      $clone.copyCSS($el);
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
    Tutorial.prototype.onResize = function() {
      setTimeout(function() {
        self.background.add(self.foreground).children().each(function() {
          if ($(this).hasClass('boundingBox') || $(this).hasClass('highlightCircle')) {
            self.setCSSOfBoundingBox($(this), self.getBoundingBoxOfElements($(this).data('source')));
          }
          else {
            self.positionClone($(this), $(this).data('source'));
          }
        });
        _.each(Opentip.tips, function(tip) {
          tip.reposition();
        });
      }, 0);
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
          var opponentRole = self.InfoChess.ROLES.BLACK;
          var opponentRow = '7';
          if (self.role === self.InfoChess.ROLES.BLACK) {
            opponentRole = self.InfoChess.ROLES.WHITE;
            opponentRow = '0';
          }

          var pieces = '"pieces":{';
          pieces += '"4,' + opponentRow + '": {"cost": 0, "limit": 1, "starting_row": 0, "invisible": true, "type": "king", "colour": "' + opponentRole + '"},';
          pieces += '"3,' + opponentRow + '": {"cost": 3, "limit": 1, "starting_row": 0, "invisible": false, "type": "queen", "colour": "' + opponentRole + '"},';
          pieces += '"2,' + opponentRow + '": {"cost": 2, "limit": 2, "starting_row": 0, "invisible": true, "type": "knight", "colour": "' + opponentRole + '"},';
          pieces += '"7,' + opponentRow + '": {"cost": 2, "limit": 2, "starting_row": 0, "invisible": false, "type": "rook", "colour": "' + opponentRole + '"},';
          pieces += '"1,' + opponentRow + '": {"cost": 1, "limit": 2, "starting_row": 0, "invisible": false, "type": "bishop", "colour": "' + opponentRole + '"}';
          pieces += '}';
          var opponentArmy = '{' + pieces + ', "ew_points": 5}';

          self.InfoChess.setArmy(opponentRole, opponentArmy);
          self.InfoChess.setArmy(self.role, serializedArmy);
          if (opponentRole === self.InfoChess.ROLES.WHITE) {
            self.InfoChess.currentRole = self.InfoChess.ROLES.BLACK;
            self.InfoChess.currentTurn.role = self.InfoChess.ROLES.BLACK;
          }
        }
      },
      {
        signal: 'move',
        handler: function(move) {
          return self.InfoChess.move(self.role, new HelperModule.Position(move.src.x, move.src.y), new HelperModule.Position(move.dest.x, move.dest.y));
        },
      },
      {
        signal: 'end_turn',
        handler: function() {
          self.InfoChess.endTurn(self.role);
          self.InfoChess.currentRole = self.role;
        },
      },
      {
        signal: 'ew',
        handler: function(data) {
          self.InfoChess.iw_attack(self.role, {type: 'ew', strength: data.strength});
        }
      },
    ];
  }

  //----------------------------------------------------------------------------
  Opentip.styles.tutorialActionTips = {
    extends: "tutorialTips",
    className: "tutorialActionTips",
    borderColor: "rgb(154, 255, 206)",
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
// Computed CSS Style Copy Functions
// Origin: http://stackoverflow.com/questions/754607/can-jquery-get-all-css-styles-associated-with-an-element/6416527#6416527
//----------------------------------------------------------------------------
(function($){
  $.fn.getStyleObject = function(){
    var dom = this.get(0);
    var style;
    var returns = {};
    if(window.getComputedStyle) {
      var camelize = function(a,b) {
        return b.toUpperCase();
      };
      style = window.getComputedStyle(dom, null);
      for(var i = 0, l = style.length; i < l; i++) {
        var prop = style[i];
        var camel = prop.replace(/\-([a-z])/g, camelize);
        var val = style.getPropertyValue(prop);
        returns[camel] = val;
      };
      return returns;
    };
    if(style = dom.currentStyle) {
      for(var prop in style){
        returns[prop] = style[prop];
      };
      return returns;
    };
    return this.css();
  }
})(jQuery);

$.fn.copyCSS = function(source){
  var styles = $(source).getStyleObject();
  this.css(styles);
}

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
