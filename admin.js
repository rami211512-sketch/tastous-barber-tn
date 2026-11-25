import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    query, 
    where, 
    getDocs, 
    deleteDoc, 
    doc 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAcsL5vXVJGaVaKIa0VbuJdq2lODf2CwoA",
  authDomain: "tastous-barber.firebaseapp.com",
  projectId: "tastous-barber",
  storageBucket: "tastous-barber.firebasestorage.app",
  messagingSenderId: "738096648338",
  appId: "1:738096648338:web:d4a181a876dcb53c1b564b",
  measurementId: "G-2BYT8T1BNF"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const prenotazioniRef = collection(db, "prenotazioni");

const PASSWORD_CORRETTA = "tastous2026";

const loginSection = document.getElementById("login-section");
const agendaSection = document.getElementById("agenda-section");
const btnLogin = document.getElementById("btn-login");
const inputPassword = document.getElementById("admin-password");
const loginError = document.getElementById("login-error");

const titoloAgenda = document.getElementById("titolo-agenda");
const btnTuttiProssimi = document.getElementById("btn-tutti-prossimi");
const inputFiltroData = document.getElementById("filtro-data-input");
const listaAppuntamenti = document.getElementById("lista-appuntamenti");

const oggi = new Date().toISOString().split("T")[0];
let modalitaAttuale = "tutti"; // "tutti" oppure "singolo"

// 1. GESTIONE ACCESSO
btnLogin.addEventListener("click", verificaAccesso);
inputPassword.addEventListener("keypress", function(e) {
    if (e.key === "Enter") verificaAccesso();
});

function verificaAccesso() {
    if (inputPassword.value === PASSWORD_CORRETTA) {
        loginSection.style.display = "none";
        agendaSection.style.display = "block";
        caricaTuttiIProssimi();
    } else {
        loginError.textContent = "Password errata. Riprova.";
    }
}

// 2. PULSANTE "TUTTI I PROSSIMI"
btnTuttiProssimi.addEventListener("click", function() {
    modalitaAttuale = "tutti";
    inputFiltroData.value = "";
    btnTuttiProssimi.classList.add("attivo");
    titoloAgenda.textContent = "Prossimi Appuntamenti";
    caricaTuttiIProssimi();
});

// 3. CAMBIO DATA NEL FILTRO SINGOLO
inputFiltroData.addEventListener("change", function() {
    if (!inputFiltroData.value) {
        caricaTuttiIProssimi();
        return;
    }
    modalitaAttuale = "singolo";
    btnTuttiProssimi.classList.remove("attivo");
    titoloAgenda.textContent = "Appuntamenti del Giorno";
    caricaAppuntamentiGiorno(inputFiltroData.value);
});

// Formatta la data "2026-11-25" in "mercoledì 25 novembre 2026"
function formattaDataItaliano(dataISO) {
    const [anno, mese, giorno] = dataISO.split("-");
    const dataObj = new Date(anno, mese - 1, giorno);
    return dataObj.toLocaleDateString("it-IT", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
    });
}

// 4. CARICA TUTTI I PROSSIMI DA OGGI IN POI
async function caricaTuttiIProssimi() {
    listaAppuntamenti.innerHTML = '<p style="color: #888;">Caricamento in corso...</p>';

    try {
        const q = query(prenotazioniRef, where("data", ">=", oggi));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            listaAppuntamenti.innerHTML = '<p style="color: #aaa; text-align: center; padding: 20px;">Nessun appuntamento futuro prenotato.</p>';
            return;
        }

        const appuntamenti = [];
        snapshot.forEach(documento => {
            appuntamenti.push({ id: documento.id, ...documento.data() });
        });

        // Ordina prima per data crescente, poi per orario crescente
        appuntamenti.sort((a, b) => {
            if (a.data !== b.data) return a.data.localeCompare(b.data);
            return a.orario.localeCompare(b.orario);
        });

        listaAppuntamenti.innerHTML = "";
        let dataCorrenteIntestazione = "";

        appuntamenti.forEach(app => {
            // Inserisce un'intestazione ogni volta che cambia il giorno
            if (app.data !== dataCorrenteIntestazione) {
                dataCorrenteIntestazione = app.data;
                const intestazione = document.createElement("h3");
                intestazione.classList.add("data-gruppo-titolo");
                const etichettaOggi = app.data === oggi ? " (OGGI)" : "";
                intestazione.textContent = formattaDataItaliano(app.data) + etichettaOggi;
                listaAppuntamenti.appendChild(intestazione);
            }

            listaAppuntamenti.appendChild(creaCardAppuntamento(app));
        });

    } catch (errore) {
        console.error("Errore nel caricamento:", errore);
        listaAppuntamenti.innerHTML = '<p style="color: #ff5555;">Errore nel caricamento degli appuntamenti.</p>';
    }
}

// 5. CARICA UN SINGOLO GIORNO SCELTO DAL CALENDARIO
async function caricaAppuntamentiGiorno(dataScelta) {
    listaAppuntamenti.innerHTML = '<p style="color: #888;">Caricamento in corso...</p>';

    try {
        const q = query(prenotazioniRef, where("data", "==", dataScelta));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            listaAppuntamenti.innerHTML = '<p style="color: #aaa; text-align: center; padding: 20px;">Nessun appuntamento prenotato per questa data.</p>';
            return;
        }

        const appuntamenti = [];
        snapshot.forEach(documento => {
            appuntamenti.push({ id: documento.id, ...documento.data() });
        });

        appuntamenti.sort((a, b) => a.orario.localeCompare(b.orario));

        listaAppuntamenti.innerHTML = "";
        appuntamenti.forEach(app => {
            listaAppuntamenti.appendChild(creaCardAppuntamento(app));
        });

    } catch (errore) {
        console.error("Errore nel caricamento agenda:", errore);
        listaAppuntamenti.innerHTML = '<p style="color: #ff5555;">Errore nel caricamento degli appuntamenti.</p>';
    }
}

// 6. GENERA LA SCHEDA HTML DI OGNI APPUNTAMENTO
function creaCardAppuntamento(app) {
    const card = document.createElement("div");
    card.classList.add("appuntamento-card");

    card.innerHTML = `
        <div class="app-info">
            <h3>Ore ${app.orario} — ${app.nome}</h3>
            <p><strong>Servizio:</strong> ${app.servizio}</p>
            <p><strong>Telefono:</strong> <a href="tel:${app.telefono}">${app.telefono}</a></p>
        </div>
        <button class="btn-elimina">Cancella</button>
    `;

    const btnElimina = card.querySelector(".btn-elimina");
    btnElimina.addEventListener("click", async function() {
        const conferma = confirm(`Vuoi davvero cancellare l'appuntamento di ${app.nome} del ${app.data} alle ${app.orario}?`);
        if (conferma) {
            await deleteDoc(doc(db, "prenotazioni", app.id));
            if (modalitaAttuale === "tutti") {
                caricaTuttiIProssimi();
            } else {
                caricaAppuntamentiGiorno(inputFiltroData.value);
            }
        }
    });

    return card;
}