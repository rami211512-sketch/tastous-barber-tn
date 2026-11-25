// Importiamo Firebase e Firestore direttamente dai server Google
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    query, 
    where, 
    getDocs 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// La tua configurazione di Tastous Barber
const firebaseConfig = {
  apiKey: "AIzaSyAcsL5vXVJGaVaKIa0VbuJdq2lODf2CwoA",
  authDomain: "tastous-barber.firebaseapp.com",
  projectId: "tastous-barber",
  storageBucket: "tastous-barber.firebasestorage.app",
  messagingSenderId: "738096648338",
  appId: "1:738096648338:web:d4a181a876dcb53c1b564b",
  measurementId: "G-2BYT8T1BNF"
};

// Inizializziamo Firebase e il database Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const prenotazioniRef = collection(db, "prenotazioni");

// ELENCO DEGLI ORARI DI TASTOUS BARBER (09:00-13:00 e 15:00-20:00)
const orariDisponibili = [
    "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30",
    "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00", "19:30"
];

// Recuperiamo gli elementi dalla pagina HTML
const inputData = document.getElementById("data");
const containerOrari = document.getElementById("orari-container");
const inputOrarioSelezionato = document.getElementById("orario-selezionato");
const formPrenotazione = document.getElementById("booking-form");
const messaggioConferma = document.getElementById("messaggio-conferma");

// Impediamo di selezionare date passate
const oggi = new Date().toISOString().split("T")[0];
inputData.setAttribute("min", oggi);

// QUANDO L'UTENTE SCEGLIE UNA DATA, LEGGIAMO GLI ORARI DA FIREBASE
inputData.addEventListener("change", function() {
    const dataScelta = inputData.value;
    inputOrarioSelezionato.value = "";
    mostraOrariPerData(dataScelta);
});

async function mostraOrariPerData(dataScelta) {
    containerOrari.innerHTML = "";

    if (!dataScelta) {
        containerOrari.innerHTML = '<p class="info-text">Seleziona prima una data per vedere gli orari.</p>';
        return;
    }

    // Controllo chiusura domenica (0 = Domenica)
    const giornoSettimana = new Date(dataScelta).getDay();
    if (giornoSettimana === 0) {
        containerOrari.innerHTML = '<p class="info-text">Chiuso la domenica. Scegli un altro giorno.</p>';
        return;
    }

    containerOrari.innerHTML = '<p class="info-text">Controllo disponibilità...</p>';

    try {
        // Chiediamo a Firestore tutte le prenotazioni per la data scelta
        const q = query(prenotazioniRef, where("data", "==", dataScelta));
        const querySnapshot = await getDocs(q);
        
        const orariOccupati = [];
        querySnapshot.forEach((doc) => {
            orariOccupati.push(doc.data().orario);
        });

        // Puliamo il messaggio di caricamento e creiamo i pulsanti
        containerOrari.innerHTML = "";

        orariDisponibili.forEach(orario => {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.classList.add("slot-btn");
            btn.textContent = orario;

            if (orariOccupati.includes(orario)) {
                btn.disabled = true;
                btn.title = "Orario già prenotato";
            } else {
                btn.addEventListener("click", function() {
                    document.querySelectorAll(".slot-btn").forEach(b => b.classList.remove("selected"));
                    btn.classList.add("selected");
                    inputOrarioSelezionato.value = orario;
                });
            }

            containerOrari.appendChild(btn);
        });

    } catch (errore) {
        console.error("Errore nel recupero orari:", errore);
        containerOrari.innerHTML = '<p class="info-text" style="color:#ff5555;">Errore di connessione al database. Verifica che Firestore sia attivo.</p>';
    }
}

// QUANDO L'UTENTE CONFERMA LA PRENOTAZIONE, SALVIAMO SU FIREBASE
formPrenotazione.addEventListener("submit", async function(event) {
    event.preventDefault();

    const nome = document.getElementById("nome").value.trim();
    const telefono = document.getElementById("telefono").value.trim();
    const servizio = document.getElementById("servizio").value;
    const data = inputData.value;
    const orario = inputOrarioSelezionato.value;

    if (!orario) {
        messaggioConferma.style.color = "#ff5555";
        messaggioConferma.textContent = "Per favore, seleziona un orario disponibile!";
        return;
    }

    const btnSubmit = formPrenotazione.querySelector("button[type='submit']");
    btnSubmit.disabled = true;
    btnSubmit.textContent = "Salvataggio in corso...";

    try {
        // Salviamo il nuovo appuntamento nella raccolta "prenotazioni" su Firestore
        await addDoc(prenotazioniRef, {
            nome: nome,
            telefono: telefono,
            servizio: servizio,
            data: data,
            orario: orario,
            creatoIl: new Date().toISOString()
        });

        messaggioConferma.style.color = "#4cd964";
        messaggioConferma.textContent = `Prenotazione confermata per il ${data} alle ${orario}!`;

        inputOrarioSelezionato.value = "";
        await mostraOrariPerData(data);

        document.getElementById("nome").value = "";
        document.getElementById("telefono").value = "";

    } catch (errore) {
        console.error("Errore nel salvataggio:", errore);
        messaggioConferma.style.color = "#ff5555";
        messaggioConferma.textContent = "Errore durante la prenotazione. Riprova.";
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.textContent = "Conferma Prenotazione";
    }
});