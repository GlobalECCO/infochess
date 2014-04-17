
function Tutorial() {
  var metadata = [];

  Tutorial.prototype.init = function(data) {
    metadata = data;
  };

  return {
    tutorial: Tutorial,
    metadata: metadata,
  };
}