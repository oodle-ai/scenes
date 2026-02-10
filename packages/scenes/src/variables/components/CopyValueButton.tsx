import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Icon, InlineToast, useStyles2 } from '@grafana/ui';
import { GrafanaTheme2 } from '@grafana/data';
import { css, cx } from '@emotion/css';
import { t } from '@grafana/i18n';

const SHOW_COPIED_DURATION = 2 * 1000;

export async function copyToClipboard(
  text: string,
  fallbackRef: React.RefObject<HTMLButtonElement | null>
) {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text);
  }
  const textarea = document.createElement('textarea');
  fallbackRef.current?.appendChild(textarea);
  textarea.value = text;
  textarea.focus();
  textarea.select();
  document.execCommand('copy');
  textarea.remove();
}

export interface CopyValueButtonProps {
  text: string;
  disabled?: boolean;
  className?: string;
}

export function CopyValueButton({ text, disabled, className }: CopyValueButtonProps) {
  const styles = useStyles2(getBaseStyles);
  const copyButtonRef = useRef<HTMLButtonElement>(null);
  const [showCopied, setShowCopied] = useState(false);

  useEffect(() => {
    if (!showCopied) {
      return;
    }
    const timeoutId = setTimeout(() => setShowCopied(false), SHOW_COPIED_DURATION);
    return () => clearTimeout(timeoutId);
  }, [showCopied]);

  const onCopyClick = useCallback(
    async (event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      event.preventDefault();
      try {
        await copyToClipboard(text, copyButtonRef);
        setShowCopied(true);
      } catch {
        // Clipboard API can throw; ignore
      }
    },
    [text]
  );

  const copiedText = t('grafana-scenes.copy-value-button.copied', 'Copied!');

  return (
    <>
      {showCopied && (
        <InlineToast placement="top" referenceElement={copyButtonRef.current}>
          {copiedText}
        </InlineToast>
      )}
      <button
        ref={copyButtonRef}
        type="button"
        className={cx(styles.button, showCopied && styles.successButton, className)}
        onClick={onCopyClick}
        disabled={disabled}
        aria-label={t('grafana-scenes.copy-value-button.aria-label', 'Copy value')}
        title={t('grafana-scenes.copy-value-button.title', 'Copy value')}
      >
        <Icon name={showCopied ? 'check' : 'copy'} size="sm" aria-hidden />
      </button>
    </>
  );
}

function getBaseStyles(theme: GrafanaTheme2) {
  return {
    button: css({
      marginLeft: theme.spacing(0.5),
      padding: 0,
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      color: theme.colors.text.secondary,
      opacity: 1,
      flexShrink: 0,
      '&:hover': {
        color: theme.colors.text.primary,
      },
      '&:disabled': {
        cursor: 'not-allowed',
        opacity: 0.3,
      },
    }),
    successButton: css({
      color: theme.colors.success.text,
    }),
  };
}
