# Form Validation System

Questo documento descrive il sistema di validazione dei form utilizzato nell'applicazione.

## Componenti principali

### 1. Libreria di validazione (`lib/validation.ts`)

Contiene le regole di validazione comuni e le funzioni di utilità per validare i campi e i form.

\`\`\`typescript
// Esempio di utilizzo
import { validationRules } from '@/lib/validation';

const validationSchema = {
  nome: [validationRules.required("Il nome è obbligatorio")],
  email: [
    validationRules.required("L'email è obbligatoria"),
    validationRules.email("Formato email non valido")
  ],
  password: [
    validationRules.required("La password è obbligatoria"),
    validationRules.minLength(8, "La password deve contenere almeno 8 caratteri")
  ]
};
\`\`\`

### 2. Hook di validazione (`hooks/use-form-validation.ts`)

Un hook personalizzato che gestisce lo stato del form, la validazione e gli eventi.

\`\`\`typescript
// Esempio di utilizzo
const {
  formState,
  handleChange,
  handleBlur,
  handleSubmit,
  resetForm,
  setFieldValue
} = useFormValidation({
  initialValues: {
    nome: "",
    email: "",
    password: ""
  },
  validationSchema: {
    nome: [validationRules.required("Il nome è obbligatorio")],
    email: [
      validationRules.required("L'email è obbligatoria"),
      validationRules.email("Formato email non valido")
    ],
    password: [
      validationRules.required("La password è obbligatoria"),
      validationRules.minLength(8, "La password deve contenere almeno 8 caratteri")
    ]
  },
  onSubmit: async (values) => {
    // Gestisci l'invio del form
  }
});
\`\`\`

### 3. Componenti UI per i form

- `FormField`: Un componente che gestisce diversi tipi di campi di input con validazione integrata
- `FormContainer`: Un contenitore per i form con gestione delle azioni standard
- `FieldError`: Un componente per visualizzare gli errori di validazione

## Regole di validazione disponibili

- `required`: Verifica che il campo non sia vuoto
- `minLength`: Verifica che la lunghezza del testo sia almeno il valore specificato
- `maxLength`: Verifica che la lunghezza del testo non superi il valore specificato
- `pattern`: Verifica che il testo corrisponda a un pattern regex
- `email`: Verifica che il testo sia un'email valida
- `numeric`: Verifica che il valore sia un numero
- `custom`: Permette di definire una funzione di validazione personalizzata

## Linee guida per l'implementazione

1. **Coerenza visiva**: Tutti i form devono utilizzare gli stessi componenti e stili per gli errori
2. **Feedback immediato**: Gli errori devono essere mostrati quando l'utente interagisce con il campo
3. **Accessibilità**: Utilizzare attributi ARIA appropriati per gli errori
4. **Validazione lato client e server**: Implementare la validazione sia lato client che lato server

## Esempio completo di implementazione

\`\`\`tsx
import { useFormValidation } from '@/hooks/use-form-validation';
import { validationRules } from '@/lib/validation';
import { FormContainer } from '@/components/form/form-container';
import { FormField } from '@/components/form/form-field';

export default function ExampleForm() {
  const {
    formState,
    handleChange,
    handleBlur,
    handleSubmit,
    isSubmitting
  } = useFormValidation({
    initialValues: {
      nome: "",
      email: "",
      messaggio: ""
    },
    validationSchema: {
      nome: [validationRules.required("Il nome è obbligatorio")],
      email: [
        validationRules.required("L'email è obbligatoria"),
        validationRules.email("Formato email non valido")
      ]
    },
    onSubmit: async (values) => {
      // Invia i dati al server
    }
  });

  return (
    <FormContainer 
      onSubmit={handleSubmit} 
      isSubmitting={isSubmitting}
      submitLabel="Invia"
      submittingLabel="Invio in corso..."
    >
      <FormField
        id="nome"
        name="nome"
        label="Nome"
        value={formState.values.nome}
        onChange={(value) => handleChange("nome", value)}
        onBlur={() => handleBlur("nome")}
        error={formState.touched.nome ? formState.errors.nome : null}
        required
      />

      <FormField
        id="email"
        name="email"
        label="Email"
        type="email"
        value={formState.values.email}
        onChange={(value) => handleChange("email", value)}
        onBlur={() => handleBlur("email")}
        error={formState.touched.email ? formState.errors.email : null}
        required
      />

      <FormField
        id="messaggio"
        name="messaggio"
        label="Messaggio"
        type="textarea"
        value={formState.values.messaggio}
        onChange={(value) => handleChange("messaggio", value)}
        onBlur={() => handleBlur("messaggio")}
      />
    </FormContainer>
  );
}
