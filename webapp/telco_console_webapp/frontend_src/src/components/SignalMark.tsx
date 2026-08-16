import React from 'react';

export function SignalMark({ pulse = false, size = 16 }: { pulse?: boolean; size?: number }) {
  return (
    <span className={`signal-mark${pulse ? ' pulse' : ''}`} style={{ height: size }} aria-hidden="true">
      <i />
      <i />
      <i />
      <i />
    </span>
  );
}
