import { Resend } from 'resend';
import type { AlertCondition } from '../actions/actions-alerts';

const resend = new Resend(process.env.RESEND_API_KEY);

type TriggeredCondition = {
  condition: AlertCondition;
  fieldValue: any;
};

export type AlertEmailData = {
  kpiName: string;
  kpiDescription?: string | null;
  deviceName: string;
  deviceLocation?: string | null;
  triggeredConditions: TriggeredCondition[];
  kpiValue: any; // This is the 'value' column from the kpis table
}

export type TodolistOverdueEmailData = {
  todolistId: string;
  deviceName: string;
  deviceLocation?: string | null;
  scheduledExecution: string;
  email: string;
  tasks: Array<{
    id: string;
    kpi_id: string;
    status: string;
    kpi: {
      name: string;
      description: string | null;
    };
  }>;
}

function getFieldName(fieldId: string, kpiValue: any): string {
  if (kpiValue && Array.isArray(kpiValue)) {
    // First, try to find by a specific 'id' property in the field definition
    const fieldById = kpiValue.find(f => f.id === fieldId);
    if (fieldById && fieldById.name) {
      return fieldById.name;
    }

    // If not found, try to parse from a generated ID like 'kpiId-fieldname'
    const nameFromId = fieldId.substring(fieldId.lastIndexOf('-') + 1);
    const fieldByName = kpiValue.find(f => String(f.name).toLowerCase() === nameFromId.toLowerCase());
    if (fieldByName && fieldByName.name) {
      return fieldByName.name;
    }
  }
  // Fallback to a cleaned-up version of the id
  return fieldId.substring(fieldId.lastIndexOf('-') + 1);
}

function formatTriggeredCondition(triggered: TriggeredCondition, kpiValue: any): string {
  const { condition, fieldValue } = triggered;
  const fieldName = getFieldName(condition.field_id, kpiValue);

  switch (condition.type) {
    case 'text':
      return `<strong>${fieldName} (Testo)</strong>: "${String(fieldValue)}" ⚠️`;
    case 'number':
      let range = '';
      if (condition.min !== undefined && condition.max !== undefined) {
        range = `fuori dal range ${condition.min} - ${condition.max}`;
      } else if (condition.min !== undefined) {
        range = `sotto il minimo di ${condition.min}`;
      } else if (condition.max !== undefined) {
        range = `sopra il massimo di ${condition.max}`;
      }
      return `<strong>${fieldName} (Numero)</strong>: ${fieldValue} ⚠️ ${range}`;
    case 'boolean':
      return `<strong>${fieldName} (Sì/No)</strong>: ${fieldValue ? 'sì' : 'no'} ⚠️`;
    default:
      return `<strong>${fieldName}</strong>: ${String(fieldValue)}`;
  }
}

export async function sendAlertEmail(to: string, data: AlertEmailData) {
  const { kpiName, deviceName, triggeredConditions, kpiValue } = data;
  const subject = `⚠️ Alert SICET: ${kpiName} su ${deviceName}`;

  const conditionsHtml = triggeredConditions
    .map(tc => `<p style="margin: 4px 0;">${formatTriggeredCondition(tc, kpiValue)}</p>`)
    .join('');

  const html = `
    <html>
      <body style="font-family: sans-serif; padding: 20px; color: #333;">
        <div style="max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 8px; padding: 20px;">
          <h1 style="color: #d9534f; font-size: 24px;">⚠️ Alert SICET</h1>
          <p><strong>Nome Controllo:</strong> ${kpiName}</p>
          <p><strong>Punto di Controllo:</strong> ${deviceName}</p>
          <h3 style="margin-top: 20px; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px;">Dettagli Valori fuori Specifica:</h3>
          ${conditionsHtml}
          <br>
          <p style="font-size: 12px; color: #777;">Questo è un messaggio automatico, per favore non rispondere.</p>
        </div>
      </body>
    </html>
  `;

  try {
    const response = await resend.emails.send({
      from: 'Sicet <alerts@sicetenergia.it>',
      to,
      subject,
      html,
    });
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
}

export async function sendTodolistOverdueEmail(data: TodolistOverdueEmailData): Promise<void> {
  const { todolistId, deviceName, deviceLocation, scheduledExecution, email, tasks } = data;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('it-IT', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const pendingTasks = tasks.filter(task => task.status !== 'completed');
  const completedTasks = tasks.filter(task => task.status === 'completed');

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #dc2626;">⚠️ Todolist Scaduta</h2>
      
      <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #dc2626;">Dettagli della Todolist</h3>
        <p><strong>ID Todolist:</strong> ${todolistId}</p>
        <p><strong>Punto di Controllo:</strong> ${deviceName}</p>
        ${deviceLocation ? `<p><strong>Posizione:</strong> ${deviceLocation}</p>` : ''}
        <p><strong>Data Programmata:</strong> ${formatDate(scheduledExecution)}</p>
        <p><strong>Stato:</strong> <span style="color: #dc2626; font-weight: bold;">SCADUTA</span></p>
      </div>

      <div style="background-color: #fef3c7; border: 1px solid #fde68a; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #d97706;">Controlli Pendenti (${pendingTasks.length})</h3>
        ${pendingTasks.length > 0 ? `
          <ul style="list-style-type: none; padding: 0;">
            ${pendingTasks.map(task => `
              <li style="margin: 10px 0; padding: 10px; background-color: #fef2f2; border-radius: 4px;">
                <strong>${task.kpi.name}</strong>
                ${task.kpi.description ? `<br><small style="color: #6b7280;">${task.kpi.description}</small>` : ''}
                <br><span style="color: #dc2626; font-size: 12px;">Status: ${task.status}</span>
              </li>
            `).join('')}
          </ul>
        ` : '<p style="color: #059669;">Nessun controllo pendente</p>'}
      </div>

      ${completedTasks.length > 0 ? `
        <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #059669;">Controlli Completati (${completedTasks.length})</h3>
          <ul style="list-style-type: none; padding: 0;">
            ${completedTasks.map(task => `
              <li style="margin: 10px 0; padding: 10px; background-color: #f0fdf4; border-radius: 4px;">
                <strong>${task.kpi.name}</strong>
                ${task.kpi.description ? `<br><small style="color: #6b7280;">${task.kpi.description}</small>` : ''}
                <br><span style="color: #059669; font-size: 12px;">Status: ${task.status}</span>
              </li>
            `).join('')}
          </ul>
        </div>
      ` : ''}

      <div style="background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #0369a1;">Azioni Richieste</h3>
        <p>Per favore completa i controlli pendenti il prima possibile per evitare ulteriori ritardi.</p>
        <p>Puoi accedere al sistema per aggiornare lo stato dei controlli.</p>
      </div>

      <p style="color: #6b7280; font-size: 14px;">
        Questa notifica è stata inviata automaticamente dal sistema di gestione todolist.
      </p>
    </div>
  `;

  try {    
    await resend.emails.send({
      from: 'SICET Alerts <alerts@sicetenergia.it>',
      to: [email],
      subject: `⚠️ Todolist Scaduta: ${deviceName}`,
      html: htmlContent,
    });
    
  } catch (error) {
    console.error('Error sending todolist overdue email:', error);
    throw error;
  }
} 