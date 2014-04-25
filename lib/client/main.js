/**
 * Protect window.console method calls, e.g. console is not defined on IE
 * unless dev tools are open, and IE doesn't define console.debug
 * http://stackoverflow.com/a/13817235/21593
 */
(function() {
  if (!window.console) {
    window.console = {};
  }
  // union of Chrome, FF, IE, and Safari console methods
  var m = [
    "log", "info", "warn", "error", "debug", "trace", "dir", "group",
    "groupCollapsed", "groupEnd", "time", "timeEnd", "profile", "profileEnd",
    "dirxml", "assert", "count", "markTimeline", "timeStamp", "clear"
  ];
  // define undefined methods as noops to prevent errors
  for (var i = 0; i < m.length; i++) {
    if (!window.console[m[i]]) {
      window.console[m[i]] = function() {};
    }
  }
})();

/*
 * Array.indexOf polyfill from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/indexOf
 */
if (typeof Array.prototype.indexOf === 'undefined') {
  Array.prototype.indexOf = function (searchElement, fromIndex) {
    if (!this) {
      throw new TypeError();
    }

    fromIndex = +fromIndex;
    if (isNaN(fromIndex)) {
      fromIndex = 0;
    }

    var length = this.length;

    if (length == 0 || fromIndex >= length) {
      return -1;
    }

    if (fromIndex < 0) {
      fromIndex += length;
    }

    while (fromIndex < length) {
      if (this[fromIndex++] === searchElement) {
        return fromIndex;
      }
    }

    return -1;
  };
}

/*
 * Function.map polyfill from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map
 */
if (!Array.prototype.map)
{
  Array.prototype.map = function(fun /*, thisArg */)
  {
    "use strict";

    if (this === void 0 || this === null)
      throw new TypeError();

    var t = Object(this);
    var len = t.length >>> 0;
    if (typeof fun !== "function")
      throw new TypeError();

    var res = new Array(len);
    var thisArg = arguments.length >= 2 ? arguments[1] : void 0;
    for (var i = 0; i < len; i++)
    {
      // NOTE: Absolute correctness would demand Object.defineProperty
      //       be used.  But this method is fairly new, and failure is
      //       possible only if Object.prototype or Array.prototype
      //       has a property |i| (very unlikely), so use a less-correct
      //       but more portable alternative.
      if (i in t)
        res[i] = fun.call(thisArg, t[i], i, t);
    }

    return res;
  };
}

requirejs.config({
  baseUrl: 'client',
  paths: {
    lib: '../lib',
    underscore: "../js/underscore/underscore"
  },
  shim: {
    underscore: {
      exports: '_'
    }
  }
});

