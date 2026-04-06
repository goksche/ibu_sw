import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings


def _send_email(to_email: str, subject: str, html_body: str) -> bool:
    if not settings.SMTP_HOST:
        print(f"SMTP not configured – cannot send email to {to_email}")
        return False

    try:
        smtp_from = settings.SMTP_FROM or settings.SMTP_USERNAME or "noreply@localhost"
        msg = MIMEMultipart("alternative")
        msg["From"] = smtp_from
        msg["To"] = to_email
        msg["Subject"] = subject
        msg.attach(MIMEText(html_body, "html"))

        server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10)
        if settings.SMTP_USE_TLS:
            server.starttls()
        if settings.SMTP_USERNAME and settings.SMTP_PASSWORD:
            server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
        server.sendmail(smtp_from, [to_email], msg.as_string())
        server.quit()
        return True
    except Exception as e:
        print(f"Failed to send email to {to_email}: {e}")
        return False


def send_registration_otp(email: str, otp_code: str, first_name: str) -> bool:
    subject = "FinalStage.ch – Dein Registrierungscode"
    html = f"""
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <h2 style="color:#1a1a2e">Hallo {first_name},</h2>
      <p>Dein Bestätigungscode für die Registrierung bei <b>FinalStage.ch</b>:</p>
      <div style="font-size:32px;letter-spacing:8px;font-weight:bold;text-align:center;
                  padding:16px;background:#f0f0f5;border-radius:8px;margin:16px 0">
        {otp_code}
      </div>
      <p style="color:#666;font-size:13px">Der Code ist {settings.OTP_EXPIRY_MINUTES} Minuten gültig.</p>
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
      <p style="color:#999;font-size:12px">FinalStage.ch – Turnier-Verwaltung</p>
    </div>
    """
    return _send_email(email, subject, html)


def send_registration_approved(email: str, first_name: str, login_url: str = "https://test.finalstage.ch/login") -> bool:
    subject = "FinalStage.ch – Dein Konto wurde freigeschaltet"
    html = f"""
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <h2 style="color:#1a1a2e">Willkommen bei FinalStage.ch, {first_name}!</h2>
      <p>Dein Registrierungsantrag wurde genehmigt. Du kannst dich ab sofort einloggen:</p>
      <div style="text-align:center;margin:24px 0">
        <a href="{login_url}" style="display:inline-block;padding:12px 32px;
           background:#6366f1;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
          Jetzt einloggen
        </a>
      </div>
      <p style="color:#666;font-size:13px">Nutze deine E-Mail-Adresse ({email}) und fordere einen Login-Code an.</p>
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
      <p style="color:#999;font-size:12px">FinalStage.ch – Turnier-Verwaltung</p>
    </div>
    """
    return _send_email(email, subject, html)


def send_registration_rejected(email: str, first_name: str, reason: str | None = None) -> bool:
    subject = "FinalStage.ch – Registrierung abgelehnt"
    reason_block = f"<p><b>Begründung:</b> {reason}</p>" if reason else ""
    html = f"""
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <h2 style="color:#1a1a2e">Hallo {first_name},</h2>
      <p>Leider wurde dein Registrierungsantrag bei <b>FinalStage.ch</b> abgelehnt.</p>
      {reason_block}
      <p style="color:#666;font-size:13px">Bei Fragen wende dich an den Administrator.</p>
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
      <p style="color:#999;font-size:12px">FinalStage.ch – Turnier-Verwaltung</p>
    </div>
    """
    return _send_email(email, subject, html)


def send_tournament_invitation_existing(email: str, first_name: str, tournament_name: str,
                                        login_url: str = "https://test.finalstage.ch/login") -> bool:
    subject = f"FinalStage.ch – Du wurdest zu «{tournament_name}» eingeladen"
    html = f"""
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <h2 style="color:#1a1a2e">Hallo {first_name},</h2>
      <p>Du wurdest zum Turnier <b>«{tournament_name}»</b> auf FinalStage.ch eingeladen.</p>
      <div style="text-align:center;margin:24px 0">
        <a href="{login_url}" style="display:inline-block;padding:12px 32px;
           background:#6366f1;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
          Turnier ansehen
        </a>
      </div>
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
      <p style="color:#999;font-size:12px">FinalStage.ch – Turnier-Verwaltung</p>
    </div>
    """
    return _send_email(email, subject, html)


def send_tournament_invitation_new(email: str, tournament_name: str,
                                   register_url: str = "https://test.finalstage.ch/register") -> bool:
    subject = f"FinalStage.ch – Einladung zu «{tournament_name}»"
    html = f"""
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <h2 style="color:#1a1a2e">Hallo,</h2>
      <p>Du wurdest zum Turnier <b>«{tournament_name}»</b> auf FinalStage.ch eingeladen.</p>
      <p>Registriere dich jetzt, um das Turnier zu sehen:</p>
      <div style="text-align:center;margin:24px 0">
        <a href="{register_url}" style="display:inline-block;padding:12px 32px;
           background:#6366f1;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
          Jetzt registrieren
        </a>
      </div>
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
      <p style="color:#999;font-size:12px">FinalStage.ch – Turnier-Verwaltung</p>
    </div>
    """
    return _send_email(email, subject, html)


def send_admin_new_registration(admin_email: str, requester_email: str,
                                first_name: str, last_name: str) -> bool:
    """Notify power admin about a new registration request."""
    subject = f"FinalStage.ch – Neue Registrierungsanfrage von {first_name} {last_name}"
    html = f"""
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <h2 style="color:#1a1a2e">Neue Registrierungsanfrage</h2>
      <p><b>{first_name} {last_name}</b> ({requester_email}) möchte sich bei FinalStage.ch registrieren.</p>
      <p>Bitte logge dich ein und genehmige oder lehne die Anfrage ab.</p>
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
      <p style="color:#999;font-size:12px">FinalStage.ch – Turnier-Verwaltung</p>
    </div>
    """
    return _send_email(admin_email, subject, html)
