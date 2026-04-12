import { useEffect, useRef, useState } from 'react';

const GOOGLE_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';
let googleScriptPromise;

function loadGoogleScript() {
  if (window.google?.accounts?.id) return Promise.resolve();

  if (!googleScriptPromise) {
    googleScriptPromise = new Promise((resolve, reject) => {
      const existingScript = document.querySelector(`script[src="${GOOGLE_SCRIPT_SRC}"]`);
      if (existingScript) {
        existingScript.addEventListener('load', () => resolve(), { once: true });
        existingScript.addEventListener('error', () => reject(new Error('Could not load Google sign-in')), { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = GOOGLE_SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Could not load Google sign-in'));
      document.head.appendChild(script);
    });
  }

  return googleScriptPromise;
}

function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

export default function GoogleSignInButton({ text = 'signin_with', onCredential, onError }) {
  const wrapperRef = useRef(null);
  const buttonRef = useRef(null);
  const [buttonWidth, setButtonWidth] = useState(360);
  const [isUnavailable, setIsUnavailable] = useState(false);
  const clientId = import.meta.env?.VITE_GOOGLE_CLIENT_ID || '';

  useEffect(() => {
    if (!wrapperRef.current || typeof ResizeObserver === 'undefined') return undefined;

    const observer = new ResizeObserver(([entry]) => {
      const nextWidth = Math.max(200, Math.min(400, Math.floor(entry.contentRect.width)));
      setButtonWidth(nextWidth);
    });

    observer.observe(wrapperRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let isMounted = true;

    if (!clientId) {
      setIsUnavailable(true);
      return undefined;
    }

    loadGoogleScript()
      .then(() => {
        if (!isMounted || !buttonRef.current || !window.google?.accounts?.id) return;

        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            if (response?.credential) {
              onCredential(response.credential);
              return;
            }

            onError?.('Google did not return a sign-in credential');
          },
        });

        buttonRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: 'outline',
          size: 'large',
          type: 'standard',
          shape: 'rectangular',
          logo_alignment: 'left',
          text,
          width: buttonWidth,
        });
      })
      .catch(() => {
        if (!isMounted) return;
        setIsUnavailable(true);
      });

    return () => {
      isMounted = false;
    };
  }, [buttonWidth, clientId, onCredential, onError, text]);

  if (isUnavailable) {
    return (
      <button
        type="button"
        onClick={() => onError?.('Google sign-in requires VITE_GOOGLE_CLIENT_ID on the frontend service')}
        className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
      >
        <GoogleIcon />
        <span className="text-sm font-medium text-slate-700">Google</span>
      </button>
    );
  }

  return (
    <div ref={wrapperRef} className="flex w-full justify-center">
      <div ref={buttonRef} />
    </div>
  );
}
