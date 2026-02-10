import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useStyles2, InlineToast, Icon } from '@grafana/ui';
import { cx, css } from '@emotion/css';
import { t } from '@grafana/i18n';

const SHOW_COPIED_DURATION = 2 * 1e3;
async function copyToClipboard(text, fallbackRef) {
  var _a;
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text);
  }
  const textarea = document.createElement("textarea");
  (_a = fallbackRef.current) == null ? void 0 : _a.appendChild(textarea);
  textarea.value = text;
  textarea.focus();
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}
function CopyValueButton({ text, disabled, className }) {
  const styles = useStyles2(getBaseStyles);
  const copyButtonRef = useRef(null);
  const [showCopied, setShowCopied] = useState(false);
  useEffect(() => {
    if (!showCopied) {
      return;
    }
    const timeoutId = setTimeout(() => setShowCopied(false), SHOW_COPIED_DURATION);
    return () => clearTimeout(timeoutId);
  }, [showCopied]);
  const onCopyClick = useCallback(
    async (event) => {
      event.stopPropagation();
      event.preventDefault();
      try {
        await copyToClipboard(text, copyButtonRef);
        setShowCopied(true);
      } catch (e) {
      }
    },
    [text]
  );
  const copiedText = t("grafana-scenes.copy-value-button.copied", "Copied!");
  return /* @__PURE__ */ React.createElement(React.Fragment, null, showCopied && /* @__PURE__ */ React.createElement(InlineToast, { placement: "top", referenceElement: copyButtonRef.current }, copiedText), /* @__PURE__ */ React.createElement(
    "button",
    {
      ref: copyButtonRef,
      type: "button",
      className: cx(styles.button, showCopied && styles.successButton, className),
      onClick: onCopyClick,
      disabled,
      "aria-label": t("grafana-scenes.copy-value-button.aria-label", "Copy value"),
      title: t("grafana-scenes.copy-value-button.title", "Copy value")
    },
    /* @__PURE__ */ React.createElement(Icon, { name: showCopied ? "check" : "copy", size: "sm", "aria-hidden": true })
  ));
}
function getBaseStyles(theme) {
  return {
    button: css({
      marginLeft: theme.spacing(0.5),
      padding: 0,
      background: "none",
      border: "none",
      cursor: "pointer",
      color: theme.colors.text.secondary,
      opacity: 1,
      flexShrink: 0,
      "&:hover": {
        color: theme.colors.text.primary
      },
      "&:disabled": {
        cursor: "not-allowed",
        opacity: 0.3
      }
    }),
    successButton: css({
      color: theme.colors.success.text
    })
  };
}

export { CopyValueButton, copyToClipboard };
//# sourceMappingURL=CopyValueButton.js.map
