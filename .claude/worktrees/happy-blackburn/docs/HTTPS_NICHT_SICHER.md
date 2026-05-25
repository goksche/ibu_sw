# "Nicht sicher" bei finalstage.ch beheben

## Ursache

Die Meldung erscheint, wenn Sie **http://** finalstage.ch aufrufen (ohne **s**). HTTP ist unverschlüsselt – der Browser warnt deshalb mit „Nicht sicher“.

## Lösung

**Seite immer mit HTTPS aufrufen:**

- **https://finalstage.ch**
- **https://www.finalstage.ch**

So wird die Verbindung verschlüsselt und der Browser zeigt ein Schloss.

## Wenn Sie schon auf der Seite sind

1. In die Adresszeile klicken.
2. Vor der Adresse `http://` durch `https://` ersetzen (oder einfach `https://finalstage.ch` eintippen).
3. Enter drücken.

Sie können die sichere Adresse als Lesezeichen speichern, damit Sie künftig direkt über HTTPS landen.

## Technischer Stand auf dem Server

- Let’s-Encrypt-Zertifikat für finalstage.ch ist vorhanden und gültig (z. B. bis April 2026).
- Nginx leitet HTTP (Port 80) mit einem 301-Redirect auf HTTPS (Port 443) um.
- Ein Aufruf von **http://** wird also zum sicheren **https://** weitergeleitet – verwenden Sie dennoch am besten von vornherein **https://**.
