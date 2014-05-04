define([], function() {

getText = function(data) {

  var obj =
    {psyop : {
      normal: {
        ignored: {
          attacker: {
            line1:'Psyop Attack Not Defended', line2:"Captured Opponent's Piece!", outcome:'win'
          },
          defender: {
            line1:'Psyop Attack Not Defended', line2:'Piece Captured by Opponent', outcome:'lose'
          }
        },
        defended: {
          attacker: {
            line1:'Psyop Attack Defended', line2:'No Effect', outcome:'lose'
          },
          defender: {
            line1:'Psyop Attack', line2:'Defended!', outcome: 'win'
          }
        }
      },
      reinforced: {
        ignored: {
          attacker: {
            line1:'Reinforced Psyop Attack Not Defended', line2:"Captured Opponent's Piece!", outcome:'win'
          },
          defender: {
            line1:'Psyop Attack Not Defended', line2:'Piece Captured by Opponent', outcome:'lose'
          }
        },
        defended: {
          attacker: {
            line1:'Reinforced Psyop Attack Defended', line2:"Captured Opponent's Piece!", outcome:'win'
          },
          defender: {
            line1:'Psyop Defense Failed', line2:'Piece Captured by Opponent', outcome:'lose'
          }
        }
      },
      feint: {
        ignored: {
          attacker: {
            line1:'Psyop Feint Attack Not Defended', line2:'No Effect!', outcome: 'lose'
          },
          defender: {
            line1:'Psyop Attack Not Defended', line2:'No Effect!', outcome: 'win'
          }
        },
        defended: {
          attacker: {
            line1:'Psyop Feint Attack Defended', line2:'No Effect!', outcome: 'win'
          },
          defender: {
            line1:'Psyop Attack', line2:'Defended!', outcome: 'win'
          }
        }
      }
    },
    ew : {
      normal: {
        ignored: {
          attacker: {
            line1:'E-Warfare Attack Not Defended', line2:'Opponent Immobilized!', outcome:'win'
          },
          defender: {
            line1:'E-Warfare Attack Not Defended', line2:'Pieces Immobilized by Opponent', outcome:'lose'
          }
        },
        defended: {
          attacker: {
            line1:'E-Warfare Attack Defended', line2:'No Effect', outcome:'lose'
          },
          defender: {
            line1:'E-Warfare Attack', line2:'Defended!', outcome: 'win'
          }
        }
      },
      reinforced: {
        ignored: {
          attacker: {
            line1:'Reinforced E-Warfare Attack Not Defended', line2:'Opponent Immobilized!', outcome: 'win'
          },
          defender: {
            line1:'E-Warfare Attack Not Defended', line2:'Pieces Immobilized by Opponent', outcome: 'lose'
          }
        },
        defended: {
          attacker: {
            line1:'Reinforced E-Warfare Attack Defended', line2:'Opponent Immobilized!', outcome: 'win'
          },
          defender: {
            line1:'E-Warfare Defense Failed', line2:'Pieces Immobilized by Opponent', outcome: 'lose'
          }
        }
      },
      feint: {
        ignored: {
          attacker: {
            line1:'E-Warfare Feint Attack Not Defended', line2:'No Effect!', outcome:'lose'
          },
          defender: {
            line1:'E-Warfare Attack Not Defended', line2:'No Effect!', outcome: 'win'
          }
        },
        defended: {
          attacker: {
            line1:'E-Warfare Feint Attack Defended', line2:'No Effect!', outcome: 'win'
          },
          defender: {
            line1:'E-Warfare Attack', line2:'Defended!', outcome: 'win'
          }
        }
      }
    }
  };

  var lines = obj[data.type][data.strength][data.outcome][data.viewer];
  return lines;
}

return {
  getText: getText,
  };

});