require([
    "underscore",
    "../js/allong.es",
    "../js/ICanHaz.min",
    "lib/helper",
    "lib/infochess",
    "lib/building_board",
    "lib/client/tutorial",
    "lib/popupMessages"],
    function(_,
      allong,
      ICanHaz,
      HelperModule,
      InfoChess,
      BuildingBoardModule,
      Tutorial,
      PopupMessages) {

  var allonges = allong.es;

  function capitaliseFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

  if (Array.prototype.forEach === undefined) {
    Array.prototype.forEach = function(callback) {
      for (var idx = 0; idx < this.length; ++idx) {
        callback(this[idx]);
      }
    };
  }

  if (!Array.prototype.indexOf) {
    Array.prototype.indexOf = function(searchElement /*, fromIndex */) {

      "use strict";

      if (this === void 0 || this === null)
        throw new TypeError();

      var t = Object(this);
      var len = t.length >>> 0;
      if (len === 0)
        return -1;

      var n = 0;
      if (arguments.length > 0)
      {
        n = Number(arguments[1]);
        if (n !== n)
          n = 0;
        else if (n !== 0 && n !== (1 / 0) && n !== -(1 / 0))
          n = (n > 0 || -1) * Math.floor(Math.abs(n));
      }

      if (n >= len)
        return -1;

      var k = n >= 0 ? n : Math.max(len - Math.abs(n), 0);

      for (; k < len; k++) {
        if (k in t && t[k] === searchElement)
          return k;
      }
      return -1;
    };
  }

  var BuildingBoard = BuildingBoardModule.BuildingBoard;
  var Piece = HelperModule.Piece;
  var Position = HelperModule.Position;
  var keyToPosition = HelperModule.keyToPosition;

  var TYPES = [
    'king',
    'queen',
    'rook',
    'knight',
    'bishop',
    'pawn'
  ];

  var metadata = InfoChess.metadata;
  var prefix = /\/(.+\/)play/.exec(window.location.pathname)[1];
  var socket = io.connect(null, {
    'remember transport': false,
    'resource': prefix + 'socket.io'
  });

  var g_ready = false;
  var g_role = 'observer';
  var g_orientation = 'observer';
  var g_username = null;
  var g_gameState = null;
  var g_building_board = null;
  var g_last_phase = null;
  var g_selectedType; // Selected piece type when building army
  var g_playSounds = true;
  var g_soundsLoaded = false;
  var g_actions_enabled = {
    pawn_capture: false,
    psyop_normal: false,
    psyop_reinforced: false,
    psyop_feint: false,
    ew_normal: false,
    ew_reinforced: false,
    ew_feint: false,
    end_turn: false
  };

  var ui_pieces = {}; // "x,y" -> div

  function emitAction(type, data) {
    if (Tutorial.isActive()) {
      Tutorial.emit(type, data);
    } else {
      socket.emit(type, data);
    }
  }

  function isBlackPlayer() {
    return g_role === metadata.roles[1].slug;
  }

  function isWhitePlayer() {
    return g_role === metadata.roles[0].slug;
  }

  function isObserver() {
    return g_role === OBSERVER_ROLE;
  }

  function getPlayerColour() {
    return g_role;
  }

  function isMyTurn() {
    return (g_gameState && g_gameState.getCurrentRole() === g_role);
  }


  var OBSERVER_FLIPPED_ROLE = 'observer_flipped';
  var OBSERVER_ROLE = 'observer';
  var WHITE_ROLE = 'white';
  var BLACK_ROLE = 'black';
  var SQUARE_SIZE = 74;
  var PIECE_MARGIN = 16;

  function getBuildingBoard() {
    if (!g_building_board) {
      g_building_board = new BuildingBoard();
    }
    return g_building_board;
  }

  function recalculateArmy() {
    if (isObserver()) {
      return;
    }

    var building_board = getBuildingBoard();
    var points = building_board.points();

    //for every piece type, see if they should be selectable
    TYPES.forEach(function(type) {
      var positions = building_board.getPossiblePlacements(Piece(type, getPlayerColour()));
      var pieces = $("#piece_selectors #" + type);
      pieces.removeClass('selectable');

      if (!g_ready) {
        //Note: the .animate({'nothing'}) is a trick to restart the CSS animations.
        //For the love of synchronized flashing...
        pieces.animate({'nothing':null}, 1, function() {
          if (positions.length>0) {
            $(this).addClass('selectable');
          } else {
            //if this piece has previously been chosen and now has no places left for it,
            //un-choose it
            if ($(this).hasClass('chosen')) {
              $(this).removeClass('chosen');
              g_selectedType = null;
            }
          }
        });
      }
    });

    //"enable" the ready button if the player met all the requirements
    $('#army_selector #ready').removeClass('selectable')
      .animate({'nothing':null}, 1, function() {
        if (building_board.count('king')) {
          $(this).addClass('selectable');
        };
    });

    var slider = $('#army_selector #reset, #army_selector .ui-slider-handle');
    slider.removeClass('selectable');

    if (!g_ready) {
      slider.animate({'nothing':null}, 1, function() {
        $(this).addClass('selectable');
      });
    }

    renderPointsRemaining($("#army_selector #points_indicator"), building_board.max_points - points);
  }

  function addPiece(container, position, className, margin) {
    var newPieceOnBoard = document.createElement("div");
    var x = position.x;
    var y = position.y;
    if (g_orientation === BLACK_ROLE) {
      //Our orientation is flipped
      x = 7-x;
      y = 7-y;
    } else if (g_orientation === OBSERVER_ROLE) {
      var oldX = x;
      x = 7-y;
      y = oldX;
    } else if (g_orientation === OBSERVER_FLIPPED_ROLE) {
      var oldX = x;
      x = y;
      y = 7-oldX;
    }
    newPieceOnBoard.className += " " + className;
    newPieceOnBoard.style.left = margin + (x * SQUARE_SIZE) + 'px';
    newPieceOnBoard.style.bottom = margin + (y * SQUARE_SIZE) + 'px';
    container.appendChild(newPieceOnBoard);
    return newPieceOnBoard;
  }

  function addNormalPiece(piece, position) {
    var container = document.getElementById('pieces');
    var cssclass = cssClassForPiece(piece) + " normal_piece";
    if (piece.invisible === true) {
      cssclass = cssclass + " invisible";
    }
    var newPieceOnBoard = addPiece(container, position, cssclass, PIECE_MARGIN);

    if (getPlayerColour() === piece.colour) {
      if (g_gameState.getCurrentRole() === g_role && g_gameState.getCurrentPhase() === g_gameState.PHASES.MOVE) {
        $(newPieceOnBoard).addClass('clickable');
        $(newPieceOnBoard).addClass('selectable');
      }
      $(newPieceOnBoard).click(function() {
        if (g_gameState.getCurrentRole() === g_role && g_gameState.getCurrentPhase() === g_gameState.PHASES.MOVE) {
          var wasSelected = $(this).hasClass("selected");

          hideNotification();
          clearSelection();

          if (wasSelected) {
            removeShadowPieces();
            $('#end_move').hide();
          } else {
            this.className += " selected";
            displayPossibleMoves(getPlayerColour(), piece, position);
            $('#end_move').show();
          }
        }
      });
    }

    return newPieceOnBoard;
  }

  function removeTempPieces() {
    $(".temp_piece").remove();
    _.each(getBuildingBoard().pieces, function(piece, pos_key) {
      getBuildingBoard().removePiece(keyToPosition(pos_key));
      recalculateArmy();
    });
  }

  function removeSolidPieces() {
    $(".normal_piece").remove();
  }

  function removeShadowPieces() {
    $("#pieces .shadow_piece").remove();
  }

  function addPsyopCaptureMarker(position) {
    var container = document.getElementById('pieces');
    var cssclass = "psyop_capture";
    var newPieceOnBoard = addPiece(container, position, cssclass, PIECE_MARGIN);
    $(newPieceOnBoard).css('background-image', '');
    $(newPieceOnBoard).css('background-image', "url('images/psyop_capture.gif')");
    return newPieceOnBoard;
  }

  function addInvisiblePiece(position) {
    var container = document.getElementById('pieces');
    var cssclass = "invisible_piece";
    var newPieceOnBoard = addPiece(container, position, cssclass, PIECE_MARGIN);
    $(newPieceOnBoard).css('background-image', '');
    $(newPieceOnBoard).css('background-image', "url('images/invisible_piece.gif')");
    return newPieceOnBoard;
  }

  function addTempPiece(piece, position) {
    var container = document.getElementById('pieces');
    var cssclass = cssClassForPiece(piece) + " temp_piece";
    var newPieceOnBoard = addPiece(container, position, cssclass, PIECE_MARGIN);

    //Add removal marker
    var removalMarker = document.createElement("div");
    removalMarker.className = "removal_marker";
    $(removalMarker).click(function() {
      container.removeChild(newPieceOnBoard);
      getBuildingBoard().removePiece(position);
      displayValidStartingPositions(getPlayerColour(), g_selectedType);
      recalculateArmy();
    });
    newPieceOnBoard.appendChild(removalMarker);

    return newPieceOnBoard;
  }

  function clearSelection() {
    $("#board_table .selected").removeClass("selected");
    $("#board_table .castling_shadow_piece").remove();
  }

  function displayPossibleMoves(role, piece, position) {
    var $pieces = $("#pieces");
    // Clear all shadow pieces
    $("#pieces .shadow_piece").remove();

    var pos_keys = g_gameState.getPossibleMoves(piece, position);

    pos_keys.forEach(function(pos_key) {

      var handler = function(piece, src, dest) {
        return function() {
          clearSelection();
          $('#end_move').hide();
          var move = {
            src: src,
            dest: dest
          };
          emitAction('move', move);
        };
      }(piece, position, keyToPosition(pos_key));

      createMove($pieces, piece, keyToPosition(pos_key), handler);
    });

    var castling = g_gameState.getCastlingMoves(piece);

    // Dirty hack to compensate for weird architecture
    if (piece.type === 'rook') {
      if (castling.kingside && position.asKey() !== new Position(7, piece.starting_row).asKey()) {
        //User has selected the queenside rook
        delete castling.kingside;
      } else if (castling.queenside && position.asKey() !== new Position(0, piece.starting_row).asKey()) {
        //User has selected the kingside rook
        delete castling.queenside;
      }
    }
    createCastlingMoves($pieces, piece, position, castling);
  }

  function createCastlingMoves(container, piece, position, castling) {
    var castlingHandler = function(side, piece) {
      return function() {
        if (side !== 'queenside' && side !== 'kingside') {
          throw "Invalid side for castling: " + side;
        }
        clearSelection();
        var rook_x = side === 'queenside' ? 0 : 7;
        var move = {
          src: new Position(4, piece.starting_row),
          dest: new Position(rook_x, piece.starting_row)
        }
        emitAction('move', move);
      };
    };
    var queensideHandler = castlingHandler('queenside', piece);
    var kingsideHandler = castlingHandler('kingside', piece);

    if ((castling.queenside || castling.kingside) && piece.type !== "king") {
      //highlight the king
      var king_pos = castling.queenside ? castling.queenside.king : castling.kingside.king;
      var king = new Piece('king', getPlayerColour());
      var handler = null;
      if (position.x === 0) {
        handler = queensideHandler;
      } else if (position.x === 7) {
        handler = kingsideHandler;
      } else {
        throw "Invalid position for castling: " + position.asKey();
      }
      createCastlingMove(container, king, new Position(4, king.starting_row), handler);
    }
    if (castling.queenside && piece.type !== "rook") {
      //highlight queenside rook
      var rook_pos = castling.queenside.rook;
      var rook = new Piece('rook', getPlayerColour());
      createCastlingMove(container, rook, new Position(0, rook.starting_row), queensideHandler);
    }
    if (castling.kingside && piece.type !== "rook") {
      //highlight kingside rook
      var rook_pos = castling.kingside.rook;
      var rook = new Piece('rook', getPlayerColour());
      createCastlingMove(container, rook, new Position(7, rook.starting_row), kingsideHandler);
    }
  }

  function displayValidStartingPositions(side, piece_type) {
    var $pieces = $("#pieces").first();

    // Clear all shadow pieces
    $("#pieces .shadow_piece").remove();

    //no type given, bail out.
    if (!piece_type) {
      return;
    }

    // Determine if placement of this piece would go over the army limit
    var building_board = getBuildingBoard();
    var piece = new Piece(piece_type, getPlayerColour());
    var positions = building_board.getPossiblePlacements(piece);
    if (positions.length === 0) {
      return;
    }

    for (i = 0; i < positions.length; i++) {
      var position = positions[i];

      var handler = function(position) {
        return function() {
          addTempPiece(piece, position);
          getBuildingBoard().addPiece(piece, position);
          recalculateArmy();
          displayValidStartingPositions(getPlayerColour(), g_selectedType);
        };
      }(position);

      createMove($pieces, piece, position, handler);
    }
  }

  function cssClassForPiece(piece) {
    return piece.type + '_' + piece.colour;
  }

  function createMove($moves, piece, position, clickHandler) {
    var container = $moves.get(0);
    var cssclass = "shadow_piece " + cssClassForPiece(piece);
    var newPieceOnBoard = addPiece(container, position, cssclass, PIECE_MARGIN);
    $(newPieceOnBoard).click(clickHandler);
  }

  // Add a div to the board at position with the given class. Also attach click handler
  function addToBoard(cssclass, position, clickHandler) {
    var container = $("#pieces").get(0);
    var square = addPiece(container, position, cssclass, PIECE_MARGIN);
    $(square).click(clickHandler);
  }

  function createCastlingMove($moves, piece, position, clickHandler) {
    var container = $moves.get(0);
    var cssclass = "castling_shadow_piece";
    var newPieceOnBoard = addPiece(container, position, cssclass, PIECE_MARGIN);
    $(newPieceOnBoard).click(clickHandler);
  }

  function addPawnCaptureSource(position, clickHandler) {
    addToBoard("pawn_capture_source", position, clickHandler);
  }

  function addPawnCaptureTarget(position, clickHandler) {
    addToBoard("pawn_capture_target", position, clickHandler);
  }

  function setTransitionProperty($element, value) {
    $element.css('transition', value);
    $element.css('webkitTransition', value);
    $element.css('mozTransition', value);
    $element.css('oTransition', value);
  }

  function clearTransitionProperty($element) {
    $element.css('transition', '');
    $element.css('webkitTransition', '');
    $element.css('mozTransition', '');
    $element.css('oTransition', '');
  }

  function setOverlayText($overlay, $flash, text) {
    text = text || "";
    if ($overlay.text() == text) {
      return;
    }
    var oldBackground = $overlay[0].style.background;
    var timeout = 450;
    $overlay.text(text);
    setTransitionProperty($flash, 'background ' + timeout + 'ms');
    $flash.css('background', '#AA3377');
    setTimeout(function() {
      $flash.css('background', oldBackground);
      setTimeout(function() {
        clearTransitionProperty;
      }, timeout);
    }, timeout);
  }

  function hideArmySelector() {
    $('#army_selector').hide();

    if (g_gameState.getCurrentPhase() !== g_gameState.PHASES.SETUP) {
      $('#action_selector').show();
    }

    if (!isObserver()) {
      $("#pawn_capture").show();
    } else {
      $('#ew_actions').addClass('ew_observer_actions');
      $('#psyop_actions').addClass('psyop_observer_actions');
      $('#end_turn').hide();
      $('#end_move').hide();
    }
  }

  function showPawnUpgradeDialog() {
    var $dialog = $('#pawn_upgrade_dialog').first();
    $dialog.css('z-index', '20000').css('visibility', 'visible');
  }

  function updateArmySelector() {
    var $builder = $('#army_selector').first();
    if (!isObserver() && g_gameState.getCurrentPhase() === g_gameState.PHASES.SETUP) {
      $builder.show();
      recalculateArmy();
    } else {
      $(".temp_piece").remove();
      $(".shadow_piece").remove();
      $("#opponent_status").remove();
      hideArmySelector();
    }
  }

  function serializeArmy() {
    return getBuildingBoard().serialize();
  }

  var CHOOSING = "choosing";
  var READY = "ready";
  function update_opponent_status(new_status) {
    var $status = $('#opponent_status').first();
    if (new_status == CHOOSING) {
      $status.text('Opponent is choosing their army.');
    } else if (new_status == READY) {
      $status.text('Opponent is ready.');
    } else {
      console.log("Invalid status: " + new_status);
    }
  }

  function updateBoard() {
    if (!g_gameState) {
      // TODO refresh the placed pieces properly once building boards are persisted
      return;
    }

    var pieces = g_gameState.board.getPieces();
    var usingBuiltArmy = false;

    // If we are still in our setup phase, check to see if we have a pending
    // army already built.
    if (g_gameState.getCurrentPhase() === g_gameState.PHASES.SETUP) {
      if (!g_gameState.builtArmy) {
        if (isObserver()) {
          removeSolidPieces();
        }
        return;
      }

      usingBuiltArmy = true;

      pieces = g_gameState.builtArmy.getPieces();
    }

    removeSolidPieces();
    removeTempPieces();
    removeShadowPieces();

    var piecesOnBoard = ui_pieces || {};

    for (var pos_key in pieces) {
      if (pieces.hasOwnProperty(pos_key)) {
        var piece = pieces[pos_key];
        position = keyToPosition(pos_key);
        if (usingBuiltArmy && !isObserver()) {
          addTempPiece(piece, position);
          getBuildingBoard().addPiece(piece, position);
        } else {
          addNormalPiece(piece, position);
        }
      }
    }

    if (usingBuiltArmy) {
      g_ready = true;
      recalculateArmy();

      var ready = $('#army_selector #ready');
      ready.removeClass("unready");
      ready.addClass("ready");

      $('#piece_selectors > .piece_selector').removeClass('chosen');
      g_selectedType = null;

      $('#pieces .removal_marker').toggle(!g_ready);
      $('#army_selector #ew_points_slider').slider("option", "disabled", g_ready);
      $('#army_selector #ew_points_slider').slider("value", g_gameState.builtArmy.ew_points);
      $('#army_selector #psyop #count').text(g_gameState.builtArmy.max_points - g_gameState.builtArmy.ew_points);
      $('#army_selector #ew #count').text(g_gameState.builtArmy.ew_points);
      getBuildingBoard().setEwPoints(g_gameState.builtArmy.ew_points);
    }
  }

  function updateActions() {
    var phase = g_gameState.getCurrentPhase();
    var phases = g_gameState.PHASES;
    var remainingIW = g_gameState.board.remainingIW;
    var canAttack = false;

    g_actions_enabled.pawn_capture = false;
    g_actions_enabled.psyop_main = false;
    g_actions_enabled.psyop_normal = false;
    g_actions_enabled.psyop_reinforced = false;
    g_actions_enabled.psyop_feint = false;
    g_actions_enabled.ew_main = false;
    g_actions_enabled.ew_normal = false;
    g_actions_enabled.ew_reinforced = false;
    g_actions_enabled.ew_feint = false;
    g_actions_enabled.end_turn = false;

    if (g_gameState.getCurrentRole() !== g_role ||
        phase === phases.SETUP ||
        phase === phases.PAWNUPGRADE ||
        phase === phases.DEFENSE ||
        phase === phases.GAMEOVER ||
        phase === phases.PAWNCAPTURE) {
      //disable all
    } else if (phase === phases.MOVE) {
      //enable only pawn capture
      g_actions_enabled.pawn_capture = true;
    } else if (phase === phases.IW) {
      //enable psyop, ew, end_turn, feint
      if (g_gameState.board.currentPsyOpAttackCost <= remainingIW['psyop']) {
        g_actions_enabled.psyop_normal = true;
      }
      if (g_gameState.board.currentPsyOpAttackCost+1 <= remainingIW['psyop']) {
        g_actions_enabled.psyop_reinforced = true;
      }
      if (g_gameState.board.currentEWAttackCost <= remainingIW['ew']) {
        g_actions_enabled.ew_normal = true;
      }
      if (g_gameState.board.currentEWAttackCost+1 <= remainingIW['ew']) {
        g_actions_enabled.ew_reinforced = true;
      }
      if (g_gameState.board.currentEWAttackCost != 1 && remainingIW['ew'] >= g_gameState.feintCost) {
        g_actions_enabled.ew_feint = true;
      }
      if (g_gameState.board.currentPsyOpAttackCost != 1 && remainingIW['psyop'] >= g_gameState.feintCost) {
        g_actions_enabled.psyop_feint = true;
      }
      if (g_actions_enabled.psyop_normal || g_actions_enabled.psyop_reinforced || g_actions_enabled.psyop_feint) {
        g_actions_enabled.psyop_main = true;
        canAttack = true;
      }
      if (g_actions_enabled.ew_normal || g_actions_enabled.ew_reinforced || g_actions_enabled.ew_feint) {
        g_actions_enabled.ew_main = true;
        canAttack = true;
      }
      g_actions_enabled.end_turn = true;
    }

    $('#end_turn').toggleClass("no_attack", canAttack === true);

    for (var action in g_actions_enabled) {
      if (g_actions_enabled.hasOwnProperty(action)) {
        var enabled = g_actions_enabled[action];
      }
      var $button = $("#"+action);
      $button.toggleClass("disabled", enabled === false);
      $button.toggleClass("selectable", (enabled !== false && action !== "ew_main" && action !== "psyop_main"));
    }
  }

  function renderPointsRemaining($container, points, label, title) {
    label = label || "POINTS";
    $container.text('');
    if (title) {
      $container.append($("<span class='title-above'>"+title+"</span>"));
    }
    $container.append($("<span class='title'>"+label+"</span>"));
    for (var i = 0; i < points; i++) {
      var $block = $("<div class='point_block full'></div>");
      $container.append($block);
    }
    for (i = points; i < 10; i++) {
      var $block = $("<div class='point_block empty'></div>");
      $container.append($block);
    }
    $container.append($("<span class='points'>"+points+"</span>"));
  }

  function updateIW() {
    points = allonges.callRight(pluralize, "point");
    $("#psyop_normal #value").text(points(g_gameState.board.currentPsyOpAttackCost));
    $("#psyop_reinforced #value").text(points(g_gameState.board.currentPsyOpAttackCost + 1));
    $("#psyop_feint #value").text(points(g_gameState.feintCost));
    $("#ew_normal #value").text(points(g_gameState.board.currentEWAttackCost));
    $("#ew_reinforced #value").text(points(g_gameState.board.currentEWAttackCost + 1));
    $("#ew_feint #value").text(points(g_gameState.feintCost));

    if (!isObserver()) {
      renderPointsRemaining($("#action_selector #ew_points_indicator"), g_gameState.board.remainingIW.ew, "E-WARFARE");
      renderPointsRemaining($("#action_selector #psyop_points_indicator"), g_gameState.board.remainingIW.psyop, "PSYOP");
    } else if (g_gameState.getCurrentPhase() !== g_gameState.PHASES.SETUP) {
      renderPointsRemaining($("#action_selector #ew_points_indicator_white"), g_gameState.board.remainingIW.white.ew, "E-WARFARE", "WHITE");
      renderPointsRemaining($("#action_selector #psyop_points_indicator_white"), g_gameState.board.remainingIW.white.psyop, "PSYOP");
      renderPointsRemaining($("#action_selector #ew_points_indicator_black"), g_gameState.board.remainingIW.black.ew, "E-WARFARE", "BLACK");
      renderPointsRemaining($("#action_selector #psyop_points_indicator_black"), g_gameState.board.remainingIW.black.psyop, "PSYOP");
    }
  }

  function showNotification(message, timeout) {
    var $container = $("#table_area");
    $("#notification").remove();
    var $notification = $(document.createElement('div')).attr('id', 'notification');
    $notification.text(message);
    $container.append($notification);

    if (timeout) {
      var delayMS = 2000;
      setTimeout(function() {
        hideNotification();
      }, delayMS);
    }
  }

  function hideNotification() {
    $("#notification").remove();
  }

  function enablePsyopVictims(targets) {
    $('.psyop_target').remove();
    hideIWDefenseDialog();
    showNotification("Choose piece to be captured");
    _.each(targets, function(position) {
      var clickHandler = function() {
        hideNotification();
        emitAction('iw_defense', { defend: false, chosen_position: position });
        $(".psyop_target").remove();
      };
      addToBoard("psyop_target selectable", new Position(position.x, position.y), clickHandler);
    });
  }

  function showPsyopTargets(targets) {
    $('.psyop_target').remove();
    showNotification("If you fail to defend, you will lose a highlighed piece.");
    _.each(targets, function(position) {
      var handler = function() {
        hideNotification();
      };
      addToBoard("psyop_target", new Position(position.x, position.y), handler);
    });
  }

  function clearPawnCaptureTargets() {
    $(".pawn_capture_target").remove();
  }

  function updatePawnCaptures(captures) {
    var me = this;
    var sources = [];
    var targets = {};
    var i;
    for (i = 0; i < captures.length; i++) {
      var capture = captures[i];
      if (sources.indexOf(capture.src) === -1) {
        sources.push(capture.src);
      }
      targets[new Position(capture.dest.x, capture.dest.y).asKey()] = capture.dest;
    }

    showNotification("These pawns can capture. Choose one.");

    for (i = 0; i < sources.length; i++) {
      var sourceHandler = function(src) {
        return function() {
          var dir_mod = getPlayerColour() === "white" ? 1 : -1;
          var left  = new Position(src.x - 1, src.y + (1*dir_mod));
          var right = new Position(src.x + 1, src.y + (1*dir_mod));
          clearPawnCaptureTargets();
          showNotification("Choose target to capture.");

          var addTarget = function(position) {
            if (targets[position.asKey()]) {
              var handler = function() {
                var move = {
                  src: src,
                  dest: position
                };
                emitAction('move', move);
              };
              addPawnCaptureTarget(position, handler);
            }
          };

          addTarget(left);
          addTarget(right);
        };
      }(sources[i]);
      addPawnCaptureSource(new Position(sources[i].x, sources[i].y), sourceHandler);
    }
  }

  function updateTurnCount(turn_count) {
    var $turn_count_container = $("#turn_count_container");
    if (!turn_count || turn_count == 0) {
      $turn_count_container.css('display', 'none');
      return;
    }

    var $turn_count = $("#turn_count");
    $turn_count_container.css('display', 'block');
    $turn_count.text(turn_count);
  }

  function updateLastTurnReport(last_turn_report) {
    if (!last_turn_report) {
      return;
    }

    var report = "";
    var iw_report = "";
    var options = {
      role: last_turn_report.role,
      src: last_turn_report.move.src,
      dest: last_turn_report.move.dest,
      captured_piece: last_turn_report.move.captured_piece,
      moving_piece: last_turn_report.move.moving_piece,
      strength: last_turn_report.iw_attack.strength,
    };
    if (last_turn_report.move) {
      if (last_turn_report.move.invisible) {
        report += Mustache.render("{{role}} made a move.", options);
      } else if (last_turn_report.move.captured_piece && last_turn_report.move.src && last_turn_report.move.dest) {
        report += Mustache.render("{{role}} moved a {{moving_piece}} from {{src}} to {{dest}}, capturing a {{captured_piece}}.", options);
      } else if (last_turn_report.move.captured_piece) {
        report += Mustache.render("{{role}} moved a {{moving_piece}} to {{dest}}, capturing a {{captured_piece}}.", options);
      } else if (last_turn_report.move.src && last_turn_report.move.dest) {
        report += Mustache.render("{{role}} moved a {{moving_piece}} from {{src}} to {{dest}}.", options);
      } else {
        report += Mustache.render("{{role}} couldn't move.", options);
      }
    }

    if (last_turn_report.iw_attack.type === 'psyop') {
      iw_report = "Psyop attack ";
    } else if (last_turn_report.iw_attack.type === 'ew') {
      iw_report = "E-Warfare attack ";
    }

    if (last_turn_report.iw_attack.success) {
      if (last_turn_report.iw_attack.outcome) {
        options.position = last_turn_report.iw_attack.outcome.location;
        options.captured_piece = last_turn_report.iw_attack.outcome.type;
        iw_report += Mustache.render("was successful, capturing a {{captured_piece}} at {{position}}.", options);
      } else {
        iw_report += "was successful.";
      }
    } else if (last_turn_report.iw_attack.success === false) { // Could be undefined if attack type was null
      iw_report += "had no effect.";
    }
    report += " " + iw_report;

    $("#last_turn_report #content").text(capitaliseFirstLetter(report));
  }

  function playSound(id) {
    if (g_playSounds) {
      var sound = document.getElementById(id);
      if (sound.readyState === 4 || sound.readyState === 2) { // HAVE_ENOUGH_DATA && HAVE_CURRENT_DATA - aka it's loaded
        sound.play();
      }
    }
  }

  function notifyPlayer() {
    if ((isWhitePlayer() && g_gameState.isWhiteTurn()) ||
        (isBlackPlayer() && g_gameState.isBlackTurn())) {
      playSound('your_turn');
    }
  }

  function phaseHasChanged(old_phase, new_phase) {
    var $overlay = $('#dashboard #status').first();
    var $flash = $('.overlay_flash');
    hideNotification();

    var phases = g_gameState.PHASES;
    if (old_phase === phases.IW || old_phase === phases.DEFENSE) {
      // it's now their turn
      notifyPlayer();
    }

    var msg = "";

    if (new_phase === phases.SETUP) {
      // if army is done
      // msg = "WAITING FOR OPPONENT";
      // else
      if (isObserver()) {
        msg = "BUILDING ARMIES";
      } else {
        msg = "BUILD YOUR ARMY";
      }
    } else if (isObserver()) {
      if (g_gameState.getCurrentRole() == WHITE_ROLE) {
        msg = "WHITE'S TURN";
      } else {
        msg = "BLACK'S TURN";
      }
    } else if (new_phase === phases.PAWNCAPTURE) {
      if (isMyTurn()) {
        msg = "CAPTURE WITH PAWN";
      } else {
        msg = "OPPONENT'S MOVE";
      }
    } else if (new_phase === phases.MOVE) {
      msg = (isMyTurn() ? "YOUR" : "OPPONENT'S") + " MOVE";
    } else if (new_phase === phases.IW) {
      msg = (isMyTurn() ? "YOUR" : "OPPONENT'S") + " ACTION";
    } else if (new_phase === phases.DEFENSE) {
      if (isMyTurn()) {
        msg = "DEFEND";
      } else {
        msg = "OPPONENT DEFENDING";
      }
    } else if (new_phase === phases.PAWNUPGRADE) {
      if (isMyTurn()) {
        msg = "UPGRADE YOUR PAWN";
      } else {
        msg = "OPPONENT IS UPGRADING";
      }
    } else if (new_phase === phases.GAMEOVER) {
      var winOrLose;
      if (g_gameState.getWinner()) {
        var winner = _.find(metadata.roles, function(role){ return role.slug === g_gameState.getWinner();});
        msg = winner.name.toUpperCase() + " WINS";
        winOrLose = (g_gameState.getWinner() === getPlayerColour()) ? 'win' : 'lose';
      } else {
        msg = "GAME IS A DRAW";
      }

      //create a popup end game message declaring the results
      var outcomeMsg, outcome;
      if (winOrLose) {
        outcomeMsg = (winOrLose == 'win') ? 'You Win!':'You Lose!';
        outcome = winOrLose;
      } else {
        outcomeMsg = 'It\'s a draw!';
        outcome = 'win';
      }

      var $html = $(ich.flashMessage({line1:'Game is over',
                                     line2:outcomeMsg,
                                     outcome:outcome}));
      flashMessage($html); //show the messages
    }

    setOverlayText($overlay, $flash, msg);
  }

  function printMessage(user, message, role) {
    var $messages = $("#chat_messages");
    $chat = ich.chat_message({user: user, message: message, role: role});
    $messages.append($chat);
    $messages.scrollTop($messages.prop('scrollHeight'));

    if ($chat.css('display') === 'none') {
      $chat_message_indicator.show();
    }
  }

  function createArmySelector() {
    /*
          <li id="king"><img class="piece" src="images/king_white.100x100.png">King</li>
          <li id="queen"><img class="piece" src="images/queen_white.100x100.png">Queens: <span class="count">0</span> (cost: 3 points)</li>
          <li id="knight"><img class="piece" src="images/knight_white.100x100.png">Knights: <span class="count">0</span> (cost: 2 points)</li>
          <li id="rook"><img class="piece" src="images/rook_white.100x100.png">Rooks: <span class="count">0</span> (cost: 2 points)</li>
          <li id="bishop"><img class="piece" src="images/bishop_white.100x100.png">Bishops: <span class="count">0</span> (cost: 1 point)</li>
          <li id="pawn"><img class="piece" src="images/pawn_white.100x100.png">Pawns: <span class="count">0</span> (cost: 1 point)</li>
    */
    if (isObserver()) {
      return;
    }

    // TODO this data should read from the InfoChess/BuildingBoard class
    var pieces = ["king", "queen", "knight", "rook", "pawn", "bishop"];
    var costs  = [     0,       3,        2,      2,      1,        1];
    var invis  = [  true,   false,     true,  false,   true,    false];
    var container = document.getElementById('piece_selectors');

    // TODO hook up some templating here
    for (var i = 0; i < pieces.length; i++) {
      var piece = pieces[i];
      var cost = costs[i];
      var invisible = invis[i];

      var title = piece;
      var tooltip = '';
      if (invisible) {
        tooltip += "This pieces starts the game invisible. If it captures a piece, or moves into the last three rows, it will become visible. ";
      }
      if (piece === 'bishop') {
        tooltip += "Each bishop must be placed on a differently coloured square. ";
      }

      if (piece === 'pawn') {
        tooltip += "Max 8. ";
      } else if (piece === 'queen') {
        tooltip += "Max 1. ";
      } else if (piece === 'king') {
        tooltip += "Required. ";
      } else {
        tooltip += "Max 2. ";
      }

      points = allonges.callRight(pluralize, "point");
      tooltip += "Costs "+points(cost)+".";

      var suffix = invisible ? "-invisible" : '';
      var src = "images/"+piece+"_"+getPlayerColour()+suffix+".100x100.png";
      var div = document.createElement("div");
      div.id = piece;
      div.className = "piece_selector";
      div.innerHTML = "<div id='"+piece+"_cost' class='cost_indicator'>"+cost+"p</div><img class='piece' src='"+src+"'>";
      container.appendChild(div);
      new Opentip(div, tooltip, title);
    }
    $(container).tooltip();

    $('#army_selector #ready').bind('click', function() {
      if (!g_ready) {
        //only fire if board meets requirements
        if (!getBuildingBoard().count('king')) {
          return;
        }
        emitAction('select_army', serializeArmy());
        g_ready = true;

        //lock down the piece editing; no more editing until user clicks reset.
        removeShadowPieces();
        $("#piece_selectors").children().removeClass('selectable chosen');
        $('#army_selector #reset, #army_selector .ui-slider-handle').removeClass('selectable')
      } else {
        emitAction('unready');
        g_ready = false;
      }

      $(this).toggleClass("unready");
      $(this).toggleClass("ready");
      $("#pieces .removal_marker").toggle(!g_ready);
      $('#army_selector #ew_points_slider').slider("option", "disabled", g_ready);
    });

    $('#army_selector #reset').bind('click', function() {
      if (g_ready){
        //punt if we're already 'ready'. User will have to toggle the 'ready' button
        //in order to be able to reset.
        return;
      }
      removeTempPieces();
      removeShadowPieces();
      //remove any previously chosen pieces as well
      $('#piece_selectors > .piece_selector').removeClass('chosen');
      g_selectedType = null;
    }).addClass('selectable');

    $( "#army_selector #ew_points_slider" ).slider({
      range: "max",
      min: 0,
      max: 10,
      value: 5,
      slide: function( event, ui ) {
        var psyop_points = 10-ui.value;
        var ew_points = ui.value;
        $('#army_selector #psyop #count').text(psyop_points);
        $('#army_selector #ew #count').text(ew_points);
        getBuildingBoard().setEwPoints(ew_points);
      }
    });

    $('#piece_selectors > .piece_selector').addClass('selectable');
    $('#piece_selectors > .piece_selector').bind('click', function(event) {
      var $div = $(this);
      if (!$div.hasClass('selectable')) {
        //bail out if the user clicked on a piece that wasn't 'selectable'
        return;
      }

      if ($div.hasClass('chosen')) {
        $div.removeClass('chosen');
        g_selectedType = null;
      } else {
        $('#piece_selectors > .piece_selector').removeClass('chosen');
        $div.addClass('chosen');
        g_selectedType = this.id;
      }
      displayValidStartingPositions(getPlayerColour(), g_selectedType);
    });
  }

  function initPawnUpgradeDialog() {
    if (isObserver()) {
      return;
    }
    var pieces = ["queen", "knight", "rook", "bishop"];
    var container = $('#upgrade_list');

    $('.piece_wrapper').remove();

    _.each(pieces, function(piece) {
      var src = "images/" + piece + "_" + getPlayerColour() + ".100x100.png";
      var div = $('<div id="' + piece + '" class="piece_wrapper"></div>');
      var imgDiv = $('<img class="piece" src="' + src + '"/>');
      var nameDiv = $('<div class="piece_name">' + piece + '</div>');
      div.append(imgDiv);
      div.append(nameDiv);
      div.click(function() {
        emitAction('pawn_upgrade', piece);
        $dialog = $('#pawn_upgrade_dialog').hide();
      });
      container.append(div);
    });
  }

  $('#pawn_capture').bind('click', function() {
    if (g_actions_enabled.pawn_capture) {
      emitAction('pawn_capture_query');
    }
  });
  $('#psyop_normal').bind('click', function() {
    if (g_actions_enabled.psyop_normal) {
      emitAction('psyop', { strength: 'normal' });
    }
  });
  $('#psyop_reinforced').bind('click', function() {
    if (g_actions_enabled.psyop_reinforced) {
      emitAction('psyop', { strength: 'reinforced' });
    }
  });
  $('#psyop_feint').bind('click', function() {
    if (g_actions_enabled.psyop_feint) {
      emitAction('psyop', { strength: 'feint' });
    }
  });
  $('#ew_normal').bind('click', function() {
    if (g_actions_enabled.ew_normal) {
      emitAction('ew', { strength: 'normal' });
    }
  });
  $('#ew_reinforced').bind('click', function() {
    if (g_actions_enabled.ew_reinforced) {
      emitAction('ew', { strength: 'reinforced' });
    }
  });
  $('#ew_feint').bind('click', function() {
    if (g_actions_enabled.ew_feint) {
      emitAction('ew', { strength: 'feint' });
    }
  });
  $('#end_turn').bind('click', function() {
    if (g_actions_enabled.end_turn) {
      emitAction('end_turn');
    }
  });
  $('#end_move').bind('click', function() {
    hideNotification();
    clearSelection();
    removeShadowPieces();
    $(this).hide();
  });

  function onSocketConnect() {
  }

  function onSocketUserData(userdata) {
    g_username = userdata.username;
  }

  function onSocketMessage(data) {
    printMessage(data.user, data.message, data.role);
    window.scrollTo(0, document.body.scrollHeight);
  }

  function onSocketChatHistory(chat_messages) {
    _.each(chat_messages, function(chat_message) {
      printMessage(chat_message.user, chat_message.message, chat_message.role);
    });
  }

  function onSocketUserOnline(name) {
    printMessage('server', name + " has come online.");
  }

  function onSocketUserOffline(name) {
    printMessage('server', name + " disconnected.");
  }

  function onSocketError(msg) {
    if (typeof msg !== 'string') {
      if (msg.hasOwnProperty('message') && typeof msg.message === 'string') {
        msg = msg.message;
      }
    }
    printMessage("server", "Error: " + msg + " - please file a bug report.", "server");
    console.log("Server error: " + msg);
    window.scrollTo(0, document.body.scrollHeight);
  }

  function onSocketSessionError(data) {
    console.log("Invalid session. Reloading.");
    location.reload();
  }

  function onSocketUserDisconnect(data) {
    var userSpan = document.getElementById(data.user);
    if (socket.id != data.user && userSpan && userSpan.parentNode) {
      userSpan.parentNode.remove(userSpan);
    }
  }

  function onSocketOpponentReady() {
    update_opponent_status(READY);
  }

  function onSocketOpponentChoosing() {
    update_opponent_status(CHOOSING);
  }

  function onSocketRole(role) {
    g_role = role;
    Tutorial.setRole(role);
    if (role === WHITE_ROLE) {
      printMessage("server", "You are the White player!", "server");
    } else if (role === BLACK_ROLE) {
      printMessage("server", "You are the Black player!", "server");
    } else {
      printMessage("server", "You are an observer", "server");
      $('#flip_orientation').show();
    }
    setupBoardOrientation(role);
    createArmySelector();
    initPawnUpgradeDialog();
  }

  function onSocketNumConnectedUsers(numConnectedUsers) {
    if (numConnectedUsers >= 1) {
      $('.board_table').first().show();
    } else {
      $('.board_table').first().hide();
    }
  }

  function onSocketGetVote(vote) {
    var choice = confirm(vote.question);
    emitAction('vote', {name: vote.name, choice: choice ? 'yes' : 'no'});
  }

  function onSocketUserInfo(userInfo) {
    $('#username').val(userInfo.name);
  }

  function onSocketDefend(data) {
    handleDefense(data);
  }

  function onSocketDrawOffered(data) {
    if (isObserver()) {
      return;
    }

    var user = data.by;
    printMessage('server', "A draw has been offered by " + user + ".");
    if (user !== g_username) {
      showAcceptDrawDialog();
    }
  }

  function onSocketDrawRejected(data) {
    printMessage('server', "The draw offer has been rejected.");
  }

  function onSocketDrawAccepted(data) {
    printMessage('server', "The draw offer has been accepted. Game over.");
  }

  function flashMessage($flash) {
    if (!Modernizr.cssanimations) {
      return;
    }

    //Jquery UI overlay, to support a modal message to the user
    var $overlay = $("#modalMessageOverlay");
    $overlay.show();
    $("#flashes").append($flash);
    $("#flashes").show();

    $flash.fadeIn(500, function() {
      $(this).addClass("selectable");
      $(this).one('click', function(event) {
        $(this).remove();
        $("#modalMessageOverlay").hide();
        $("#flashes").hide();
      });
    });
  }

  function onSocketUpdate(updateResponse) {
    if (!updateResponse || !updateResponse.gameState) {
      return;
    }

    g_gameState = new InfoChess.InfoChess;
    g_gameState.fromDTO(updateResponse.gameState);

    if (g_last_phase !== g_gameState.getCurrentPhase()) {
      phaseHasChanged(g_last_phase, g_gameState.getCurrentPhase());
      g_last_phase = g_gameState.getCurrentPhase();
    }

    if (!isObserver() && g_gameState.getCurrentPhase() === g_gameState.PHASES.SETUP) {
      $("#table_area").removeClass("playing_area");
      $("#table_area").addClass("building_area");

      if (!Tutorial.isActive() && !Tutorial.isFinished()) {
        if (!g_gameState.builtArmy) {
          beginTutorial();
        } else {
          Tutorial.setFinished();
        }
      }
    } else {
      $("#table_area").removeClass("building_area");
      $("#table_area").addClass("playing_area");
    }
    updateBoard();
    updateArmySelector();
    updateActions();
    updateIW();
    updateLastTurnReport(updateResponse.gameState.last_turn_report);
    updateTurnCount(updateResponse.gameState.turn_count);
    if (g_gameState.currentPhase === g_gameState.PHASES.PAWNUPGRADE &&
      g_gameState.currentRole == getPlayerColour()) {
      showPawnUpgradeDialog();
    } else if (g_gameState.currentPhase === g_gameState.PHASES.DEFENSE &&
      g_gameState.currentRole == getPlayerColour()) {
      var targets = updateResponse.result ? updateResponse.result.targets : null;
      handleDefense(g_gameState.current_iw_attack, targets);
    }

    if (updateResponse.result && updateResponse.result.pawn_captures) {
      if (updateResponse.result.pawn_captures.length === 0) {
        showNotification("No targets available for pawn capture.");
      } else {
        updatePawnCaptures(updateResponse.result.pawn_captures);
      }
    }

    if (updateResponse.result && updateResponse.result.msg == "PSYOP_CHOOSE_VICTIM") {
      var targets = updateResponse.result.targets;
      enablePsyopVictims(targets);
    }

    if (!isObserver() && updateResponse.result && updateResponse.result.msg === "DEFENSE_RESULT") {
      var result = updateResponse.result;



      var outcome = '';
      var viewer = '';

      if (result.attacker === getPlayerColour()) {
        viewer = "attacker";
      } else {
        viewer = "defender";
      }

      if (result.wasDefended) {
        outcome = "defended";
      } else {
        outcome = "ignored";
      }

      var query = {type:result.type, strength:result.strength, outcome:outcome, viewer:viewer};
      var data = PopupMessages.getText(query); //get the data corresponding to this event

      var $html = $(ich.flashMessage(data));
      $html.addClass(outcome); //color the text based on win/lose condition

      flashMessage($html); //show the messages
    }

    if (updateResponse.result && updateResponse.result.type === "pawnbump") {
      var dest = updateResponse.result.dest;
      addInvisiblePiece(new Position(dest.x, dest.y));
    }

    if (updateResponse.result && updateResponse.result.msg === "DEFENSE_RESULT" && updateResponse.result.type === "psyop" && updateResponse.result.captured_position) {
      var dest = updateResponse.result.captured_position;
      addPsyopCaptureMarker(new Position(dest.x, dest.y));
    }

    if (isObserver() || g_gameState.isGameOver()) {
      $("#show_confirm_forfeit").addClass("disabled");
      $("#show_offer_draw").addClass("disabled");
    }

    if (isMyTurn() && g_gameState.getCurrentPhase() === g_gameState.PHASES.PAWNCAPTURE && !updateResponse.result.pawn_captures) {
      // Client refreshed after issuing pawn capture query, but before completing the capture. We've lots the resulting data.
      emitAction('pawn_capture_query');
    }

    if (updateResponse.notes) {
      $notes_content.val(updateResponse.notes);
    }

    if (updateResponse.history) {
      updateHistoryLog(updateResponse.history);
    }

    // if (isMyTurn() && g_gameState.getCurrentPhase() === g_gameState.PHASES.IW) {
    //   // If the player has no actions to play, automatically end the turn for them
    //   if (!g_actions_enabled.psyop_main && !g_actions_enabled.ew_main) {
    //     emitAction('end_turn');
    //   }
    // }
  }

  socket.on('connect', onSocketConnect);

  socket.on('userdata', onSocketUserData);

  // receive messages
  socket.on('message', onSocketMessage);
  socket.on('chat_history', onSocketChatHistory);
  socket.on('user_online', onSocketUserOnline);
  socket.on('user_offline', onSocketUserOffline);
  socket.on('error', onSocketError);
  socket.on('session_error', onSocketSessionError);
  socket.on('user_disconnect', onSocketUserDisconnect);

  socket.on('opponent_ready', onSocketOpponentReady);

  socket.on('opponent_choosing', onSocketOpponentChoosing);

  socket.on('role', onSocketRole);

  socket.on('num_connected_users', onSocketNumConnectedUsers);

  socket.on('getVote', onSocketGetVote);

  socket.on('user_info', onSocketUserInfo);

  socket.on('defend', onSocketDefend);

  socket.on('draw_offered', onSocketDrawOffered);

  socket.on('draw_rejected', onSocketDrawRejected);

  socket.on('draw_accepted', onSocketDrawAccepted);

  socket.on('update', onSocketUpdate);

  // send message functionality
  var messageInput = document.getElementById('chat_input');
  var usernameInput = document.getElementById('username');
  var sendMessage = function() {
    var message = messageInput.value;
    if (!message) {
      return;
    }
    var user = usernameInput.value || 'player';
    // TODO username should be determined on the server.
    emitAction('message', { user: user, message: message });
    messageInput.value = '';
    messageInput.focus();
  };

  // send messages
  $(messageInput).bind('keypress', function(evt) {
    if (evt.keyCode == 13) { sendMessage(); }
  });

  $(".toggle_sound").bind('click', function() {
    if (g_playSounds) {
      g_playSounds = false;
      $("#toggle_sound").text("Enable Sound");
      $("#volume_control").addClass("volume_control_off");
      $("#volume_control").removeClass("volume_control_on");
    } else {
      g_playSounds = true;
      $("#toggle_sound").text("Disable Sound");
      $("#volume_control").addClass("volume_control_on");
      $("#volume_control").removeClass("volume_control_off");
    }
  });

  function showSettings() {
    $("#settings_dialog").css("visibility", "visible");
    $("#settings_content").css("visibility", "visible");
    $("#settings_dialog").css("z-index", "20000");
  }
  function hideSettings() {
    $("#settings_dialog").css("visibility", "hidden");
    $("#settings_content").css("visibility", "hidden");
    $("#settings_dialog").css("z-index", "0");
  }
  function showForfeitDialog() {
    $("#settings_content").css("visibility", "hidden");
    $("#forfeit_content").css("visibility", "visible");
  }
  function hideForfeitDialog() {
    $("#forfeit_content").css("visibility", "hidden");
    $("#settings_content").css("visibility", "visible");
  }
  function showOfferDrawDialog() {
    $("#settings_content").css("visibility", "hidden");
    $("#offer_draw_content").css("visibility", "visible");
  }
  function hideOfferDrawDialog() {
    $("#offer_draw_content").css("visibility", "hidden");
    $("#settings_content").css("visibility", "visible");
  }
  function showAcceptDrawDialog() {
    $("#settings_content").css("visibility", "hidden");
    $("#settings_dialog").css("visibility", "visible");
    $("#accept_draw_content").css("visibility", "visible");
    $("#settings_dialog").css("z-index", "20000");
  }
  function hideAcceptDrawDialog() {
    $("#accept_draw_content").css("visibility", "hidden");
    hideSettings();
  }
  function handleDefense(iw_attack, targets) {
    var type = iw_attack.type;
    // if (g_gameState.getCurrentPhase() === g_gameState.PHASES.DEFENSE && isMyTurn() && g_gameState.board.remainingIW[type] < iw_attack.defense_cost) {
    //   //Not enough points to defend!
    //   if (!targets) { // They need to choose one of multiple targets
    //     emitAction('iw_defense', { defend: false });
    //   }
    //   return;
    // }
    showIWDefenseDialog(iw_attack);
    if (iw_attack.type === 'psyop') {
      showPsyopTargets(g_gameState.board.psyop_attack_targets(iw_attack));
    }
  }
  function showIWDefenseDialog(context) {
    var hasEnough = g_gameState.board.remainingIW[context.type] < context.defense_cost? false: true;
    var status = 'enabled';
    if (!hasEnough) {
      status = "disabled";
    }
    $dialog = ich.iw_defense_dialog({type: context.type, cost: context.defense_cost, status: status});
    renderPointsRemaining($dialog.find("#remaining_points"), g_gameState.board.remainingIW[context.type], " ");
    $dialog.find("#ignore").bind('click', function() {
      emitAction('iw_defense', { defend: false });
      hideIWDefenseDialog();
    });
    if (hasEnough) {
      $dialog.find("#defend").bind('click', function() {
        emitAction('iw_defense', { defend: true });
        hideIWDefenseDialog();
      });
    }
    $("body").append($dialog);
  }
  function hideIWDefenseDialog() {
    $(".iw_defense_dialog").remove();
  }

  $("#settings").bind('click', function() {
    if ($("#settings_dialog").css("visibility") == "visible") {
      hideForfeitDialog();
      hideOfferDrawDialog();
      hideSettings();
    } else {
      showSettings();
    }
  });
  $("#settings_content .close").bind('click', function() {
    hideSettings();
  });

  $("#show_confirm_forfeit").bind('click', function() {
    if (!isObserver() && !g_gameState.isGameOver()) {
      showForfeitDialog();
    }
  });
  $("#forfeit_content .close").bind('click', function() {
    hideForfeitDialog();
  });
  $("#confirm_forfeit").bind('click', function() {
    forfeit_game();
    hideForfeitDialog();
    hideSettings();
  });

  $("#show_offer_draw").bind('click', function() {
    if (!isObserver() && !g_gameState.isGameOver()) {
      showOfferDrawDialog();
    }
  });
  $("#offer_draw_content .close").bind('click', function() {
    hideOfferDrawDialog();
  });
  $("#confirm_offer_draw").bind('click', function() {
    offer_draw();
    hideOfferDrawDialog();
    hideSettings();
  });

  $("#accept_draw").bind('click', function() {
    hideAcceptDrawDialog();
    accept_draw();
  });
  $("#accept_draw_content .close").bind('click', function() {
    hideAcceptDrawDialog();
    reject_draw();
  });
  $("#flip_orientation").bind('click', function() {

    var orientation = g_orientation;
    if (g_orientation === OBSERVER_ROLE) {
      orientation = WHITE_ROLE;
    } else if (g_orientation === WHITE_ROLE) {
      orientation = OBSERVER_FLIPPED_ROLE;
    } else if (g_orientation === OBSERVER_FLIPPED_ROLE) {
      orientation = BLACK_ROLE;
    } else {
      orientation = OBSERVER_ROLE;
    }

    setupBoardOrientation(orientation);
  });

  var $notes = $("#notes");
  var $chat = $("#chat");
  var $log = $("#log");
  var $chat_message_indicator = $("#chat_message_indicator");

  var tabs = {
    notes: { content: $notes, selector: $("#notes_selector"), bg_url: "images/tab_notes.png" },
    chat: { content: $chat, selector: $("#chat_selector"), indicator: $chat_message_indicator, bg_url: "images/tab_chat.png" },
    log: { content: $log, selector: $("#log_selector"), bg_url: "images/tab_log.png" },
  };

  function setupBoardOrientation(orientation) {
    $('body').removeClass(g_orientation);

    g_orientation = orientation;
    $('body').addClass(g_orientation);
    $('#orientation_label').text(g_orientation.substring(0, 6));

    $('[id^=coord]').show();
    var coords = "";

    // Update board coordinates.
    if (g_orientation === OBSERVER_ROLE) {
      coords = "HGFEDCBA87654321";
    } else if (g_orientation === OBSERVER_FLIPPED_ROLE) {
      coords = "ABCDEFGH12345678";
    } else if (g_orientation === WHITE_ROLE) {
      coords = "87654321ABCDEFGH";
    } else {
      coords = "12345678HGFEDCBA";
    }

    $('[id^=coord]').each(function(key, value){
      $(this).text(coords.substring(key, key+1));
    });

    updateBoard();
  };

  function showTab(tab) {
    var otherTabs;
    var $tab = tab.content;
    var $tabSelector = tab.selector;

    if ($tab.css('display') === 'none') {
      //Disable other tabs
      otherTabs = _.reject(tabs, function(t) { return t === tab; });
      _.each(otherTabs, function(t) {
        t.content.hide();
        t.selector.removeClass("selected");
        t.selector.addClass("deselected");
      });

      //Enable this one
      $tab.show();
      $tabSelector.addClass("selected");

      // Hide the indicator, if there is one
      if (tab.indicator) {
        tab.indicator.hide();
      }

      // Set the background image
      $("#text_panels").css('background', 'top left no-repeat url("'+tab.bg_url+'")');
    }
  }

  _.each(tabs, function(tab) {
    tab.selector.bind('click', function() {
      showTab(tab);
    });
  });

  var $notes_content = $("#notes_content");
  $notes_content.bind('change', function() {
    emitAction('notes', $notes_content.val());
  });

  function updateHistoryLog(history) {
    var $content = $("#log_messages");
    $content.text('');
    _.each(history, function(entry) {
      var $entry = ich.history_entry({
        text: entry.text,
        type: entry.type
      });
      $content.append($entry);
      $content.get(0).scrollTop = $content.get(0).scrollHeight;
    });
  }

  function forfeit_game() {
    emitAction('forfeit');
  }

  function offer_draw() {
    emitAction('offer_draw');
  }

  function accept_draw() {
    emitAction('accept_draw');
  }

  function reject_draw() {
    emitAction('reject_draw');
  }

  $( document ).tooltip();
  $('#pawn_capture').tooltip({ position: { my: "right" }});

  function pluralize(value, noun) {
    if (value === 1) {
      return value + " " + noun;
    }
    return value + " " + noun + "s"; // TODO support other noun forms
  };

  Tutorial.init(socket, onSocketUpdate, tutorialEnd);

  function beginTutorial() {
    Tutorial.show();
  };

  function tutorialEnd() {
    g_ready = false;
    removeTempPieces();
    removeSolidPieces();
    removeShadowPieces();
    $('#action_selector').hide();
    $('#army_selector #ew_points_slider').slider("option", "disabled", g_ready);
  }
});
