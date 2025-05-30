import { Resend } from 'resend';

const resend = new Resend('re_Bdmu5oBt_8Wd5LKQDP95Dco7952yV87AT');

export type AlertEmailData = {
  kpiName: string;
  kpiDescription?: string | null;
  deviceName: string;
  deviceLocation?: string | null;
  triggeredValue: any;
  conditions: Array<{
    type: 'numeric' | 'text' | 'boolean';
    min?: number;
    max?: number;
    match_text?: string;
    boolean_value?: boolean;
  }>;
}

export async function sendAlertEmail(email: string, data: AlertEmailData) {
  const { kpiName, kpiDescription, deviceName, deviceLocation, triggeredValue, conditions } = data;

  // Format conditions for email
  const formattedConditions = conditions.map(condition => {
    if (condition.type === 'numeric') {
      const parts = [];
      if (condition.min !== undefined) parts.push(`min: ${condition.min}`);
      if (condition.max !== undefined) parts.push(`max: ${condition.max}`);
      return `Valore numerico: ${parts.join(', ')}`;
    }
    if (condition.type === 'text') {
      return `Testo: deve contenere "${condition.match_text}"`;
    }
    if (condition.type === 'boolean') {
      return `Booleano: deve essere ${condition.boolean_value ? 'vero' : 'falso'}`;
    }
    return '';
  }).join('\n');

  // Format the triggered value
  const formattedValue = typeof triggeredValue === 'object' 
    ? JSON.stringify(triggeredValue, null, 2)
    : String(triggeredValue);

  try {
    const { data: emailData, error } = await resend.emails.send({
      from: 'SICET Alerts <onboarding@resend.dev>',
      to: email,
      subject: `[SICET Alert] ${kpiName} - ${deviceName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc2626;">⚠️ Alert SICET</h2>
          
          <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <h3 style="margin-top: 0;">Dettagli del Controllo</h3>
            <p><strong>Nome:</strong> ${kpiName}</p>
            ${kpiDescription ? `<p><strong>Descrizione:</strong> ${kpiDescription}</p>` : ''}
            <p><strong>Punto di Controllo:</strong> ${deviceName}</p>
            ${deviceLocation ? `<p><strong>Ubicazione:</strong> ${deviceLocation}</p>` : ''}
          </div>

          <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <h3 style="margin-top: 0;">Condizioni dell'Alert</h3>
            <pre style="white-space: pre-wrap; background-color: #fff; padding: 8px; border-radius: 4px;">${formattedConditions}</pre>
          </div>

          <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <h3 style="margin-top: 0;">Valore Rilevato</h3>
            <pre style="white-space: pre-wrap; background-color: #fff; padding: 8px; border-radius: 4px;">${formattedValue}</pre>
          </div>

          <div style="color: #6b7280; font-size: 14px; margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
            <p>Questo è un messaggio automatico generato dal sistema SICET.</p>
            <p>Non rispondere a questa email.</p>
          </div>
        </div>
      `,
    });

    if (error) {
      console.error('Error sending email:', error);
      throw error;
    }

    return emailData;
  } catch (error) {
    console.error('Failed to send email:', error);
    throw error;
  }
} 