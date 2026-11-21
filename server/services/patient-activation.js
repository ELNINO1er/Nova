// Activation des comptes patients créés par un médecin.
//
// Le patient contrôle son activation : le code provisoire est toujours généré par le serveur (le médecin
// ne le choisit plus), il est à usage unique, expire après PATIENT_ACTIVATION_HOURS (72 h par défaut)
// et perd toute validité dès que le patient choisit son mot de passe (changeInitialPassword).
//
// Canal de remise, choisi automatiquement :
//   - « sms »   : SMS_PROVIDER=twilio|webhook configuré. Le code part directement sur le téléphone du
//                 patient ; le médecin ne le voit jamais.
//   - « sheet » : aucun fournisseur SMS réel. Le code est affiché une seule fois au médecin, sur une fiche
//                 à remettre en main propre. Risque résiduel : le médecin voit le code (voir docs).
import bcrypt from 'bcrypt';
import { randomBytes } from 'node:crypto';
import { sendSms } from './sms.provider.js';

const DEFAULT_HOURS = 72;
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';

export function activationHours() {
  const value = Number(process.env.PATIENT_ACTIVATION_HOURS);
  return Number.isFinite(value) && value >= 1 && value <= 24 * 14 ? value : DEFAULT_HOURS;
}

export function activationChannel() {
  const provider = String(process.env.SMS_PROVIDER || '').toLowerCase();
  return provider === 'twilio' || provider === 'webhook' ? 'sms' : 'sheet';
}

// 10 caractères lisibles + 2 chiffres : conforme à la règle patient (lettre + chiffre, 8 minimum).
export function generateActivationCode() {
  const body = Array.from(randomBytes(10), (b) => ALPHABET[b % ALPHABET.length]).join('');
  const digits = String(randomBytes(1)[0] % 90 + 10);
  return `${body}${digits}`;
}

export async function prepareActivation(now = Date.now()) {
  const code = generateActivationCode();
  return {
    code,
    hash: await bcrypt.hash(code, 12),
    channel: activationChannel(),
    expiresAt: new Date(now + activationHours() * 3600_000),
  };
}

/**
 * Remet le code au patient. Renvoie ce que le médecin peut voir :
 * jamais le code en mode SMS, le code une seule fois en mode fiche.
 */
export async function deliverActivation({ channel, code, expiresAt, phone }) {
  if (channel === 'sms') {
    try {
      await sendSms(phone, `NOVA : votre compte patient est prêt. Connectez-vous avec votre numéro et le code ${code} (valable jusqu’au ${expiresAt.toLocaleString('fr-FR', { timeZone: 'Africa/Abidjan', dateStyle: 'short', timeStyle: 'short' })}). Vous choisirez ensuite votre mot de passe. Ne communiquez ce code à personne.`);
      return { channel: 'sms', expiresAt: expiresAt.toISOString(), sent: true };
    } catch (error) {
      console.error('[activation] envoi SMS impossible', error.message);
      return { channel: 'sms', expiresAt: expiresAt.toISOString(), sent: false };
    }
  }
  return { channel: 'sheet', expiresAt: expiresAt.toISOString(), code };
}
