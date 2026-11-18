import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
  isQuotaError: boolean;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '', isQuotaError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    const raw = error?.message || 'Error inesperado en Mokay Jump.';
    const isQuota = raw.includes('Quota exceeded');
    let friendly = raw;
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.error === 'string') {
        friendly = parsed.error.includes('Quota exceeded')
          ? 'Se alcanzó el límite diario gratuito de Firebase Firestore. El cupo se restablece mañana.'
          : `Error de sincronización (${parsed.operationType || 'db'}): ${parsed.error}`;
      }
    } catch {
      // keep raw message
    }
    return {
      hasError: true,
      message: friendly,
      isQuotaError: isQuota || friendly.includes('límite diario'),
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('App ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[100dvh] bg-[#F7F5F0] text-zinc-900 flex items-center justify-center p-4">
          <div className="max-w-sm w-full bg-white border-2 border-zinc-900 rounded-2xl p-5 space-y-3 shadow-[4px_4px_0_#18181B]">
            <div className="flex items-center gap-2 text-rose-600 font-display font-extrabold text-base">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>{this.state.isQuotaError ? 'Límite temporal de servidor' : 'Ups, algo falló'}</span>
            </div>
            <p className="text-xs text-zinc-700 leading-relaxed break-words">{this.state.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-2.5 px-4 rounded-xl bg-zinc-900 text-white text-xs font-bold flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reintentar
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
