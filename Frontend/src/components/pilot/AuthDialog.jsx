import { useEffect, useRef, useState } from 'react';
import { request } from '../../lib/pilotApi.js';
import { authView } from '../../lib/authFlow.js';
import { BackButton, Button, Field, ErrorMessage } from './Controls.jsx';

export default function AuthDialog({ mode, onClose, onSignedIn, onMode, initialError = '', onClearError }) {
  const dialog = useRef(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [createOrganization, setCreateOrganization] = useState(false);
  const [forgot, setForgot] = useState(false);
  const [sent, setSent] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');

  const signup = mode === 'signup';
  const view = authView({ mode, forgot });

  useEffect(() => {
    if (mode) {
      dialog.current?.showModal();
    } else {
      dialog.current?.close();
    }
  }, [mode]);

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    onClearError?.();

    const values = Object.fromEntries(new FormData(e.currentTarget));
    if (signup) values.createOrganization = createOrganization;

    try {
      const data = await request(`/auth/${mode}`, { method: 'POST', body: values });
      e.target.reset();
      onSignedIn(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function sendReset(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const email = new FormData(e.currentTarget).get('email');
      await request('/auth/forgot-password', { method: 'POST', body: { email } });
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const heading = view === 'forgot'
    ? 'Reset your password'
    : signup
      ? 'Set up your account'
      : 'Welcome back';

  const orgModeChoice = (
    <fieldset className="auth-mode">
      <legend className="auth-mode-legend">How are you joining?</legend>
      {[
        [false, 'Join organization', 'Use the private invitation code from your administrator.'],
        [true, 'Create new workspace', 'Set up your business. You will be the administrator.']
      ].map(([value, title, detail]) => (
        <label key={title} className="auth-mode-option">
          <input
            type="radio"
            name="orgMode"
            className="auth-mode-input"
            checked={createOrganization === value}
            disabled={busy}
            onChange={() => setCreateOrganization(value)}
          />
          <span className="auth-mode-mark" aria-hidden="true" />
          <span className="auth-mode-text"><strong>{title}</strong><span>{detail}</span></span>
        </label>
      ))}
    </fieldset>
  );

  const modeSwitch = (
    <button
      type="button"
      className="text-button mt-3 w-full"
      disabled={busy}
      onClick={() => {
        setForgot(false);
        setError('');
        onMode(signup ? 'login' : 'signup');
      }}
    >
      {signup ? 'Already have an account? Log in' : 'New here? Create an account'}
    </button>
  );

  return (
    <dialog
      ref={dialog}
      className="app-dialog pilot auth-screen"
      aria-labelledby="auth-title"
      onCancel={e => { if (busy) e.preventDefault(); else onClose(); }}
    >
      <div className="p-6 text-sm">
        <div className="action-row flex items-center justify-between gap-3">
          <p className="eyebrow" translate="no">STONEDESK</p>
          <button type="button" className="text-button px-3" disabled={busy} onClick={onClose}>Close</button>
        </div>

        {view === 'forgot' && (
          <BackButton
            className="mt-3"
            disabled={busy}
            onClick={() => { setForgot(false); setSent(false); setError(''); }}
            label="Back to log in"
          />
        )}

        <h2 id="auth-title" className="screen-heading mt-3 text-2xl font-semibold">{heading}</h2>

        {view === 'forgot' ? (
          <>
            <p className="auth-intro">Enter your account email. We will send a link that works for 1 hour.</p>
            <form className="space-y-4" onSubmit={sendReset}>
              <Field
                name="email"
                label="Email address"
                type="email"
                defaultValue={forgotEmail}
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                required
                maxLength={254}
              />
              <ErrorMessage error={error} />
              {sent && <p role="status" className="success-message">If that email exists, we sent a link</p>}
              <div className="action-row">
                <Button primary type="submit" className="w-full" disabled={busy} label={busy ? 'Please wait…' : 'Send reset link'} />
              </div>
            </form>
          </>
        ) : (
          <>
            {signup ? orgModeChoice : <p className="auth-intro">Sign in to your business workspace.</p>}

            <form className="space-y-4" onSubmit={submit}>
              <ErrorMessage error={error || initialError} />
              {signup && <Field name="name" label="Your name" autoComplete="name" required maxLength={120} />}
              {signup && (createOrganization ? (
                <>
                  <Field name="businessName" label="Business name" required maxLength={120} autoComplete="organization" />
                  <p className="text-sm text-on-surface-variant">Invite your team from Settings after creating your workspace.</p>
                </>
              ) : (
                <Field
                  name="invitationToken"
                  label="Invitation code"
                  required
                  minLength={43}
                  maxLength={43}
                  pattern="[A-Za-z0-9_-]{43}"
                  autoComplete="off"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                />
              ))}
              <Field
                name="email"
                label="Email address"
                type="email"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                required
                maxLength={254}
              />
              <Field
                name="password"
                label="Password"
                type={showPassword ? 'text' : 'password'}
                autoComplete={signup ? 'new-password' : 'current-password'}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                minLength={12}
                maxLength={128}
                required
              />
              <label className="flex min-h-11 items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  className="h-5 w-5 accent-primary"
                  checked={showPassword}
                  onChange={e => setShowPassword(e.target.checked)}
                />
                Show password
              </label>
              {signup && <p className="text-sm text-on-surface">Use at least 12 characters.</p>}
              {!signup && (
                <button
                  type="button"
                  className="text-button self-start"
                  disabled={busy}
                  onClick={e => {
                    setForgotEmail(e.currentTarget.form?.elements.email?.value || '');
                    setForgot(true);
                    setError('');
                  }}
                >
                  Forgot password?
                </button>
              )}
              <div className="action-row">
                <Button
                  primary
                  type="submit"
                  className="w-full"
                  disabled={busy}
                  label={busy ? 'Please wait…' : signup ? (createOrganization ? 'Create organization' : 'Join organization') : 'Log in'}
                />
              </div>
            </form>
            {modeSwitch}
          </>
        )}
      </div>
    </dialog>
  );
}
