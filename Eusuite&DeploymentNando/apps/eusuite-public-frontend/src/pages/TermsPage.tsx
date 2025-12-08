import { FC } from 'react';

const TermsPage: FC = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="bg-gray-50 py-16 border-b border-gray-100">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold text-gray-900">Algemene Voorwaarden</h1>
          <p className="mt-2 text-gray-600">Laatst bijgewerkt: januari 2025</p>
        </div>
      </section>

      {/* Content */}
      <section className="py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto prose prose-lg">
            <h2>1. Definities</h2>
            <p>
              In deze algemene voorwaarden wordt verstaan onder:
            </p>
            <ul>
              <li><strong>EUSuite:</strong> EUSuite B.V., gevestigd te Amsterdam, KvK-nummer [nummer].</li>
              <li><strong>Klant:</strong> de natuurlijke of rechtspersoon die een overeenkomst aangaat met EUSuite.</li>
              <li><strong>Diensten:</strong> de door EUSuite aangeboden software en diensten.</li>
              <li><strong>Abonnement:</strong> het recht om gedurende een bepaalde periode gebruik te maken van de Diensten.</li>
            </ul>

            <h2>2. Toepasselijkheid</h2>
            <p>
              Deze algemene voorwaarden zijn van toepassing op alle aanbiedingen, overeenkomsten en leveringen 
              van EUSuite, tenzij uitdrukkelijk schriftelijk anders is overeengekomen.
            </p>

            <h2>3. Totstandkoming Overeenkomst</h2>
            <p>
              Een overeenkomst komt tot stand op het moment dat de Klant het registratieproces heeft voltooid 
              en EUSuite de aanmelding heeft bevestigd, dan wel wanneer EUSuite feitelijk uitvoering geeft 
              aan de overeenkomst.
            </p>

            <h2>4. Proefperiode</h2>
            <p>
              EUSuite kan een gratis proefperiode aanbieden. Gedurende de proefperiode:
            </p>
            <ul>
              <li>Heeft de Klant toegang tot de Diensten volgens het gekozen plan.</li>
              <li>Is geen betaling verschuldigd.</li>
              <li>Wordt het Abonnement automatisch omgezet naar een betaald Abonnement na afloop, tenzij tijdig opgezegd.</li>
            </ul>

            <h2>5. Prijzen en Betaling</h2>
            <p>
              Alle prijzen zijn exclusief BTW, tenzij anders vermeld. Betaling geschiedt via automatische 
              incasso of de door EUSuite aangeboden betaalmethoden. Bij niet-tijdige betaling is EUSuite 
              gerechtigd de toegang tot de Diensten op te schorten.
            </p>

            <h2>6. Gebruik van de Diensten</h2>
            <p>De Klant verbindt zich ertoe:</p>
            <ul>
              <li>De Diensten alleen te gebruiken voor legitieme doeleinden.</li>
              <li>Geen inbreuk te maken op intellectuele eigendomsrechten.</li>
              <li>Geen illegale, schadelijke of beledigende content te verspreiden.</li>
              <li>De beveiliging van de Diensten niet te ondermijnen.</li>
              <li>De Diensten niet te gebruiken voor spamming of andere ongewenste communicatie.</li>
            </ul>

            <h2>7. Beschikbaarheid</h2>
            <p>
              EUSuite streeft naar een beschikbaarheid van 99,9% op jaarbasis. Gepland onderhoud wordt 
              vooraf aangekondigd. EUSuite is niet aansprakelijk voor onderbrekingen door overmacht 
              of omstandigheden buiten haar controle.
            </p>

            <h2>8. Data en Privacy</h2>
            <p>
              EUSuite verwerkt persoonsgegevens in overeenstemming met de AVG. De Klant blijft eigenaar 
              van alle data die in de Diensten wordt opgeslagen. EUSuite heeft uitsluitend toegang tot 
              Klantdata voor zover noodzakelijk voor het leveren van de Diensten.
            </p>

            <h2>9. Intellectueel Eigendom</h2>
            <p>
              Alle intellectuele eigendomsrechten op de Diensten, inclusief software, documentatie en 
              merken, berusten bij EUSuite. De Klant verkrijgt uitsluitend een beperkt, niet-exclusief 
              gebruiksrecht voor de duur van het Abonnement.
            </p>

            <h2>10. Aansprakelijkheid</h2>
            <p>
              De aansprakelijkheid van EUSuite is beperkt tot directe schade en tot maximaal het bedrag 
              dat de Klant in de voorafgaande 12 maanden aan EUSuite heeft betaald. EUSuite is niet 
              aansprakelijk voor indirecte schade, gevolgschade of gederfde winst.
            </p>

            <h2>11. Duur en Beëindiging</h2>
            <p>
              Het Abonnement wordt aangegaan voor de gekozen periode (maandelijks of jaarlijks) en wordt 
              automatisch verlengd tenzij tijdig opgezegd. Opzegging is mogelijk tot het einde van de 
              lopende facturatieperiode.
            </p>
            <p>
              Bij beëindiging heeft de Klant 30 dagen om zijn data te exporteren, waarna EUSuite 
              gerechtigd is de data te verwijderen.
            </p>

            <h2>12. Wijzigingen</h2>
            <p>
              EUSuite is gerechtigd deze algemene voorwaarden te wijzigen. Wijzigingen worden minimaal 
              30 dagen vooraf aangekondigd. Bij ingrijpende wijzigingen heeft de Klant het recht het 
              Abonnement op te zeggen.
            </p>

            <h2>13. Overmacht</h2>
            <p>
              In geval van overmacht is EUSuite niet gehouden tot het nakomen van enige verplichting. 
              Onder overmacht wordt verstaan: elke omstandigheid buiten de wil van EUSuite die nakoming 
              tijdelijk of blijvend verhindert.
            </p>

            <h2>14. Toepasselijk Recht</h2>
            <p>
              Op deze algemene voorwaarden en alle overeenkomsten is Nederlands recht van toepassing. 
              Geschillen worden voorgelegd aan de bevoegde rechter te Amsterdam.
            </p>

            <h2>15. Contact</h2>
            <p>
              Voor vragen over deze algemene voorwaarden kunt u contact opnemen met:
            </p>
            <p>
              EUSuite B.V.<br />
              Herengracht 123<br />
              1015 BZ Amsterdam<br />
              Nederland<br />
              Email: legal@eusuite.eu
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default TermsPage;
