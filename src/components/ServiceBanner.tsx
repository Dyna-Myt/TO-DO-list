import { RefreshCw, WifiOff } from "lucide-react";

interface ServiceBannerProps {
  message: string;
  busy: boolean;
  onRetry: () => void;
}

export function ServiceBanner({ message, busy, onRetry }: ServiceBannerProps) {
  return (
    <div className="service-banner" role="alert">
      <span className="service-icon" aria-hidden="true">
        <WifiOff />
      </span>
      <div className="service-copy">
        <strong>Local service unavailable</strong>
        <p>{message}</p>
      </div>
      <button
        className="secondary-button service-retry"
        type="button"
        onClick={onRetry}
        disabled={busy}
      >
        <RefreshCw aria-hidden="true" className={busy ? "spin" : undefined} />
        Retry
      </button>
    </div>
  );
}
