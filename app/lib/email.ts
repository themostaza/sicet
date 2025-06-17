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

export async function sendAlertEmail(email: string, data: AlertEmailData) {
  const { kpiName, kpiDescription, deviceName, deviceLocation, triggeredValue, conditions } = data;

  console.log('Sending KPI alert email to:', email);
  console.log('Email data:', { kpiName, deviceName, triggeredValue });
  console.log('Conditions:', conditions);

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

  console.log('Formatted conditions:', formattedConditions);
  console.log('Formatted value:', formattedValue);

  // Create a simpler HTML email to avoid potential issues
  const simpleHtml = `
    <div>
      <h2>⚠️ Alert SICET</h2>
      <p><strong>Nome:</strong> ${kpiName}</p>
      <p><strong>Punto di Controllo:</strong> ${deviceName}</p>
      <p><strong>Valore Rilevato:</strong> ${formattedValue}</p>
      <p><strong>Condizioni:</strong></p>
      <pre>${formattedConditions}</pre>
    </div>
  `;

  try {
    console.log('Attempting to send email via Resend...');
    console.log('Email payload:', {
      from: 'SICET Alerts <onboarding@resend.dev>',
      to: [email],
      subject: `[SICET Alert] ${kpiName} - ${deviceName}`,
      htmlLength: simpleHtml.length
    });

    const { data: emailData, error } = await resend.emails.send({
      from: 'SICET Alerts <onboarding@resend.dev>',
      to: [email],
      subject: `[SICET Alert] ${kpiName} - ${deviceName}`,
      html: simpleHtml,
    });

    if (error) {
      console.error('Resend API error:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      throw error;
    }

    console.log('KPI alert email sent successfully:', emailData);
    return emailData;
  } catch (error) {
    console.error('Failed to send KPI alert email:', error);
    console.error('Error type:', typeof error);
    console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
    console.error('Full error object:', JSON.stringify(error, null, 2));
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
    console.log('Sending todolist overdue email to:', email);
    console.log('Email data:', { todolistId, deviceName, scheduledExecution });
    
    const result = await resend.emails.send({
      from: 'SICET Alerts <onboarding@resend.dev>',
      to: [email],
      subject: `⚠️ Todolist Scaduta: ${deviceName}`,
      html: htmlContent,
    });
    
    console.log('Email sent successfully:', result);
  } catch (error) {
    console.error('Error sending todolist overdue email:', error);
    throw error;
  }
} 