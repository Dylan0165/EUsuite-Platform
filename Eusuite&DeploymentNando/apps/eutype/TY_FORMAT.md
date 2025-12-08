# EUTYPE Document Format (.ty)

## Overzicht
`.ty` is het native bestandsformaat voor EUTYPE tekstverwerker. Het is een JSON-gebaseerd formaat dat alle documentinhoud en metadata opslaat.

## Structuur

```json
{
  "version": "1.0",
  "type": "EUTYPE Document",
  "created": "2025-11-14T10:30:00.000Z",
  "modified": "2025-11-14T12:45:00.000Z",
  "html": "<p>Document content...</p>",
  "text": "Document content..."
}
```

## Velden

- **version**: Format versie (huidige: 1.0)
- **type**: Altijd "EUTYPE Document"
- **created**: ISO timestamp van creatie
- **modified**: ISO timestamp van laatste wijziging
- **html**: Volledige HTML content met opmaak
- **text**: Plain text versie van document

## Compatibiliteit

EUTYPE kan ook deze formaten importeren/exporteren:
- `.txt` - Plain text
- `.html` - HTML documenten
- `.rtf` - Rich Text Format (toekomstig)
- `.pdf` - Export only
- `.docx` - Import/Export (toekomstig)

## Voordelen .ty formaat

✅ Behoudt alle opmaak (vet, cursief, kleuren, etc.)
✅ Ondersteunt tabellen, afbeeldingen, links
✅ Metadata voor versiegeschiedenis
✅ Menselijk leesbaar (JSON)
✅ Klein bestandsformaat
✅ Snel laden en opslaan

## Toekomstige uitbreidingen

Versie 2.0 zal ondersteunen:
- Embedded afbeeldingen (base64)
- Commentaar en track changes
- Meerdere auteurs metadata
- Encrypted documenten
