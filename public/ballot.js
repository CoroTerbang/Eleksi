(function () {
  var section = document.querySelector('.ballot');
  if (!section) return;
  var quota = Number(section.dataset.quota) || 1;
  var boxes = Array.prototype.slice.call(document.querySelectorAll('.candidate-check'));
  var form = document.getElementById('ballotForm');
  var submit = form ? form.querySelector('button[type="submit"]') : null;

  function checkedCount() {
    return boxes.filter(function (b) { return b.checked; }).length;
  }

  function refresh() {
    var count = checkedCount();
    boxes.forEach(function (b) {
      if (b.checked) return;
      b.disabled = count >= quota;
    });
    if (submit) submit.disabled = count !== quota;
  }

  boxes.forEach(function (b) {
    b.addEventListener('change', function () {
      if (quota === 1 && b.checked) {
        boxes.forEach(function (other) {
          if (other !== b) other.checked = false;
        });
      }
      refresh();
    });
  });

  if (form) {
    form.addEventListener('submit', function (e) {
      if (checkedCount() !== quota) {
        e.preventDefault();
        alert('Pilih tepat ' + quota + ' calon.');
      }
    });
  }

  refresh();
})();
