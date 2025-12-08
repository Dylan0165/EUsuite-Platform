import { FC } from 'react';

const PrivacyPage: FC = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="bg-gray-50 py-16 border-b border-gray-100">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold text-gray-900">Privacybeleid</h1>
          <p className="mt-2 text-gray-600">Laatst bijgewerkt: januari 2025</p>
        </div>
      </section>

      {/* Content */}
      <section className="py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto prose prose-lg">
            <h2>1. Inleiding</h2>
            <p>
              EUSuite B.V. ("wij", "ons", "onze") respecteert uw privacy en is toegewijd aan het beschermen 
              van uw persoonlijke gegevens. Dit privacybeleid informeert u over hoe wij omgaan met uw 
              persoonlijke gegevens wanneer u onze website bezoekt en onze diensten gebruikt.
            </p>

            <h2>2. Welke Gegevens Verzamelen Wij?</h2>
            <p>Wij kunnen de volgende categorieën persoonsgegevens verzamelen:</p>
            <ul>
              <li><strong>Identiteitsgegevens:</strong> naam, gebruikersnaam</li>
              <li><strong>Contactgegevens:</strong> emailadres, telefoonnummer, adres</li>
              <li><strong>Accountgegevens:</strong> inloggegevens, voorkeuren</li>
              <li><strong>Technische gegevens:</strong> IP-adres, browsertype, tijdzone</li>
              <li><strong>Gebruiksgegevens:</strong> informatie over hoe u onze diensten gebruikt</li>
              <li><strong>Betalingsgegevens:</strong> factuuradres, betalingsdetails</li>
            </ul>

            <h2>3. Hoe Gebruiken Wij Uw Gegevens?</h2>
            <p>Wij gebruiken uw gegevens voor de volgende doeleinden:</p>
            <ul>
              <li>Het leveren en verbeteren van onze diensten</li>
              <li>Het aanmaken en beheren van uw account</li>
              <li>Het verwerken van betalingen</li>
              <li>Het versturen van belangrijke mededelingen</li>
              <li>Het bieden van klantenondersteuning</li>
              <li>Het naleven van wettelijke verplichtingen</li>
            </ul>

            <h2>4. Rechtsgrond voor Verwerking</h2>
            <p>Wij verwerken uw persoonsgegevens op basis van:</p>
            <ul>
              <li>Uitvoering van een overeenkomst met u</li>
              <li>Uw toestemming</li>
              <li>Onze gerechtvaardigde belangen</li>
              <li>Wettelijke verplichtingen</li>
            </ul>

            <h2>5. Gegevensopslag</h2>
            <p>
              Al uw gegevens worden opgeslagen in datacenters binnen de Europese Unie. Wij maken gebruik 
              van gecertificeerde hostingproviders die voldoen aan de hoogste beveiligingsstandaarden.
            </p>
            <p>
              Wij bewaren uw gegevens niet langer dan noodzakelijk voor de doeleinden waarvoor ze zijn 
              verzameld, tenzij wettelijk anders vereist.
            </p>

            <h2>6. Gegevensbeveiliging</h2>
            <p>
              Wij hebben passende beveiligingsmaatregelen getroffen om te voorkomen dat uw persoonsgegevens 
              per ongeluk verloren gaan, worden gebruikt of ongeautoriseerd worden benaderd. Deze maatregelen 
              omvatten:
            </p>
            <ul>
              <li>End-to-end encryptie voor data in transit</li>
              <li>Encryptie at rest voor opgeslagen gegevens</li>
              <li>Regelmatige beveiligingsaudits</li>
              <li>Toegangscontroles en authenticatie</li>
              <li>Regelmatige backups</li>
            </ul>

            <h2>7. Uw Rechten</h2>
            <p>Onder de AVG heeft u de volgende rechten:</p>
            <ul>
              <li><strong>Recht op inzage:</strong> U kunt opvragen welke gegevens wij van u hebben.</li>
              <li><strong>Recht op rectificatie:</strong> U kunt onjuiste gegevens laten corrigeren.</li>
              <li><strong>Recht op verwijdering:</strong> U kunt verzoeken uw gegevens te verwijderen.</li>
              <li><strong>Recht op beperking:</strong> U kunt de verwerking van uw gegevens beperken.</li>
              <li><strong>Recht op overdraagbaarheid:</strong> U kunt uw gegevens in een gestructureerd formaat ontvangen.</li>
              <li><strong>Recht op bezwaar:</strong> U kunt bezwaar maken tegen bepaalde verwerkingen.</li>
            </ul>
            <p>
              Om uw rechten uit te oefenen, kunt u contact met ons opnemen via privacy@eusuite.eu.
            </p>

            <h2>8. Cookies</h2>
            <p>
              Onze website maakt gebruik van cookies om de gebruikerservaring te verbeteren. Voor meer 
              informatie over ons cookiebeleid, zie onze <a href="/cookies">Cookie Policy</a>.
            </p>

            <h2>9. Delen van Gegevens</h2>
            <p>
              Wij delen uw gegevens niet met derden, behalve wanneer:
            </p>
            <ul>
              <li>Dit noodzakelijk is voor het leveren van onze diensten</li>
              <li>U hier toestemming voor heeft gegeven</li>
              <li>Wij wettelijk verplicht zijn dit te doen</li>
            </ul>
            <p>
              Wij verkopen uw persoonsgegevens nooit aan derden.
            </p>

            <h2>10. Wijzigingen</h2>
            <p>
              Wij kunnen dit privacybeleid van tijd tot tijd bijwerken. Wij zullen u op de hoogte stellen 
              van belangrijke wijzigingen via email of een melding op onze website.
            </p>

            <h2>11. Contact</h2>
            <p>
              Voor vragen over dit privacybeleid of onze gegevensverwerkingspraktijken kunt u contact 
              met ons opnemen:
            </p>
            <p>
              EUSuite B.V.<br />
              Functionaris Gegevensbescherming<br />
              Herengracht 123<br />
              1015 BZ Amsterdam<br />
              Nederland<br />
              Email: privacy@eusuite.eu
            </p>

            <h2>12. Toezichthouder</h2>
            <p>
              Als u niet tevreden bent met hoe wij uw persoonsgegevens verwerken, heeft u het recht om 
              een klacht in te dienen bij de Autoriteit Persoonsgegevens (www.autoriteitpersoonsgegevens.nl).
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default PrivacyPage;
