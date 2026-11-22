(function () {
  var SCROLL_KEY = 'eleksi-admin-scroll';

  var saved = sessionStorage.getItem(SCROLL_KEY);
  if (saved !== null) {
    sessionStorage.removeItem(SCROLL_KEY);
    window.addEventListener('load', function () { window.scrollTo(0, Number(saved) || 0); });
  }
  document.addEventListener('submit', function () {
    sessionStorage.setItem(SCROLL_KEY, String(window.scrollY));
  });

  function setText(id, value) {
    var el = document.getElementById(id);
    if (el) el.textContent = String(value);
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function updateResults(results) {
    var body = document.getElementById('results-body');
    if (!body) return;
    var total = results.reduce(function (sum, r) { return sum + r.votes; }, 0);
    body.innerHTML = results.map(function (r) {
      var pct = total ? Math.round(r.votes / total * 100) : 0;
      return '<tr><td>' + r.number + '</td><td>' + escapeHtml(r.name) + '</td><td>' + r.votes +
        '</td><td><div class="bar"><span style="width:' + pct + '%"></span></div>' + pct + '%</td></tr>';
    }).join('');
    setText('results-total', total);
  }

  function refresh() {
    fetch('/admin/live', { credentials: 'same-origin', cache: 'no-store' })
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (data) {
        if (!data) return;
        setText('stat-total', data.stats.totalVoters);
        setText('stat-voted', data.stats.voted);
        setText('stat-candidates', data.candidates);
        setText('stat-status', data.status === 'open' ? 'Dibuka' : 'Ditutup');
        updateResults(data.results);
      })
      .catch(function () {});
  }

  if (document.getElementById('results-body')) {
    setInterval(refresh, 3000);
  }
})();
