

Questa app trasforma il tuo controller Xbox in un dispositivo MIDI per Logic Pro.

### Come Creare l'App (Senza account sviluppatore)

Ho configurato il progetto per non richiedere firme digitali Apple (che sono a pagamento).
cd desktop/controllermidibridge
1. **Pulisci e Reinstalla:**
   Apri il terminale nella cartella del progetto e incolla questo comando:
   ```bash
   rm -rf node_modules package-lock.json dist release && npm install && npm run dist
   ```

2. **Trova l'App:**
   Vai nella cartella `release` che si è creata nel progetto. Troverai il file `.dmg`.

3. **IMPORTANTE: Come aprirla la prima volta**
   Poiché non abbiamo pagato Apple per un certificato sviluppatore, il Mac bloccherà l'app dicendo "Sviluppatore non identificato".
   
   **La soluzione è semplice:**
   1. Trascina l'app dal DMG alla cartella **Applicazioni**.
   2. Vai in Applicazioni.
   3. Fai **Click Destro** (o Control+Click) sull'icona di XboxMidiBridge.
   4. Clicca **Apri** nel menu a tendina.
   5. Clicca **Apri** nel messaggio di avviso.
   
   *Devi farlo solo la prima volta.*

### Note
Se non hai un'icona `icon.icns`, l'app avrà l'icona di default, ma funzionerà lo stesso.