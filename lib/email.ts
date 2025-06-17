import { Resend } from 'resend';

const resend = new Resend('re_Bdmu5oBt_8Wd5LKQDP95Dco7952yV87AT');

export type AlertEmailData = {
  kpiName: string;
  kpiDescription?: string | null;
  deviceName: string;
  deviceLocation?: string | null;
  triggeredValue: any;
  email: string;
  conditions: Array<{
    type: 'numeric' | 'text' | 'boolean';
    min?: number;
    max?: number;
    match_text?: string;
    boolean_value?: boolean;
  }>;
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

export async function sendAlertEmail(data: AlertEmailData): Promise<void> {
  const { kpiName, kpiDescription, deviceName, deviceLocation, triggeredValue, conditions } = data;

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #dc2626;">🚨 Alert Attivato</h2>
      
      <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #dc2626;">Dettagli del Controllo</h3>
        <p><strong>Controllo:</strong> ${kpiName}</p>
        ${kpiDescription ? `<p><strong>Descrizione:</strong> ${kpiDescription}</p>` : ''}
        <p><strong>Punto di Controllo:</strong> ${deviceName}</p>
        ${deviceLocation ? `<p><strong>Posizione:</strong> ${deviceLocation}</p>` : ''}
        <p><strong>Valore Rilevato:</strong> ${JSON.stringify(triggeredValue)}</p>
      </div>

      <div style="background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #0369a1;">Condizioni di Alert</h3>
        <ul style="list-style-type: none; padding: 0;">
          ${conditions.map(condition => {
            let conditionText = '';
            if (condition.type === 'numeric') {
              if (condition.min !== undefined && condition.max !== undefined) {
                conditionText = `Valore tra ${condition.min} e ${condition.max}`;
              } else if (condition.min !== undefined) {
                conditionText = `Valore maggiore di ${condition.min}`;
              } else if (condition.max !== undefined) {
                conditionText = `Valore minore di ${condition.max}`;
              }
            } else if (condition.type === 'text') {
              conditionText = `Testo contiene: "${condition.match_text}"`;
            } else if (condition.type === 'boolean') {
              conditionText = `Valore: ${condition.boolean_value ? 'Vero' : 'Falso'}`;
            }
            return `<li style="margin: 5px 0;">• ${conditionText}</li>`;
          }).join('')}
        </ul>
      </div>

      <p style="color: #6b7280; font-size: 14px;">
        Questo alert è stato generato automaticamente dal sistema di monitoraggio.
      </p>
    </div>
  `;

  try {
    await resend.emails.send({
      from: 'SICET Alerts <onboarding@resend.dev>',
      to: [data.email],
      subject: `🚨 Alert: ${kpiName} - ${deviceName}`,
      html: htmlContent,
    });
  } catch (error) {
    console.error('Error sending alert email:', error);
    throw error;
  }
}

export async function sendTodolistOverdueEmail(data: TodolistOverdueEmailData): Promise<void> {
  const { todolistId, deviceName, deviceLocation, scheduledExecution, email, tasks } = data;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('it-IT', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
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
      from: 'SICET Alerts <onboarding@resend.dev>',
      to: [email],
      subject: `⚠️ Todolist Scaduta: ${deviceName}`,
      html: htmlContent,
    });
  } catch (error) {
    console.error('Error sending todolist overdue email:', error);
    throw error;
  }
} 