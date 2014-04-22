define(['underscore', 'lib/helper'], function(_, HelperModule) {

var Position = HelperModule.Position;
var Piece = HelperModule.Piece;
var keyToPosition = HelperModule.keyToPosition;
var InvalidMessageError = HelperModule.InvalidMessageError;

function PlayingBoard() {
  this.currentPsyOpAttackCost = 1;
  this.currentPsyOpDefendCost = 2;
  this.currentEWAttackCost = 2;
  this.currentEWDefendCost = 1;
  this.feintCost = 1;
  this.remainingIW = {
    'white': {
      'psyop': 5, 'ew': 5
    },
    'black': {
      'psyop': 5, 'ew': 5
    },
    'observer': {
      'psyop': 0, 'ew': 0
    },
  };
  if (arguments.length === 2) {
    var whiteBuildingBoard = arguments[0];
    var blackBuildingBoard = arguments[1];

    if (!whiteBuildingBoard || !blackBuildingBoard) {
      throw new Error("Both white and black armies must be supplied");
    }

    this.remainingIW.white.psyop = 10 - whiteBuildingBoard.ew_points;
    this.remainingIW.white.ew = whiteBuildingBoard.ew_points;

    this.remainingIW.black.psyop = 10 - blackBuildingBoard.ew_points;
    this.remainingIW.black.ew = blackBuildingBoard.ew_points;

    var black_pieces = blackBuildingBoard.pieces;
    var white_pieces = whiteBuildingBoard.pieces;

    this.max_points = 10;
    this.pieces = {};
    var piece, pos_key;
    for (pos_key in white_pieces) {
      if (white_pieces.hasOwnProperty(pos_key)) {
        this.pieces[pos_key] = white_pieces[pos_key];
      }
    }
    for (pos_key in black_pieces) {
      if (black_pieces.hasOwnProperty(pos_key)) {
        this.pieces[pos_key] = black_pieces[pos_key];
      }
    }
  } else {
    this.pieces = arguments[0];
  }
  this.initCastlingState();

  this.last_move = null;
}

PlayingBoard.prototype.getPieces = function() {
  return this.pieces;
};

PlayingBoard.prototype.getViewPieces = function(colour) {
  if (colour !== 'black' && colour !== 'white' && colour !== 'observer') {
    throw new InvalidMessageError("Invalid value for color: "+colour);
  }

  var viewPieces = {};
  for (var pos_key in this.pieces) {
    if (this.pieces.hasOwnProperty(pos_key)) {
      var piece = this.pieces[pos_key];
      if (colour === 'observer' || piece.colour === colour) {
        viewPieces[pos_key] = piece;
      } else if (piece.invisible === false) {
        viewPieces[pos_key] = piece;
      }
    }
  }
  return viewPieces;
};

PlayingBoard.prototype.initCastlingState = function() {
  /*
   * Keep track of rooks/king moving. Castling can only happen when the
   * king and corresponding rook have never moved. If the rook or king is not
   * added at its standard position, castling can never occur.
   *
   * True here indicates that the piece has moved, and is ineligible for
   * castling. We start off with this start, and enable it once the pieces
   * are placed at the appropriate starting positions.
   */
  this.castlingState = {
    'white': {
      'king': true,
      'queenside_rook': true,
      'kingside_rook': true
    },
    'black': {
      'king': true,
      'queenside_rook': true,
      'kingside_rook': true
    },
    'observer': {
      'king': true,
      'queenside_rook': false,
      'kingside_rook': false
    }
  };

  if (this.pieces) {
    if (this.pieces["0,0"] && this.pieces["0,0"].type === 'rook') {
      this.castlingState.white.queenside_rook = false;
    }
    if (this.pieces["0,7"] && this.pieces["0,7"].type === 'rook') {
      this.castlingState.black.queenside_rook = false;
    }
    if (this.pieces["7,0"] && this.pieces["7,0"].type === 'rook') {
      this.castlingState.white.kingside_rook = false;
    }
    if (this.pieces["7,7"] && this.pieces["7,7"].type === 'rook') {
      this.castlingState.black.kingside_rook = false;
    }
    if (this.pieces["4,0"] && this.pieces["4,0"].type === 'king') {
      this.castlingState.white.king = false;
    }
    if (this.pieces["4,7"] && this.pieces["4,7"].type === 'king') {
      this.castlingState.black.king = false;
    }
  }
};

PlayingBoard.prototype.getCurrentPsyOpAttackCost = function() {
  return this.currentPsyOpAttackCost;
};
PlayingBoard.prototype.getCurrentPsyOpDefendCost = function() {
  return this.currentPsyOpDefendCost;
};
PlayingBoard.prototype.getCurrentEWAttackCost = function() {
  return this.currentEWAttackCost;
};
PlayingBoard.prototype.getCurrentEWDefendCost = function() {
  return this.currentEWDefendCost;
};
PlayingBoard.prototype.getFeintCost = function() {
  return this.feintCost;
};

PlayingBoard.prototype.getRemainingIW = function(colour) {
  if (colour !== 'black' && colour !== 'white' && colour !== 'observer') {
    throw new InvalidMessageError("Invalid value for colour");
  }
  return this.remainingIW[colour];
};

PlayingBoard.prototype.getLastMove = function(colour) {
  if (colour !== 'black' && colour !== 'white' && colour !== 'observer') {
    throw new InvalidMessageError("Invalid value for colour");
  }

  if (!this.last_move) {
    return null;
  }

  var move = {
    type: this.last_move.type,
    moving_piece: this.last_move.src_piece,
    captured_piece: this.last_move.captured_piece,
    src: this.last_move.src,
    dest: this.last_move.dest
  };

  if (colour !== 'observer' && (!move.moving_piece || (move.moving_piece.invisible && move.moving_piece.colour !== colour))) {
    delete move.moving_piece;
    delete move.src;
    delete move.dest;
  }

  return move;
};

PlayingBoard.prototype.validatePosition = function(position) {
  return position.x >= 0 && position.x <= 7 &&
    position.y >= 0 && position.y <=7;
};

PlayingBoard.prototype.findTheKing = function(role) {
  var pieces = this.getPieces();
  for (var pos_key in pieces) {
    if (pieces.hasOwnProperty(pos_key) &&
        (pieces[pos_key].type === 'king') &&
        (pieces[pos_key].colour === role)) {
      return {
        piece: pieces[pos_key],
        position: keyToPosition(pos_key)
      };
    }
  }
};

PlayingBoard.prototype.getPawnCaptures = function(role) {
  var me = this;
  var captures = []; // array of moves: [ { src: Position, dest: Position } ]
  var pieces = this.getPieces();
  console.log(role);
  console.log("Wat");
  console.log(pieces);

  var piece, position;

  for (var pos_key in pieces) {
    if (pieces.hasOwnProperty(pos_key)) {
      piece = pieces[pos_key];
      position = keyToPosition(pos_key);

      console.log("Piece:");
      console.log(piece);
      console.log(position);

      if (piece.type === 'pawn' && piece.colour === role) {
        console.log("fnerP");
        var direction = piece.colour === 'white' ? 1 : -1;

        var addIfOccupied = function(target_pos) {
          if (!me.validatePosition(target_pos)) {
            return false;
          }

          var target = pieces[target_pos.asKey()];
          if (target && target.invisible && target.colour !== piece.colour) {
            var move = {
              src: position,
              dest: target_pos
            }
            console.log("Created move.");
            console.log(move);
            captures.push(move);
            return true;
          }
          return false;
        };

        var left = new Position(position.x-1, position.y+(1*direction));
        var right = new Position(position.x+1, position.y+(1*direction));
        console.log(left);
        console.log(right);
        addIfOccupied(left);
        addIfOccupied(right);
      }
    }
  }

  // En Passant captures
  if (this.last_move && this.last_move.moving_piece) {
    var piece = this.last_move.moving_piece;
    var src = this.last_move.src;
    var dest = this.last_move.dest;
    var y_mod = piece.colour === 'white' ? 1 : -1;
    if (this.isLastMoveEnPassant() && piece.colour !== role) {

      var addIfOccupied = function(target_pos) {
        if (!me.validatePosition(target_pos)) {
          return false;
        }
        var target = pieces[target_pos.asKey()];
        if (target && target.colour !== piece.colour) {
          var move = {
            src: target_pos,
            dest: new Position(dest.x, dest.y + (-1 * y_mod))
          };
          console.log("Created En Passant capture move");
          console.log(move);
          captures.push(move);
        }
      };

      var left = new Position(dest.x-1, dest.y);
      var right = new Position(dest.x+1, dest.y);
      addIfOccupied(left);
      addIfOccupied(right);
    }
  }

  return captures;
};

// Determines whether the last move is eligible for an en passant capture
// The pawn must have moved from its starting row to two squares in front of it
PlayingBoard.prototype.isLastMoveEnPassant = function() {
  return this.last_move &&
      this.last_move.moving_piece &&
      this.last_move.src &&
      this.last_move.moving_piece.type === 'pawn' &&
      this.last_move.src.y === this.last_move.moving_piece.starting_row &&
      Math.abs(this.last_move.src.y - this.last_move.dest.y) === 2;
};

/*
 * Returns an array of position keys, indicating possible destination squares.
 */
PlayingBoard.prototype.getPossibleMoves = function(piece, position) {
  var me = this;
  var pieces = this.getPieces();
  var moves = [];

  var add = function(position) {
    if (me.validatePosition(position)) {
      moves.push(position.asKey());
      return true;
    }
    return false;
  };

  var addIfOccupied = function(position) {
    var target = pieces[position.asKey()];
    if (target && target.colour !== piece.colour) {
      return add(position);
    }
    return false;
  };

  var addIfUnoccupied = function(position) {
    var target = pieces[position.asKey()];
    if (!target || (target.colour !== piece.colour && target.invisible)) {
      return add(position);
    }
    return false;
  };

  var addUnlessFriendly = function(position) {
    var target = pieces[position.asKey()];
    if (!target || target.colour !== piece.colour) {
      return add(position);
    }
    return false;
  };

  var addUntilObstructed = function(position, next) {
    var thing = next(position);
    while (addUnlessFriendly(thing)) {
      var target = pieces[thing.asKey()];
      if (target && !target.invisible) {
        break;
      }
      thing = next(thing);
    }
  };

  if (piece.type === 'pawn') {
    var direction = piece.colour === 'white' ? 1 : -1;

    var advance_one = new Position(position.x, position.y+(1*direction));
    addIfUnoccupied(advance_one);
    if (position.y === piece.starting_row) {
      if (!pieces[advance_one.asKey()]) { // Can't jump over a piece
        // Pawns can move two from the starting row
        addIfUnoccupied(new Position(position.x, position.y+(2*direction)));
      }
    }
    //Attack vectors!
    addIfOccupied(new Position(position.x+1, position.y+(1*direction)));
    addIfOccupied(new Position(position.x-1, position.y+(1*direction)));
  } else if (piece.type === 'king') {
    var potentials = [
      new Position(position.x-1, position.y+1),
      new Position(position.x  , position.y+1),
      new Position(position.x+1, position.y+1),
      new Position(position.x-1, position.y  ),
      new Position(position.x+1, position.y  ),
      new Position(position.x-1, position.y-1),
      new Position(position.x  , position.y-1),
      new Position(position.x+1, position.y-1)
    ];
    for (var i = 0; i < potentials.length; i++) {
      addUnlessFriendly(potentials[i]);
    }
  } else if (piece.type === 'knight') {
    var potentials = [
      new Position(position.x-2, position.y+1),
      new Position(position.x-1, position.y+2),
      new Position(position.x+1, position.y+2),
      new Position(position.x+2, position.y+1),
      new Position(position.x-2, position.y-1),
      new Position(position.x-1, position.y-2),
      new Position(position.x+1, position.y-2),
      new Position(position.x+2, position.y-1)
    ];
    for (var i = 0; i < potentials.length; i++) {
      addUnlessFriendly(potentials[i]);
    }
  }

  if (piece.type === 'rook' || piece.type === 'queen') {
    addUntilObstructed(position, function(pos) {
      return new Position(pos.x, pos.y+1);
    });
    addUntilObstructed(position, function(pos) {
      return new Position(pos.x+1, pos.y);
    });
    addUntilObstructed(position, function(pos) {
      return new Position(pos.x-1, pos.y);
    });
    addUntilObstructed(position, function(pos) {
      return new Position(pos.x, pos.y-1);
    });
  }
  if (piece.type === 'bishop' || piece.type === 'queen') {
    addUntilObstructed(position, function(pos) {
      return new Position(pos.x-1, pos.y+1);
    });
    addUntilObstructed(position, function(pos) {
      return new Position(pos.x-1, pos.y-1);
    });
    addUntilObstructed(position, function(pos) {
      return new Position(pos.x+1, pos.y+1);
    });
    addUntilObstructed(position, function(pos) {
      return new Position(pos.x+1, pos.y-1);
    });
  }

  return moves;
};

/*
 * Returns an object structured thusly:
 *  {
 *    kingside: {
 *      king: position_key,
 *      rook: position_key
 *    },
 *    queenside: {
 *      king: position_key,
 *      rook: position_key
 *    }
 *  }
 *
 * If either a kingside or queenside move is not possible, those entries
 * will be undefined.
 */
PlayingBoard.prototype.getCastlingMoves = function(piece) {
  var moves = {};
  var pieces = this.getPieces();

  if (piece.type === 'king' || piece.type === 'rook') {
    var king = pieces[new Position(4, piece.starting_row).asKey()];
    if (king && king.colour === piece.colour && king.type === 'king' && !this.castlingState[piece.colour].king) {
      var left_corner = pieces[new Position(0,piece.starting_row).asKey()];
      var right_corner = pieces[new Position(7,piece.starting_row).asKey()];

      var i = 0;
      if (left_corner && left_corner.type === 'rook' && left_corner.colour === piece.colour && !this.castlingState[piece.colour].queenside_rook) {
        if (!pieces[new Position(1, piece.starting_row).asKey()] &&
            !pieces[new Position(2, piece.starting_row).asKey()] &&
            !pieces[new Position(3, piece.starting_row).asKey()]) {
          moves.queenside = {
            king: new Position(2, piece.starting_row).asKey(),
            rook: new Position(3, piece.starting_row).asKey()
          };
        }
      }
      if (right_corner && right_corner.type === 'rook' && right_corner.colour === piece.colour && !this.castlingState[piece.colour].kingside_rook) {
        if (!pieces[new Position(5, piece.starting_row).asKey()] &&
            !pieces[new Position(6, piece.starting_row).asKey()]) {
          moves.kingside = {
            king: new Position(6, piece.starting_row).asKey(),
            rook: new Position(5, piece.starting_row).asKey()
          };
        }
      }
    }
  }
  return moves;
};

PlayingBoard.prototype.validateMove = function(role, piece, src, dest) {
  if (!piece) {
    throw new InvalidMessageError("Piece must be provided.");
  }
  if (src.x === dest.x && src.y === dest.y) {
    throw new InvalidMessageError("Not actually a move! Src and dest are the same!");
  }

  var possibleMoves = this.getPossibleMoves(piece, src);

  var found = _.find(possibleMoves, function(poskey) {
    return poskey === dest.asKey();
  });

  if (!found) {
    var possibleCastlingMoves = this.getCastlingMoves(piece);

    if (possibleCastlingMoves.kingside) {
      if (new Position(7,piece.starting_row).asKey() === dest.asKey() || new Position(4,piece.starting_row) === dest.asKey()) {
        found = true;
      }
    }
    if (!found && possibleCastlingMoves.queenside) {
      if (new Position(0,piece.starting_row).asKey() === dest.asKey() || new Position(4,piece.starting_row) === dest.asKey()) {
        found = true;
      }
    }

    if (!found) {
      throw "Invalid move!";
    }
  }
};

PlayingBoard.prototype.validate_psyop_attack = function(attack) {
  if (!attack.attacker) {
    throw new InvalidMessageError("Given IW attack has no attacker");
  }
  if (!attack.type || attack.type !== 'psyop') {
    throw new InvalidMessageError("Invalid IW attack type: "+attack.type);
  }
  if (attack.strength && (attack.strength !== 'normal' && attack.strength !== 'reinforced' && attack.strength !== 'feint')) {
    throw new InvalidMessageError("Invalid IW parameters. Strength must be valid if given");
  }
};

/*
 * Determine which pieces could be removed by a psyop attack. Returns an array
 * of coordinates. If the attack is a feint, it returns an empty array.
 */
PlayingBoard.prototype.psyop_attack_targets = function(attack) {
  this.validate_psyop_attack(attack);

  if (attack.strength === 'feint') {
    return [];
  }

  var defender = attack.attacker === 'white' ? 'black' : 'white';

  var pawn_distance = -1;
  var piece_distance = -1;
  var pawn_positions = [];
  var piece_positions = [];

  var king_pos = this.findTheKing(defender).position;

  for (var pos_key in this.pieces) {
    if (this.pieces.hasOwnProperty(pos_key) &&
        this.pieces[pos_key].colour === defender) {
      var piece = this.pieces[pos_key];
      var pos = keyToPosition(pos_key);
      var d = king_pos.distanceTo(pos);

      if (piece.type !== 'pawn') {
        if (d > piece_distance) {
          piece_positions = [pos];
          piece_distance = d;
        } else if (d === piece_distance) {
          //Found another piece of same distance
          piece_positions.push(pos);
        }
      } else {
        if (d > pawn_distance) {
          pawn_positions = [pos];
          pawn_distance = d;
        } else if (d === pawn_distance) {
          //Found another pawn of same distance
          pawn_positions.push(pos);
        }
      }

    }
  }

  if (pawn_positions.length > 0) {
    return pawn_positions;
  }
  return piece_positions;
};

PlayingBoard.prototype.psyop_attack = function(attack, chosen_position) {
  this.validate_psyop_attack(attack);

  var result = {};

  if (attack.strength === 'feint') {
    result.type = 'feint';
  } else {
    var defender = attack.attacker === 'white' ? 'black' : 'white';

    var farthest_pawn;
    var farthest_piece;
    var targets = this.psyop_attack_targets(attack);

    var position;
    if (chosen_position) {
      var found = _.find(targets, function(target) {
        return target.x === chosen_position.x && target.y === chosen_position.y;
      });
      if (!found) {
        throw "Invalid chosen_position given!";
      }

      position = new Position(chosen_position.x, chosen_position.y);
    } else if (targets.length > 1) {
      throw "Chosen_position must be specified when multiple targets are available!";
    } else {
      position = new Position(targets[0].x, targets[0].y);
    }

    var farthest = this.pieces[position.asKey()];

    delete this.pieces[position.asKey()];

    result = {
      type: 'capture',
      captured_piece: farthest,
      captured_position: position
    };
  }
  return result;
};

PlayingBoard.prototype.cyclePsyopCosts = function() {
  this.currentPsyOpAttackCost = this.currentPsyOpAttackCost % 2 + 1;
  this.currentPsyOpDefendCost = this.currentPsyOpDefendCost % 2 + 1;
};

PlayingBoard.prototype.cycleEWCosts = function() {
  this.currentEWAttackCost = this.currentEWAttackCost % 2 + 1;
  this.currentEWDefendCost = this.currentEWDefendCost % 2 + 1;
};

PlayingBoard.prototype.pawn_upgrade = function(colour, new_type) {
  var pawn_pos;
  var last_row = colour === 'white' ? 7 : 0;
  for (var pos_key in this.pieces) {
    if (this.pieces.hasOwnProperty(pos_key)) {
      var pos = keyToPosition(pos_key);
      if (this.pieces[pos_key].type === 'pawn' && pos.y === last_row) {
        pawn_pos = pos;
        break;
      }
    }
  }
  delete this.pieces[pawn_pos.asKey()];
  var piece = new Piece(new_type, colour);
  piece.invisible = false; // They're appearing in the last row. Can't be invis
  this.pieces[pawn_pos.asKey()] = piece;
  return {
    result: 'pawn_upgrade',
    pos_key: pawn_pos.asKey(),
    new_type: new_type
  };
};

PlayingBoard.prototype.move = function(role, src, dest, state) {
  var moving_piece = this.pieces[src.asKey()];

  this.validateMove(role, moving_piece, src, dest);

  var result = {
    type: "move",
    moving_piece: moving_piece,
    src: src,
    dest: dest
  };

  // Calculates the change in x or y direction to walk us towards the dest
  var direction_modifier = function(src_val, dest_val) {
    var diff = src_val - dest_val;
    if (diff === 0) {
      return diff;
    }
    return diff < 0 ? 1 : -1;
  }

  var target;
  if (moving_piece.type !== "knight") {
    // Knights teleport. Let's walk.

    var x_mod = direction_modifier(src.x, dest.x);
    var y_mod = direction_modifier(src.y, dest.y);

    var walk = function(x, y) {
      return new Position(x+x_mod, y+y_mod);
    }
    var square = src;
    do {
      square = walk(square.x, square.y);
      if (this.pieces[square.asKey()]) {
        target = this.pieces[square.asKey()];
        dest = square;
        break;
      }
    } while (square.x !== dest.x || square.y !== dest.y)
  } else {
    target = this.pieces[dest.asKey()];
  }

  var en_passant_dest = null;
  if (moving_piece.type === 'pawn' && !target && state === 'pawn-capture') {
    // En Passant capture is likely happening
    if (!this.isLastMoveEnPassant()) {
      throw new InvalidMessageError("Invalid move for a pawn-capture. Not a valid target, and last move was not eligible for en passant.");
    }
    var y_mod = moving_piece.colour === 'white' ? 1 : -1;

    target_pos = new Position(dest.x, dest.y + (-1 * y_mod));
    target = this.pieces[target_pos.asKey()];
    if (!target) {
      throw new InvalidMessageError("Invalid move for en passant pawn capture. There's no pawn at that location");
    }
    en_passant_dest = dest;
    dest = target_pos;
  }

  console.log("Target:");
  console.log(target);
  if (target) {
    if (moving_piece.type === 'pawn' && target.invisible && state !== 'pawn-capture') {
      var y_mod = moving_piece.colour === 'white' ? 1 : -1;
      result.type = "pawnbump";
      if (src.y === moving_piece.starting_row && dest.y === moving_piece.starting_row + (2 * y_mod)) {
        //moving pawn-bump - there's a piece at the far end of the pawn's double move
        //the pawn should still move forward one square, and the movement phase should end
        //but it's still considered a pawnbump
        this.pieces[new Position(src.x, src.y + (1 * y_mod)).asKey()] = moving_piece;
        delete this.pieces[src.asKey()];
      }
    } else if (target.colour === role) {
      // Castling!
      var king, king_pos;
      var rook, rook_pos;

      if (target.type === 'king') {
        king = target;
        king_pos = dest;
      } else if (target.type === 'rook') {
        rook = target;
        rook_pos = dest;
      }

      if (moving_piece.type === 'king') {
        king = moving_piece;
        king_pos = src;
      } else if (moving_piece.type === 'rook') {
        rook = moving_piece;
        rook_pos = src;
      }

      if (!king || !rook || !king_pos || !rook_pos) {
        throw new InvalidMessageError("Invalid move for role: " + role + ", src: " + src.asKey() + ", dest: " + dest.asKey());
      }
      if (king_pos.x !== 4 && king_pos.y !== king.starting_row) {
        throw new InvalidMessageError("Invalid position for king for performing a castling move");
      }
      if (rook_pos.y !== rook.starting_row && (rook_pos.x !== 0 || rook_pos.x !== 7)) {
        throw new InvalidMessageError("Invalid position for rook for performing a castling move");
      }
      result.type = "castling";

      var x_mod = direction_modifier(src.x, dest.x);

      delete this.pieces[king_pos.asKey()];
      delete this.pieces[rook_pos.asKey()];

      // King moves two squares towards the rook
      this.pieces[new Position(king_pos.x + (2*x_mod), king_pos.y).asKey()] = king;

      // Rook teleports to the first square that the king moved onto.
      this.pieces[new Position(king_pos.x + (1*x_mod), king_pos.y).asKey()] = rook;

    } else {
      result.captured_piece = this.pieces[dest.asKey()];
      result.type = "capture";
      moving_piece.invisible = false;
      delete this.pieces[dest.asKey()];
    }
  }

  if (result.type !== "pawnbump" && result.type !== "castling") {
    if (en_passant_dest) {
      // En passant moves do not move the src to the square where the target
      // was captured.
      dest = en_passant_dest;
    }
    this.pieces[dest.asKey()] = moving_piece;
    delete this.pieces[src.asKey()];
  }

  if (moving_piece && moving_piece.type === 'pawn' && result.type !== "pawnbump"
      && Math.abs(moving_piece.starting_row - 7) === src.y) {
    //Pawn has moved into the last row. Pawn upgrade!
    result.pawn_upgrade = true;
  }

  // Back rows make opposing pieces visible
  if (((moving_piece.colour === 'white' && dest.y >= 5) || (moving_piece.colour === 'black' && dest.y <= 2))
      && result.type !== "pawnbump") {
    moving_piece.invisible = false;
  }

  if (moving_piece.type === 'king') {
    this.castlingState[moving_piece.colour].king = true;
  } else if (moving_piece.type === 'rook') {
    if (src.asKey() === new Position(0, moving_piece.starting_row).asKey()) {
      this.castlingState[moving_piece.colour].queenside_rook = true;
    } else if (src.asKey() === new Position(7, moving_piece.starting_row).asKey()) {
      this.castlingState[moving_piece.colour].kingside_rook = true;
    }
  }

  this.last_move = result;

  return result;
};

return {
  PlayingBoard: PlayingBoard
};
});

