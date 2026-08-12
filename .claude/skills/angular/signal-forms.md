# Signal Forms (stable since Angular 22)

The signal-native forms API: type-safe, schema-driven, no
`ControlValueAccessor`, no `FormBuilder`. Default choice for new forms.

## The shape

```ts
import { Component, signal, inject } from '@angular/core';
import { form, FormField, required, email, minLength, validate,
         disabled, submit } from '@angular/forms/signals';

@Component({
  selector: 'app-signup',
  imports: [FormField],
  templateUrl: './signup.html',
})
export class SignupComponent {
  private readonly api = inject(AuthApi);

  // 1. The model is a plain signal of a plain object — it IS the state.
  readonly model = signal({
    email: '',
    password: '',
    confirm: '',
    plan: 'free' as 'free' | 'pro',
    company: '',
  });

  // 2. The schema attaches validation to typed field paths.
  readonly signupForm = form(this.model, (f) => {
    required(f.email, { message: 'Email is required' });
    email(f.email, { message: 'Enter a valid email' });
    required(f.password, { message: 'Password is required' });
    minLength(f.password, 8, { message: 'At least 8 characters' });

    // cross-field validation lives in the schema, not the component
    validate(f.confirm, ({ valueOf, value }) =>
      value() === valueOf(f.password)
        ? undefined
        : { kind: 'mismatch', message: 'Passwords do not match' });

    // conditional logic reads other fields reactively
    required(f.company, {
      when: ({ valueOf }) => valueOf(f.plan) === 'pro',
      message: 'Company is required on the Pro plan',
    });
    disabled(f.company, ({ valueOf }) => valueOf(f.plan) === 'free');
  });

  async onSubmit(event: Event) {
    event.preventDefault();
    // submit(): marks touched, runs pending validators, maps server errors to fields
    await submit(this.signupForm, async (frm) => {
      const result = await this.api.signup(this.model());
      return result.ok ? undefined : result.fieldErrors;   // server errors → fields
    });
  }
}
```

```html
<form (submit)="onSubmit($event)">
  <label for="email">Email</label>
  <input id="email" type="email" [formField]="signupForm.email" />
  @if (signupForm.email().touched() && signupForm.email().invalid()) {
    <p role="alert">{{ signupForm.email().errors()[0]?.message }}</p>
  }

  <label for="plan">Plan</label>
  <select id="plan" [formField]="signupForm.plan">
    <option value="free">Free</option>
    <option value="pro">Pro</option>
  </select>

  @if (!signupForm.company().hidden()) {
    <label for="company">Company</label>
    <input id="company" [formField]="signupForm.company" />
  }

  <button [disabled]="signupForm().submitting()">
    {{ signupForm().submitting() ? 'Creating…' : 'Create account' }}
  </button>
</form>
```

## Working rules

- **The model signal is the single source of truth** — read values from it,
  patch it with `.update()`, and the form reflects it (and vice versa). No
  `getRawValue()`/`patchValue()` split-brain:

```ts
prefillFromInvite(invite: Invite) {
  this.model.update(m => ({ ...m, email: invite.email, plan: invite.plan }));
}
```

- Field state is granular signals — bind directly, no `markAsTouched`
  ceremony: `f.email().value()`, `.invalid()`, `.touched()`, `.dirty()`,
  `.errors()`, `.disabled()`, `.hidden()`.
- Async validation integrates with resources:

```ts
validateAsync(f.email, {
  params: ({ value }) => value(),
  factory: (email) => httpResource(() => `/api/email-taken?e=${email()}`),
  onError: () => ({ kind: 'taken', message: 'This email is already registered' }),
});
```

- Show errors on `touched() && invalid()` (not while typing the first
  character); error text near the field with `role="alert"` (frontend/a11y
  skill applies).
- Dynamic arrays: model as an array in the signal; iterate `@for` over the
  form's array field — each element gets its own field node.

## When NOT to use Signal Forms

- Repo on Angular < 20 (unavailable/experimental) or heavily invested in
  `ReactiveFormsModule` — don't mix paradigms in one feature; migrate
  form-by-form.
- Third-party controls that only ship a `ControlValueAccessor` — wrap or
  wait, don't fork the form model.
