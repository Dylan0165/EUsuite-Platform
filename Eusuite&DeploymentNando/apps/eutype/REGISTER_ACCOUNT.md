# Test Account Aanmaken

## Optie 1: Via Browser Console (Eenvoudigste)

1. Open de browser (waar localhost:5174 draait)
2. Open Developer Tools (F12)
3. Ga naar de **Console** tab
4. Plak deze code en druk Enter:

```javascript
fetch('http://192.168.124.50:30500/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'dylan',
    email: 'dylan@eutype.com',
    password: 'Wachtwoord123!'
  })
})
.then(r => r.json())
.then(data => {
  console.log('✓ Account aangemaakt!', data)
  alert('Account aangemaakt! Je kunt nu inloggen met:\nUsername: dylan\nPassword: Wachtwoord123!')
})
.catch(err => console.error('Fout:', err))
```

5. Refresh de pagina en log in met:
   - **Username**: `dylan`
   - **Password**: `Wachtwoord123!`

## Optie 2: Via de UI

1. Klik op **"Registreer hier"** onder het login formulier
2. Vul in:
   - Gebruikersnaam: `dylan`
   - E-mail: `dylan@eutype.com`
   - Wachtwoord: `Wachtwoord123!`
   - Bevestig wachtwoord: `Wachtwoord123!`
3. Klik op **"Registreren"**
4. Je wordt automatisch ingelogd en doorgestuurd naar je documenten

## Optie 3: Via Node.js Script

```bash
cd scripts
node create-test-user.js
```

## Test Accounts

Na registratie kun je inloggen met:

**Account 1:**
- Username: `dylan`
- Password: `Wachtwoord123!`

**Account 2 (alternatief):**
- Username: `test`  
- Password: `test123`

## Troubleshooting

### "422 Unprocessable Entity"
- De gebruikersnaam bestaat al, probeer een andere naam
- Of: vul alle verplichte velden in (username, email, password)

### "Network Error"
- Controleer of de backend draait op http://192.168.124.50:30500
- Test: `curl http://192.168.124.50:30500/api/health`

### "401 Unauthorized" bij login
- Verkeerd wachtwoord
- Gebruiker bestaat niet - registreer eerst een account
