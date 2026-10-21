// PassoPasso — sito: header che cambia allo scroll e iscrizione alla lista d'attesa.
(function () {
  "use strict";

  var testata = document.querySelector(".testata");
  if (testata) {
    var aggiorna = function () {
      testata.classList.toggle("scrollata", window.scrollY > 8);
    };
    window.addEventListener("scroll", aggiorna, { passive: true });
    aggiorna();
  }

  var config = window.PASSO_CONFIG || {};
  var apiUrl = String(config.API_URL || "").replace(/\/+$/, "");

  document.querySelectorAll("form[data-lista-attesa]").forEach(function (form) {
    var esito = form.querySelector(".esito");
    var bottone = form.querySelector("button[type=submit]");

    function mostra(messaggio, tipo) {
      esito.textContent = messaggio;
      esito.className = "esito " + tipo;
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var email = form.elements.email.value.trim();
      var consenso = form.elements.consenso.checked;
      var trappola = form.elements.sito ? form.elements.sito.value : "";

      if (!email || !form.elements.email.checkValidity()) {
        mostra("Controlla l'indirizzo email.", "errore");
        form.elements.email.focus();
        return;
      }
      if (!consenso) {
        mostra("Per iscriverti serve il consenso all'informativa privacy.", "errore");
        form.elements.consenso.focus();
        return;
      }
      if (!apiUrl) {
        mostra("Le iscrizioni apriranno a breve. Torna a trovarci!", "errore");
        return;
      }

      bottone.disabled = true;
      mostra("Un attimo…", "");
      fetch(apiUrl + "/v1/lista-attesa", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email, consenso: true, sito: trappola, origine: form.dataset.origine || "sito" }),
      })
        .then(function (r) {
          if (!r.ok) throw new Error(String(r.status));
          form.reset();
          mostra("Fatto! Ti scriveremo quando PassoPasso sarà pronta. Niente spam, promesso.", "ok");
        })
        .catch(function () {
          mostra("Non è andata a buon fine. Riprova tra poco.", "errore");
        })
        .finally(function () {
          bottone.disabled = false;
        });
    });
  });

  var anno = document.getElementById("anno");
  if (anno) anno.textContent = String(new Date().getFullYear());
})();
